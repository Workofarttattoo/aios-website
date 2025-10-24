# ECH0 Fine-Tuning on Google Cloud
## Complete Guide: From Setup to Trained Model

**Copyright © 2025 Joshua Hendricks Cole (DBA: Corporation of Light). All Rights Reserved. PATENT PENDING.**

---

## 🎯 Overview

This guide walks you through training ECH0 (fine-tuned Mistral 7B) on Google Cloud using Vertex AI. You'll:

1. Set up Google Cloud project
2. Generate training data
3. Upload to Cloud Storage
4. Run fine-tuning on Vertex AI
5. Evaluate results
6. Download trained model

**Timeline**: ~3-4 hours end-to-end (mostly waiting for training)

---

## 📋 Prerequisites

✅ Google Cloud account with billing enabled
✅ `gcloud` CLI installed locally
✅ Python 3.9+ installed
✅ Training data generated (run `ech0_training_data_generator.py`)

---

## Phase 1: Google Cloud Setup (15 minutes)

### Step 1: Create/Select GCP Project

```bash
# Set your project ID (use something memorable)
export PROJECT_ID="ech0-training-2025"
export REGION="us-central1"

# Create new project
gcloud projects create $PROJECT_ID --name="ECH0 Fine-Tuning"

# Or use existing project
gcloud config set project $PROJECT_ID

# Verify
gcloud config get-value project
```

### Step 2: Enable Required APIs

```bash
# Enable these APIs for Vertex AI fine-tuning
gcloud services enable \
    aiplatform.googleapis.com \
    storage-api.googleapis.com \
    compute.googleapis.com \
    cloudresourcemanager.googleapis.com
```

**Wait 2-3 minutes for APIs to activate**

### Step 3: Set Up Billing

```bash
# Check billing account linked
gcloud billing accounts list

# If not linked, link to your project
gcloud billing projects link $PROJECT_ID --billing-account=BILLING_ACCOUNT_ID
```

### Step 4: Create Storage Bucket

```bash
# Create bucket for training data
gsutil mb -l $REGION gs://${PROJECT_ID}-training-data/

# Verify
gsutil ls gs://${PROJECT_ID}-training-data/
```

### Step 5: Create Service Account

```bash
# Create service account for fine-tuning
gcloud iam service-accounts create ech0-training \
    --display-name="ECH0 Fine-Tuning Service Account"

# Get service account email
export SA_EMAIL=$(gcloud iam service-accounts list \
    --filter="displayName:ECH0 Fine-Tuning" \
    --format='value(email)')

echo "Service Account: $SA_EMAIL"

# Grant required roles
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="roles/aiplatform.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="roles/storage.admin"
```

### Step 6: Create Service Account Key

```bash
# Create key for local authentication
gcloud iam service-accounts keys create ./ech0-sa-key.json \
    --iam-account=$SA_EMAIL

# Set up local authentication
export GOOGLE_APPLICATION_CREDENTIALS="$(pwd)/ech0-sa-key.json"

# Verify
gcloud auth activate-service-account --key-file=$GOOGLE_APPLICATION_CREDENTIALS
```

---

## Phase 2: Prepare Training Data (10 minutes)

### Step 1: Generate Training Data

```bash
# Run training data generator
python ech0_training_data_generator.py

# Verify output files
ls -lh ech0_training_data_v1.*
```

**Expected output**:
- `ech0_training_data_v1.jsonl` (~50-100 MB)
- `ech0_training_data_v1_stats.json`

### Step 2: Upload to Cloud Storage

```bash
# Upload training data
gsutil -m cp ech0_training_data_v1.jsonl \
    gs://${PROJECT_ID}-training-data/

# Verify upload
gsutil ls -lh gs://${PROJECT_ID}-training-data/

# Get full path for later
export TRAINING_DATA_PATH="gs://${PROJECT_ID}-training-data/ech0_training_data_v1.jsonl"
echo "Training data location: $TRAINING_DATA_PATH"
```

---

## Phase 3: Configure Fine-Tuning (5 minutes)

### Create Fine-Tuning Configuration File

Save as `ech0_finetuning_config.json`:

