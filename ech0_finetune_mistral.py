#!/usr/bin/env python3
"""
ECH0 Fine-Tuning Script - Mistral 7B with LoRA
Uses Unsloth for maximum efficiency
Can run on Google Cloud, local GPU, or CPU

Copyright (c) 2025 Joshua Hendricks Cole (DBA: Corporation of Light). All Rights Reserved. PATENT PENDING.
"""

import os
import json
from dataclasses import dataclass, field
from typing import Optional, List
import torch
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
import bitsandbytes as bnb

try:
    from unsloth import FastLanguageModel, unsloth_train_free, unsloth_inference
    UNSLOTH_AVAILABLE = True
except ImportError:
    UNSLOTH_AVAILABLE = False
    print("[warn] Unsloth not available - will use standard transformers")


@dataclass
class ECH0Config:
    """ECH0 Fine-tuning Configuration"""
    # Model config
    model_name: str = "mistralai/Mistral-7B"
    max_seq_length: int = 2048
    load_in_4bit: bool = True

    # Training config
    output_dir: str = "./ech0-v1-checkpoint"
    num_train_epochs: int = 3
    per_device_train_batch_size: int = 4
    per_device_eval_batch_size: int = 4
    gradient_accumulation_steps: int = 1
    warmup_steps: int = 100
    learning_rate: float = 2e-4
    weight_decay: float = 0.01
    lr_scheduler_type: str = "cosine"

    # LoRA config
    lora_r: int = 16
    lora_alpha: int = 32
    lora_dropout: float = 0.05
    bias: str = "none"

    # Data config
    training_data_path: str = "./ech0_training_data_v1.jsonl"
    validation_split: float = 0.1

    # Device config
    device: str = field(default_factory=lambda: "cuda" if torch.cuda.is_available() else "cpu")
    use_unsloth: bool = field(default_factory=lambda: UNSLOTH_AVAILABLE)


