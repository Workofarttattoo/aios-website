#!/bin/bash
# ECH0 Fine-Tuning Job Submission Script
# Submits Mistral 7B fine-tuning job to Google Cloud Vertex AI

PROJECT_ID="ech0-training-2025"
REGION="us-central1"
TRAINING_DATA="gs://ech0-training-2025-training-data/ech0_training_data_v1.jsonl"
OUTPUT_DIR="gs://ech0-training-2025-models"

echo "=========================================="
echo "ECH0 V1.0 FINE-TUNING JOB SUBMISSION"
echo "=========================================="
echo ""
echo "[info] Configuration:"
echo "  Project: $PROJECT_ID"
echo "  Region: $REGION"
echo "  Training data: $TRAINING_DATA"
echo "  Output: $OUTPUT_DIR"
echo ""

# Create training script
cat > /tmp/ech0_training_script.py << 'TRAINING_SCRIPT'
#!/usr/bin/env python3
"""ECH0 Fine-Tuning Script for Vertex AI"""

import os
import json
import torch
from datasets import load_dataset
from transformers import (
    AutoTokenizer, AutoModelForCausalLM, TrainingArguments,
    Trainer, EarlyStoppingCallback, DataCollatorForLanguageModeling
)
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training

print("[info] Loading model: mistralai/Mistral-7B")
tokenizer = AutoTokenizer.from_pretrained("mistralai/Mistral-7B")
tokenizer.pad_token = tokenizer.eos_token

model = AutoModelForCausalLM.from_pretrained(
    "mistralai/Mistral-7B",
    torch_dtype=torch.float16,
    device_map="auto"
)

print("[info] Loading training data from gs://ech0-training-2025-training-data/ech0_training_data_v1.jsonl")

# Read from GCS
from google.cloud import storage
import tempfile

storage_client = storage.Client()
bucket = storage_client.bucket("ech0-training-2025-training-data")
blob = bucket.blob("ech0_training_data_v1.jsonl")

with tempfile.NamedTemporaryFile(mode='w', suffix='.jsonl', delete=False) as tmp:
    tmp.write(blob.download_as_string().decode())
    tmp_path = tmp.name

dataset = load_dataset("json", data_files=tmp_path, split="train")
print(f"[info] Loaded {len(dataset)} examples")

# Tokenize
def tokenize_function(examples):
    outputs = tokenizer(
        examples["text"],
        truncation=True,
        max_length=2048,
        padding="max_length",
    )
    outputs["labels"] = outputs["input_ids"].copy()
    return outputs

print("[info] Tokenizing dataset...")
tokenized_dataset = dataset.map(
    tokenize_function,
    batched=True,
    batch_size=50,
    remove_columns=["text", "category"]
)

train_val = tokenized_dataset.train_test_split(test_size=0.2, seed=42)
train_dataset = train_val["train"]
eval_dataset = train_val["test"]

print(f"[info] Train: {len(train_dataset)}, Eval: {len(eval_dataset)}")

# LoRA preparation
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

# Count parameters
total = sum(p.numel() for p in model.parameters())
trainable = sum(p.numel() for p in model.parameters() if p.requires_grad)
print(f"[info] Parameters: {total/1e9:.2f}B total, {trainable/1e6:.2f}M trainable ({100*trainable/total:.1f}%)")

# Training arguments
training_args = TrainingArguments(
    output_dir="/gcs/ech0-training-2025-models/ech0-v1-checkpoint",
    num_train_epochs=3,
    per_device_train_batch_size=4,
    per_device_eval_batch_size=4,
    warmup_steps=5,
    weight_decay=0.01,
    learning_rate=2e-4,
    lr_scheduler_type="cosine",
    logging_steps=2,
    save_strategy="steps",
    save_steps=10,
    eval_strategy="steps",
    eval_steps=10,
    load_best_model_at_end=True,
    metric_for_best_model="eval_loss",
    fp16=True,
    report_to=[],
)

# Trainer
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

print("[info] Saving model...")
model.save_pretrained("/gcs/ech0-training-2025-models/ech0-v1.0")
tokenizer.save_pretrained("/gcs/ech0-training-2025-models/ech0-v1.0")

metadata = {
    "model": "mistralai/Mistral-7B",
    "training_examples": len(train_dataset),
    "eval_examples": len(eval_dataset),
    "lora_r": 16,
    "lora_alpha": 32,
    "epochs": 3,
    "status": "complete",
    "total_parameters": int(total),
    "trainable_parameters": int(trainable)
}

with open("/gcs/ech0-training-2025-models/ech0-v1.0/training_metadata.json", "w") as f:
    json.dump(metadata, f, indent=2)

print("✅ ECH0 V1.0 TRAINING COMPLETE")
print(f"   Model saved to: gs://ech0-training-2025-models/ech0-v1.0/")

os.unlink(tmp_path)
TRAINING_SCRIPT

# Submit custom training job
echo "[info] Submitting training job to Vertex AI..."
echo ""

gcloud ai custom-jobs create \
  --region=$REGION \
  --display-name="ech0-v1-0-finetuning" \
  --config=- << CONFIG
{
  "workerPoolSpecs": [
    {
      "machineSpec": {
        "machineType": "n1-highmem-4",
        "acceleratorType": "NVIDIA_TESLA_K80",
        "acceleratorCount": 1
      },
      "replicaCount": 1,
      "pythonPackageSpec": {
        "executorImageUri": "us-docker.pkg.dev/vertex-ai/training/python-gpu:latest",
        "packageUris": [],
        "pythonModule": "train",
        "args": ["/tmp/ech0_training_script.py"]
      }
    }
  ]
}
CONFIG

echo ""
echo "=========================================="
echo "✅ JOB SUBMITTED"
echo "=========================================="
echo ""
echo "Monitor training progress:"
echo "  gcloud ai custom-jobs list --region=$REGION --filter=displayName:ech0-v1-0-finetuning"
echo ""
echo "View logs:"
echo "  gcloud ai custom-jobs stream-logs <JOB_ID> --region=$REGION"
echo ""
echo "Download model (when complete):"
echo "  gsutil -m cp -r gs://ech0-training-2025-models/ech0-v1.0/* ./ech0-v1.0/"
echo ""
echo "⏱️  Estimated time: 1-2 hours"
echo "💰 Estimated cost: \$15-25"