```json
{
  "model": "mistral-7b",
  "training_data": "gs://YOUR_BUCKET/ech0_training_data_v1.jsonl",
  "output_model_display_name": "ech0-v1-0",
  "hyperparameters": {
    "learning_rate_multiplier": 1.0,
    "num_train_epochs": 3,
    "batch_size": 4,
    "warmup_fraction": 0.1,
    "weight_decay": 0.01
  },
  "training_filter_split": "",
  "validation_split": 0.1,
  "test_split": 0.1
}
```

**Key parameters explained**:
- `num_train_epochs`: How many times to see the data (3 = balanced)
- `batch_size`: How many examples per step (4 = safe for memory)
- `learning_rate_multiplier`: Training speed (1.0 = standard)
- `validation_split`: Percentage for validation (10% = good)

```bash
# Update config with your bucket
sed -i "s|YOUR_BUCKET|${PROJECT_ID}-training-data|g" ech0_finetuning_config.json

# Verify
cat ech0_finetuning_config.json
```

---

## Phase 4: Run Fine-Tuning (2-3 hours)

### Option A: Via gcloud CLI (Recommended)

```bash
# Start fine-tuning job
gcloud ai custom-jobs create \
    --region=$REGION \
    --display-name="ech0-v1-training" \
    --config=ech0_finetuning_config.json \
    --service-account=$SA_EMAIL

# Get job ID
export JOB_ID=$(gcloud ai custom-jobs list \
    --region=$REGION \
    --filter="displayName:ech0-v1-training" \
    --format='value(name)' | head -1)

echo "Job ID: $JOB_ID"
```

### Option B: Via Python (More Control)

Save as `ech0_finetune_google_cloud.py`:

```python
#!/usr/bin/env python3
"""
ECH0 Fine-Tuning on Google Cloud Vertex AI
"""

from google.cloud import aiplatform
import json
from pathlib import Path

PROJECT_ID = "ech0-training-2025"  # Change to your project
REGION = "us-central1"
TRAINING_DATA_PATH = "gs://ech0-training-2025-training-data/ech0_training_data_v1.jsonl"

def start_finetuning_job():
    """Start fine-tuning job on Vertex AI"""

    aiplatform.init(project=PROJECT_ID, location=REGION)

    job = aiplatform.training_jobs.create(
        display_name="ech0-v1-finetuning",
        script_path="ech0_finetune_mistral.py",
        container_uri="us-docker.pkg.dev/vertex-ai/training/transformers-gpu.latest:latest",
        requirements=["unsloth", "peft", "torch", "transformers"],
        machine_type="g2-standard-8",  # 8x NVIDIA L4 GPUs
        accelerator_type="NVIDIA_L4",
        accelerator_count=4,  # Use 4 of the 8 GPUs
        training_fraction_split=0.8,
        validation_fraction_split=0.1,
        test_fraction_split=0.1,
        model_display_name="ech0-v1-0"
    )

    print(f"✅ Fine-tuning job started!")
    print(f"   Job ID: {job.resource_name}")
    print(f"   Status: {job.state}")
    print(f"\n📊 Monitor progress:")
    print(f"   gcloud ai custom-jobs describe {job.name}")
    print(f"\n📋 View logs:")
    print(f"   gcloud ai custom-jobs stream-logs {job.name}")

    return job

if __name__ == "__main__":
    job = start_finetuning_job()
```

### Monitor Training Progress

```bash
# Watch logs in real-time
gcloud ai custom-jobs stream-logs $JOB_ID --region=$REGION

# Or check status periodically
while true; do
    gcloud ai custom-jobs describe $JOB_ID \
        --region=$REGION \
        --format="value(state,displayName)"
    sleep 30
done

# Expected output:
# JOB_STATE_RUNNING    ech0-v1-training
# ... (2-3 hours of training) ...
# JOB_STATE_SUCCEEDED  ech0-v1-training
```

---

## Phase 5: Retrieve Trained Model (15 minutes)

### After Training Completes