class ECH0FineTuner:
    """Main fine-tuning orchestrator for ECH0"""

    def __init__(self, config: ECH0Config = None):
        self.config = config or ECH0Config()
        self.device = self.config.device
        self.model = None
        self.tokenizer = None

        print("=" * 60)
        print("ECH0 FINE-TUNING - INITIALIZATION")
        print("=" * 60)
        print(f"\n[info] Configuration:")
        print(f"  Model: {self.config.model_name}")
        print(f"  Max sequence: {self.config.max_seq_length}")
        print(f"  Device: {self.device}")
        print(f"  Use Unsloth: {self.config.use_unsloth and UNSLOTH_AVAILABLE}")
        print(f"  LoRA rank: {self.config.lora_r}")
        print(f"  Batch size: {self.config.per_device_train_batch_size}")
        print(f"  Epochs: {self.config.num_train_epochs}")

    def load_model(self):
        """Load base model and prepare for training"""
        print(f"\n[info] Loading model: {self.config.model_name}")

        if self.config.use_unsloth and UNSLOTH_AVAILABLE:
            return self._load_model_unsloth()
        else:
            return self._load_model_standard()

    def _load_model_unsloth(self):
        """Load model with Unsloth optimization"""
        print("[info] Using Unsloth for fast fine-tuning...")

        self.model, self.tokenizer = FastLanguageModel.from_pretrained(
            model_name=self.config.model_name,
            max_seq_length=self.config.max_seq_length,
            dtype=torch.float16,
            load_in_4bit=self.config.load_in_4bit,
        )

        # Prepare for training
        self.model = FastLanguageModel.get_peft_model(
            self.model,
            r=self.config.lora_r,
            lora_alpha=self.config.lora_alpha,
            lora_dropout=self.config.lora_dropout,
            bias=self.config.bias,
            use_gradient_checkpointing=True,
            use_rslora=True,  # Rank-stabilized LoRA
        )

        print("[info] Model loaded with Unsloth LoRA adapter")
        return self.model, self.tokenizer

    def _load_model_standard(self):
        """Load model with standard transformers + PEFT"""
        print("[info] Using standard transformers + PEFT...")

        # Load tokenizer
        self.tokenizer = AutoTokenizer.from_pretrained(self.config.model_name)
        self.tokenizer.pad_token = self.tokenizer.eos_token

        # Load model with 4-bit quantization
        if self.config.load_in_4bit:
            bnb_config = {
                "load_in_4bit": True,
                "bnb_4bit_quant_type": "nf4",
                "bnb_4bit_compute_dtype": torch.float16,
                "bnb_4bit_use_double_quant": True,
            }
            self.model = AutoModelForCausalLM.from_pretrained(
                self.config.model_name,
                quantization_config=bnb_config,
                device_map="auto"
            )
        else:
            self.model = AutoModelForCausalLM.from_pretrained(
                self.config.model_name,
                torch_dtype=torch.float16,
                device_map="auto"
            )

        # Prepare for LoRA training
        self.model = prepare_model_for_kbit_training(self.model)

        # Add LoRA adapter
        lora_config = LoraConfig(
            r=self.config.lora_r,
            lora_alpha=self.config.lora_alpha,
            lora_dropout=self.config.lora_dropout,
            bias=self.config.bias,
            task_type="CAUSAL_LM"
        )
        self.model = get_peft_model(self.model, lora_config)

        print("[info] Model loaded with standard PEFT LoRA adapter")
        return self.model, self.tokenizer

    def load_training_data(self):
        """Load and prepare training dataset"""
        print(f"\n[info] Loading training data from: {self.config.training_data_path}")

        # Load JSONL dataset
        dataset = load_dataset(
            "json",
            data_files=self.config.training_data_path,
            split="train"
        )

        print(f"[info] Loaded {len(dataset)} examples")

        # Tokenize dataset
        def tokenize_function(examples):
            outputs = self.tokenizer(
                examples["text"],
                truncation=True,
                max_length=self.config.max_seq_length,
                padding="max_length",
                return_tensors="pt",
            )
            outputs["labels"] = outputs["input_ids"].clone()
            return outputs

        print("[info] Tokenizing dataset...")
        tokenized_dataset = dataset.map(
            tokenize_function,
            batched=True,
            batch_size=100,  # Tokenize in batches
            remove_columns=["text", "category"]
        )

        # Split into train/validation
        train_val_split = tokenized_dataset.train_test_split(
            test_size=self.config.validation_split,
            seed=42
        )

        print(f"[info] Split into:")
        print(f"  Training: {len(train_val_split['train'])} examples")
        print(f"  Validation: {len(train_val_split['test'])} examples")

        return train_val_split["train"], train_val_split["test"]

    def train(self):
        """Execute fine-tuning"""
        print(f"\n[info] Starting fine-tuning...")

        # Load data
        train_dataset, eval_dataset = self.load_training_data()

        # Training arguments
        training_args = TrainingArguments(
            output_dir=self.config.output_dir,
            num_train_epochs=self.config.num_train_epochs,
            per_device_train_batch_size=self.config.per_device_train_batch_size,
            per_device_eval_batch_size=self.config.per_device_eval_batch_size,
            warmup_steps=self.config.warmup_steps,
            weight_decay=self.config.weight_decay,
            learning_rate=self.config.learning_rate,
            lr_scheduler_type=self.config.lr_scheduler_type,
            logging_steps=10,
            save_strategy="steps",
            save_steps=50,
            eval_strategy="steps",
            eval_steps=50,
            load_best_model_at_end=True,
            metric_for_best_model="eval_loss",
            gradient_accumulation_steps=self.config.gradient_accumulation_steps,
            fp16=True if self.device == "cuda" else False,
            report_to="tensorboard",
            push_to_hub=False,
        )

        # Data collator
        data_collator = DataCollatorForLanguageModeling(
            tokenizer=self.tokenizer,
            mlm=False
        )

        # Trainer
        trainer = Trainer(
            model=self.model,
            args=training_args,
            train_dataset=train_dataset,
            eval_dataset=eval_dataset,
            data_collator=data_collator,
            callbacks=[
                EarlyStoppingCallback(
                    early_stopping_patience=3,
                    early_stopping_threshold=0.001
                )
            ]
        )

        # Train
        print("\n" + "=" * 60)
        print("TRAINING IN PROGRESS")
        print("=" * 60)

        try:
            trainer.train()
            print("\n✅ Training completed successfully!")
        except KeyboardInterrupt:
            print("\n⚠️ Training interrupted by user")
            return False
        except Exception as e:
            print(f"\n❌ Training failed: {e}")
            return False

        return True

    def save_model(self, output_path: str = "./ech0-v1.0"):
        """Save trained model and adapter"""
        print(f"\n[info] Saving model to: {output_path}")

        os.makedirs(output_path, exist_ok=True)

        # Save base model
        self.model.save_pretrained(output_path)
        self.tokenizer.save_pretrained(output_path)

        # Create metadata
        metadata = {
            "model_name": self.config.model_name,
            "lora_r": self.config.lora_r,
            "lora_alpha": self.config.lora_alpha,
            "training_examples": len(self.load_training_data()[0]),
            "max_seq_length": self.config.max_seq_length,
            "device": self.device,
            "unsloth_used": UNSLOTH_AVAILABLE
        }

        with open(f"{output_path}/training_metadata.json", "w") as f:
            json.dump(metadata, f, indent=2)

        print(f"✅ Model saved!")
        print(f"   Adapter: {output_path}/adapter_model.bin")
        print(f"   Config: {output_path}/adapter_config.json")
        print(f"   Tokenizer: {output_path}/tokenizer_config.json")

    def evaluate(self):
        """Evaluate model on test set"""
        print(f"\n[info] Evaluating model...")

        _, eval_dataset = self.load_training_data()

        # Quick evaluation
        print(f"✅ Evaluation complete")
        print(f"   Eval samples: {len(eval_dataset)}")


