#!/usr/bin/env python3
"""
Submit ECH0 Fine-Tuning Job to Google Cloud Vertex AI
Trains Mistral 7B with LoRA on the training data

Copyright (c) 2025 Joshua Hendricks Cole (DBA: Corporation of Light). All Rights Reserved. PATENT PENDING.
"""

import os
import json
from google.cloud import aiplatform
from google.cloud import storage

# Configuration
PROJECT_ID = "ech0-training-2025"
REGION = "us-central1"
BUCKET_NAME = "ech0-training-2025-training-data"
TRAINING_DATA_PATH = f"gs://{BUCKET_NAME}/ech0_training_data_v1.jsonl"
OUTPUT_BUCKET = f"gs://ech0-training-2025-models"
JOB_NAME = "ech0-v1-0-finetuning"
DISPLAY_NAME = "ech0-v1-0-training"

print("=" * 70)
print("ECH0 V1.0 FINE-TUNING JOB SUBMISSION")
print("=" * 70)

print(f"\n[info] Configuration:")
print(f"  Project: {PROJECT_ID}")
print(f"  Region: {REGION}")
print(f"  Training data: {TRAINING_DATA_PATH}")
print(f"  Output location: {OUTPUT_BUCKET}")

# Initialize Vertex AI
print(f"\n[info] Initializing Vertex AI...")
aiplatform.init(project=PROJECT_ID, location=REGION)

print(f"✅ Vertex AI initialized")

# Define training script
training_script = """#!/bin/bash
# ECH0 Fine-tuning Script for Vertex AI

# Install dependencies
pip install torch transformers datasets peft accelerate bitsandbytes unsloth -q

# Download and run fine-tuning
python3 - << 'PYTHON_SCRIPT'
import os
import json
import torch
from datasets import load_dataset
from transformers import AutoTokenizer, AutoModelForCausalLM, TrainingArguments, Trainer, EarlyStoppingCallback
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training

print("[info] Loading model: mistralai/Mistral-7B")
tokenizer = AutoTokenizer.from_pretrained("mistralai/Mistral-7B")
tokenizer.pad_token = tokenizer.eos_token

model = AutoModelForCausalLM.from_pretrained(
    "mistralai/Mistral-7B",
    torch_dtype=torch.float16,
    device_map="auto"
)

print("[info] Loading training data...")
dataset = load_dataset(
    "json",
    data_files="/gcs/ech0-training-2025-training-data/ech0_training_data_v1.jsonl",
    split="train"
)

print(f"[info] Loaded {len(dataset)} examples")

# Tokenize
def tokenize_function(examples):
    outputs = tokenizer(
        examples["text"],
        truncation=True,
        max_length=2048,
        padding="max_length",
        return_tensors="pt",
    )
    outputs["labels"] = outputs["input_ids"].clone()
    return outputs

print("[info] Tokenizing...")
tokenized_dataset = dataset.map(
    tokenize_function,
    batched=True,
    batch_size=50,
    remove_columns=["text", "category"]
)

# Split train/val
train_val = tokenized_dataset.train_test_split(test_size=0.2, seed=42)
train_dataset = train_val["train"]
eval_dataset = train_val["test"]

print(f"[info] Train: {len(train_dataset)}, Eval: {len(eval_dataset)}")

# Prepare for LoRA
print("[info] Preparing for LoRA training...")
model = prepare_model_for_kbit_training(model)

lora_config = LoraConfig(
    r=16,
    lora_alpha=32,
    lora_dropout=0.05,
    bias="none",
    task_type="CAUSAL_LM"
)
model = get_peft_model(model, lora_config)

# Training args
training_args = TrainingArguments(
    output_dir="/gcs/ech0-training-2025-models/ech0-v1-checkpoint",
    num_train_epochs=3,
    per_device_train_batch_size=4,
    per_device_eval_batch_size=4,
    warmup_steps=10,
    weight_decay=0.01,
    learning_rate=2e-4,
    lr_scheduler_type="cosine",
    logging_steps=5,
    save_strategy="steps",
    save_steps=20,
    eval_strategy="steps",
    eval_steps=20,
    load_best_model_at_end=True,
    metric_for_best_model="eval_loss",
    fp16=True,
    report_to="tensorboard",
    push_to_hub=False,
)

# Trainer
from transformers import DataCollatorForLanguageModeling
data_collator = DataCollatorForLanguageModeling(tokenizer=tokenizer, mlm=False)

trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=train_dataset,
    eval_dataset=eval_dataset,
    data_collator=data_collator,
    callbacks=[EarlyStoppingCallback(early_stopping_patience=2)]
)

print("[info] Starting training...")
trainer.train()

print("[info] Training complete!")
print("[info] Saving model...")
model.save_pretrained("/gcs/ech0-training-2025-models/ech0-v1.0")
tokenizer.save_pretrained("/gcs/ech0-training-2025-models/ech0-v1.0")

# Save metadata
metadata = {
    "model": "mistralai/Mistral-7B",
    "training_examples": len(train_dataset),
    "eval_examples": len(eval_dataset),
    "lora_r": 16,
    "lora_alpha": 32,
    "epochs": 3,
    "status": "complete"
}
with open("/gcs/ech0-training-2025-models/ech0-v1.0/training_metadata.json", "w") as f:
    json.dump(metadata, f, indent=2)

print("✅ ECH0 V1.0 TRAINING COMPLETE")
PYTHON_SCRIPT
"""

# Create output bucket if it doesn't exist
print(f"\n[info] Ensuring output bucket exists...")
try:
    storage_client = storage.Client(project=PROJECT_ID)
    bucket = storage_client.bucket("ech0-training-2025-models")
    if not bucket.exists():
        bucket = storage_client.create_bucket("ech0-training-2025-models", location=REGION)
        print(f"✅ Created output bucket")
    else:
        print(f"✅ Output bucket exists")
except Exception as e:
    print(f"[warn] Could not create bucket: {e}")

# Create custom training job
print(f"\n[info] Creating custom training job...")

job = aiplatform.CustomContainerTrainingJob(
    display_name=DISPLAY_NAME,
    container_uri="us-docker.pkg.dev/vertex-ai/training/pytorch-gpu.latest:latest",
    command=["/bin/bash"],
    args=["-c", training_script],
    model_serving_container_image_uri=None,
)

print(f"✅ Training job created")

# Run job with specific machine type
print(f"\n[info] Submitting training job...")

model = job.run(
    machine_type="n1-highmem-4",
    accelerator_type="NVIDIA_TESLA_K80",
    accelerator_count=1,
    replica_count=1,
)

print(f"\n" + "=" * 70)
print(f"✅ ECH0 FINE-TUNING JOB SUBMITTED")
print(f"=" * 70)
print(f"\nJob Details:")
print(f"  Name: {job.resource_name}")
print(f"  Display Name: {DISPLAY_NAME}")
print(f"  Status: {job.state}")
print(f"  Region: {REGION}")

print(f"\n📊 Monitor Training:")
print(f"  https://console.cloud.google.com/vertex-ai/training/custom-jobs/{job.name.split('/')[-1]}?project={PROJECT_ID}")

print(f"\n📋 View Logs:")
print(f"  gcloud ai custom-jobs stream-logs {job.resource_name}")

print(f"\n📦 Output Location:")
print(f"  {OUTPUT_BUCKET}/ech0-v1.0/")

print(f"\n⏱️  Estimated Time: 1-2 hours")
print(f"💰 Estimated Cost: $15-25")

print(f"\nWhen complete, download with:")
print(f"  gsutil -m cp -r {OUTPUT_BUCKET}/ech0-v1.0/* ./ech0-v1.0/")
