#!/usr/bin/env python3
"""
ECH0 V1.0 Local Fine-Tuning
Trains Mistral 7B with LoRA on your local machine

Copyright (c) 2025 Joshua Hendricks Cole (DBA: Corporation of Light). All Rights Reserved. PATENT PENDING.
"""

import os
import json
import torch
from pathlib import Path
from datasets import load_dataset
from transformers import (
    AutoTokenizer,
    AutoModelForCausalLM,
    TrainingArguments,
    Trainer,
    EarlyStoppingCallback,
    DataCollatorForLanguageModeling
)
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training

print("=" * 70)
print("ECH0 V1.0 LOCAL FINE-TUNING")
print("=" * 70)

# Check GPU availability
print(f"\n[info] GPU Available: {torch.cuda.is_available()}")
if torch.cuda.is_available():
    print(f"[info] GPU: {torch.cuda.get_device_name(0)}")
    print(f"[info] Memory: {torch.cuda.get_device_properties(0).total_memory / 1024 / 1024 / 1024:.1f} GB")

# Paths
training_data_path = "ech0_training_data_v1.jsonl"
output_dir = "./ech0-v1-checkpoint"
model_dir = "./ech0-v1.0"

print(f"\n[info] Configuration:")
print(f"  Training data: {training_data_path}")
print(f"  Checkpoint dir: {output_dir}")
print(f"  Model output: {model_dir}")

# Verify training data exists
if not os.path.exists(training_data_path):
    print(f"\n❌ Training data not found: {training_data_path}")
    print(f"   Run: python ech0_training_data_generator.py")
    exit(1)

file_size = os.path.getsize(training_data_path) / 1024 / 1024
print(f"  Data size: {file_size:.1f} MB")

# Load tokenizer
print(f"\n[info] Loading tokenizer...")
tokenizer = AutoTokenizer.from_pretrained("microsoft/phi-2", trust_remote_code=True)
tokenizer.pad_token = tokenizer.eos_token

# Load model
print(f"\n[info] Loading base model: microsoft/phi-2")
print(f"   (Note: Using Phi-2 2.7B as open-access alternative to Mistral 7B)")
model = AutoModelForCausalLM.from_pretrained(
    "microsoft/phi-2",
    torch_dtype=torch.float16,
    device_map="auto",
    trust_remote_code=True
)

# Load dataset
print(f"\n[info] Loading training data...")
dataset = load_dataset("json", data_files=training_data_path, split="train")
print(f"[info] Loaded {len(dataset)} examples")

# Tokenize
print(f"\n[info] Tokenizing dataset...")
def tokenize_function(examples):
    outputs = tokenizer(
        examples["text"],
        truncation=True,
        max_length=2048,
        padding="max_length",
    )
    outputs["labels"] = outputs["input_ids"].copy()
    return outputs

tokenized_dataset = dataset.map(
    tokenize_function,
    batched=True,
    batch_size=10,
    remove_columns=["text", "category"],
    desc="Tokenizing"
)

# Split data
print(f"\n[info] Splitting dataset...")
train_val = tokenized_dataset.train_test_split(test_size=0.2, seed=42)
train_dataset = train_val["train"]
eval_dataset = train_val["test"]

print(f"[info] Train: {len(train_dataset)} | Eval: {len(eval_dataset)}")

# Prepare for LoRA
print(f"\n[info] Preparing for LoRA training...")
model = prepare_model_for_kbit_training(model)

lora_config = LoraConfig(
    r=16,
    lora_alpha=32,
    lora_dropout=0.05,
    bias="none",
    task_type="CAUSAL_LM",
    target_modules=["q_proj", "v_proj"]
)
model = get_peft_model(model, lora_config)

# Model info
total_params = sum(p.numel() for p in model.parameters())
trainable_params = sum(p.numel() for p in model.parameters() if p.requires_grad)

print(f"\n[info] Model parameters:")
print(f"  Total: {total_params / 1e9:.2f}B")
print(f"  Trainable: {trainable_params / 1e6:.2f}M ({100 * trainable_params / total_params:.2f}%)")

# Training arguments
training_args = TrainingArguments(
    output_dir=output_dir,
    num_train_epochs=3,
    per_device_train_batch_size=4,
    per_device_eval_batch_size=4,
    gradient_accumulation_steps=1,
    warmup_steps=5,
    weight_decay=0.01,
    learning_rate=2e-4,
    lr_scheduler_type="cosine",
    logging_steps=2,
    logging_first_step=True,
    save_strategy="steps",
    save_steps=10,
    eval_strategy="steps",
    eval_steps=10,
    load_best_model_at_end=True,
    metric_for_best_model="eval_loss",
    fp16=True if torch.cuda.is_available() else False,
    report_to=[],
    seed=42,
)

# Data collator
data_collator = DataCollatorForLanguageModeling(tokenizer=tokenizer, mlm=False)

# Trainer
print(f"\n[info] Creating trainer...")
trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=train_dataset,
    eval_dataset=eval_dataset,
    data_collator=data_collator,
    callbacks=[EarlyStoppingCallback(early_stopping_patience=2, early_stopping_threshold=0.001)]
)

# Train
print(f"\n" + "=" * 70)
print(f"TRAINING STARTING")
print(f"=" * 70)

try:
    trainer.train()
    print(f"\n✅ Training completed successfully!")
except KeyboardInterrupt:
    print(f"\n⚠️ Training interrupted by user")
    exit(1)
except Exception as e:
    print(f"\n❌ Training failed: {e}")
    exit(1)

# Save model
print(f"\n[info] Saving model to {model_dir}...")
os.makedirs(model_dir, exist_ok=True)

model.save_pretrained(model_dir)
tokenizer.save_pretrained(model_dir)

# Save metadata
metadata = {
    "model": "microsoft/phi-2",
    "base_model_size": "2.7B parameters",
    "training_examples": len(train_dataset),
    "eval_examples": len(eval_dataset),
    "lora_r": 16,
    "lora_alpha": 32,
    "epochs": 3,
    "learning_rate": 2e-4,
    "batch_size": 4,
    "total_parameters": int(total_params),
    "trainable_parameters": int(trainable_params),
    "status": "complete"
}

metadata_path = os.path.join(model_dir, "training_metadata.json")
with open(metadata_path, "w") as f:
    json.dump(metadata, f, indent=2)

print(f"✅ Metadata saved: {metadata_path}")

print(f"\n" + "=" * 70)
print(f"✅ ECH0 V1.0 TRAINING COMPLETE")
print(f"=" * 70)
print(f"\n📦 Model Location: {model_dir}/")
print(f"   adapter_model.bin - LoRA weights (~100MB)")
print(f"   adapter_config.json - Configuration")
print(f"   tokenizer_config.json - Tokenizer")
print(f"   training_metadata.json - Training info")

print(f"\n📊 Next Steps:")
print(f"   1. Test: python ech0_test_trained_model.py")
print(f"   2. Package: tar -czf ech0-v1.0.tar.gz ech0-v1.0/")
print(f"   3. Deploy: Copy to AIOS installation")

print(f"\n✨ Your ECH0 v1.0 is ready!")