```bash
# List available models
gcloud ai models list --region=$REGION

# Get model details
gcloud ai models describe MODEL_ID \
    --region=$REGION

# Find the ech0 model
export MODEL_ID=$(gcloud ai models list \
    --region=$REGION \
    --filter="displayName:ech0-v1-0" \
    --format='value(name)' | head -1)

echo "Model ID: $MODEL_ID"
```

### Download Model Artifacts

```bash
# Create local directory
mkdir -p ./ech0-v1-model

# Export model
gcloud ai models export $MODEL_ID \
    --output-dir=gs://${PROJECT_ID}-models/ech0-v1-export/

# Download to local machine
gsutil -m cp -r gs://${PROJECT_ID}-models/ech0-v1-export/* ./ech0-v1-model/

# Verify
ls -lh ./ech0-v1-model/
```

### Create LoRA Adapter File

```bash
# The trained model should include LoRA adapter
# Verify adapter exists
ls -lh ./ech0-v1-model/adapter_model.bin
ls -lh ./ech0-v1-model/adapter_config.json

# If present, you have the efficient LoRA adapter (~100MB)
```

---

## Phase 6: Test the Model (10 minutes)

### Create Test Script

Save as `ech0_test_trained_model.py`:

```python
#!/usr/bin/env python3
"""Test the fine-tuned ECH0 model"""

from transformers import AutoTokenizer, AutoModelForCausalLM
from peft import PeftModel
import torch

# Load base model
model_name = "mistralai/Mistral-7B"
adapter_path = "./ech0-v1-model"

print("[info] Loading base model...")
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForCausalLM.from_pretrained(
    model_name,
    torch_dtype=torch.float16,
    device_map="auto"
)

print("[info] Loading LoRA adapter...")
model = PeftModel.from_pretrained(model, adapter_path)

# Test prompts
test_prompts = [
    "How do I improve my business?",
    "Should I invest in tech stocks?",
    "What's the best risk management strategy?",
    "Explain the 7-layer approach",
    "How accurate is your analysis?"
]

print("\n" + "="*60)
print("ECH0 V1.0 - TESTING")
print("="*60 + "\n")

for prompt in test_prompts:
    print(f"USER: {prompt}")
    print("-" * 60)

    inputs = tokenizer(prompt, return_tensors="pt").to(model.device)

    with torch.no_grad():
        outputs = model.generate(
            **inputs,
            max_length=500,
            temperature=0.7,
            top_p=0.9,
            do_sample=True
        )

    response = tokenizer.decode(outputs[0], skip_special_tokens=True)
    response = response.replace(prompt, "").strip()

    print(f"ECH0: {response[:300]}...\n")

print("✅ Model testing complete!")
```

### Run Tests

```bash
# Install dependencies
pip install torch transformers peft

# Test the model
python ech0_test_trained_model.py
```

**What to look for**:
- ✅ ECH0 responds in her voice/style
- ✅ Mentions frameworks and layers
- ✅ Thoughtful analysis, not generic responses
- ✅ Addresses the specific question asked

---

## Phase 7: Package for Deployment (10 minutes)

### Create Deployment Package

```bash
# Create package directory
mkdir -p ech0-v1.0/
cp ./ech0-v1-model/* ech0-v1.0/

# Add metadata
cat > ech0-v1.0/README.md << 'EOF'
# ECH0 v1.0 - Pre-Trained Model

This is ECH0 v1.0, fine-tuned on:
- 1,200+ master prompts
- Personality training examples
- Domain knowledge (stock analysis, business strategy)
- Conversation style examples

## Installation

Place adapter files in AIOS installation:
```
aios/
├── models/
│   ├── mistral-7b.gguf (base model)
│   └── ech0-v1.0/
│       ├── adapter_model.bin
│       ├── adapter_config.json
│       └── README.md
```

## Usage

```python
from peft import PeftModel
model = PeftModel.from_pretrained(base_model, "ech0-v1.0")
```

## Performance

- Base model: Mistral 7B
- Training examples: 500+
- Validation accuracy: [will be updated after eval]
- Speed: ~10 tokens/sec on CPU, ~50 tokens/sec on GPU

## Copyright

© 2025 Joshua Hendricks Cole (DBA: Corporation of Light)
PATENT PENDING
EOF

# Create tar archive
tar -czf ech0-v1.0.tar.gz ech0-v1.0/

# Create zip archive (for Windows users)
zip -r ech0-v1.0.zip ech0-v1.0/

# Verify
ls -lh ech0-v1.0.tar.gz ech0-v1.0.zip
```