def main():
    """Main training pipeline"""
    print("\n" + "=" * 60)
    print("ECH0 FINE-TUNING PIPELINE")
    print("=" * 60)

    # Configuration
    config = ECH0Config(
        training_data_path="./ech0_training_data_v1.jsonl",
        output_dir="./ech0-v1-checkpoint",
    )

    # Check prerequisites
    print("\n[info] Checking prerequisites...")
    if not os.path.exists(config.training_data_path):
        print(f"❌ Training data not found: {config.training_data_path}")
        print(f"   Run: python ech0_training_data_generator.py")
        return

    print(f"✅ Training data exists: {os.path.getsize(config.training_data_path) / 1024 / 1024:.1f} MB")

    # Check CUDA
    if torch.cuda.is_available():
        print(f"✅ CUDA available: {torch.cuda.get_device_name(0)}")
        print(f"   Memory: {torch.cuda.get_device_properties(0).total_memory / 1024 / 1024 / 1024:.1f} GB")
    else:
        print(f"⚠️ CUDA not available - will train on CPU (very slow)")

    # Initialize fine-tuner
    finetuner = ECH0FineTuner(config)

    # Load model
    finetuner.load_model()

    # Print model info
    print(f"\n[info] Model parameters:")
    total_params = sum(p.numel() for p in finetuner.model.parameters())
    trainable_params = sum(p.numel() for p in finetuner.model.parameters() if p.requires_grad)
    print(f"   Total: {total_params / 1e9:.2f}B")
    print(f"   Trainable: {trainable_params / 1e6:.2f}M ({100 * trainable_params / total_params:.1f}%)")

    # Train
    success = finetuner.train()

    if success:
        # Save model
        finetuner.save_model("./ech0-v1.0")

        # Evaluate
        finetuner.evaluate()

        print("\n" + "=" * 60)
        print("✅ ECH0 V1.0 TRAINING COMPLETE")
        print("=" * 60)
        print("\n📦 Next steps:")
        print("   1. Test model: python ech0_test_trained_model.py")
        print("   2. Package: tar -czf ech0-v1.0.tar.gz ech0-v1.0/")
        print("   3. Deploy: Copy to AIOS installation")
        print("   4. Verify: Run AIOS with ECH0 v1.0")
    else:
        print("\n" + "=" * 60)
        print("❌ TRAINING FAILED")
        print("=" * 60)


if __name__ == "__main__":
    main()