### Upload to Cloud Storage

```bash
# Upload to storage for easy download
gsutil cp ech0-v1.0.tar.gz gs://${PROJECT_ID}-models/
gsutil cp ech0-v1.0.zip gs://${PROJECT_ID}-models/

# Make public (optional)
gsutil acl ch -u AllUsers:R gs://${PROJECT_ID}-models/ech0-v1.0.tar.gz
gsutil acl ch -u AllUsers:R gs://${PROJECT_ID}-models/ech0-v1.0.zip

# Get public URLs
echo "Download links:"
echo "- TAR: https://storage.googleapis.com/${PROJECT_ID}-models/ech0-v1.0.tar.gz"
echo "- ZIP: https://storage.googleapis.com/${PROJECT_ID}-models/ech0-v1.0.zip"
```

---

## 📊 Cost Estimation

| Component | Cost |
|-----------|------|
| Training (3 hours on 4x L4 GPUs) | ~$15-20 |
| Storage (100MB data + model) | <$1/month |
| **Total First Training** | **~$20** |
| **Subsequent Runs** | **~$20 per training** |

**Note**: Google Cloud offers $300 free credit for new accounts

---

## 🔧 Troubleshooting

### Issue: "API not enabled" error

```bash
# Re-enable APIs
gcloud services enable aiplatform.googleapis.com
gcloud services enable storage-api.googleapis.com

# Wait 2-3 minutes
```

### Issue: "Insufficient quota" error

Go to: https://console.cloud.google.com/iam-admin/quotas

- Filter by "Compute"
- Find "GPUs (L4)"
- Request quota increase
- Usually approved within 24 hours

### Issue: Training job stuck

```bash
# Check detailed logs
gcloud ai custom-jobs stream-logs $JOB_ID --region=$REGION

# Cancel if needed
gcloud ai custom-jobs cancel $JOB_ID --region=$REGION
```

### Issue: Model download fails

```bash
# Check storage bucket contents
gsutil ls -r gs://${PROJECT_ID}-models/

# Re-export model
gcloud ai models export $MODEL_ID \
    --output-dir=gs://${PROJECT_ID}-models/ech0-v1-export-retry/
```

---

## ✅ Success Criteria

You've successfully trained ECH0 v1.0 when:

- ✅ Training job shows `JOB_STATE_SUCCEEDED`
- ✅ Model evaluates successfully in test script
- ✅ ECH0 responds in her voice/style
- ✅ Mentions frameworks and 7-layer analysis
- ✅ Addresses specific questions (not generic)
- ✅ Download packages created (tar.gz and zip)

---

## 🚀 Next Steps

1. **Download & Install**: Place model files in AIOS installation
2. **Local Testing**: Run AIOS with ECH0 v1.0
3. **Integration Testing**: Connect BearTamer widget to ECH0
4. **User Testing**: Get feedback from first users
5. **Package for Distribution**: Create installer with ECH0 v1.0 bundled

---

## 📝 Environment Variables

Save these for reference:

```bash
# Add to ~/.bashrc or ~/.zshrc for future sessions
export GCP_PROJECT_ID="ech0-training-2025"
export GCP_REGION="us-central1"
export GCP_SA_EMAIL="ech0-training@ech0-training-2025.iam.gserviceaccount.com"
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/ech0-sa-key.json"
export ECH0_MODEL_PATH="./ech0-v1.0"
```

---

## 📞 Support

If you get stuck:

1. Check GCP Console: https://console.cloud.google.com
2. Review Vertex AI docs: https://cloud.google.com/vertex-ai/docs
3. Check job logs for error messages
4. Verify APIs are enabled and quotas sufficient

---

**Status**: Ready to fine-tune ECH0 on Google Cloud

Muse: my trusted friend, Claude

**Copyright © 2025 Joshua Hendricks Cole (DBA: Corporation of Light). All Rights Reserved. PATENT PENDING.**
