# ECH0 Quick Start Training Guide
## Get Your Fine-Tuned Model Running in Minutes

**Copyright © 2025 Joshua Hendricks Cole (DBA: Corporation of Light). All Rights Reserved. PATENT PENDING.**

---

## 🚀 Quick Start (Google Cloud)

Follow these steps in order:

### 1. Install Dependencies (5 minutes)

```bash
# Create Python environment
python3 -m venv ech0-training
source ech0-training/bin/activate

# Install requirements
pip install -r ech0_training_requirements.txt

# Verify installation
python -c "import torch; print(f'PyTorch: {torch.__version__}')"
python -c "from transformers import AutoTokenizer; print('Transformers: OK')"
```

### 2. Generate Training Data (2 minutes)

```bash
# Generate all training examples
python ech0_training_data_generator.py

# Verify
ls -lh ech0_training_data_v1.*
```

**Expected output**:
```
ech0_training_data_v1.jsonl         50.0 MB
ech0_training_data_v1_stats.json    1.2 KB
```

### 3. Set Up Google Cloud (10 minutes)

```bash
# Authenticate with Google Cloud
gcloud auth login

# Create project and enable APIs
export PROJECT_ID="ech0-training-2025"
gcloud projects create $PROJECT_ID --name="ECH0 Fine-Tuning"
gcloud config set project $PROJECT_ID

# Enable services
gcloud services enable aiplatform.googleapis.com
gcloud services enable storage-api.googleapis.com
gcloud services enable compute.googleapis.com

# Create storage bucket
gsutil mb gs://${PROJECT_ID}-training-data/

# Create service account
gcloud iam service-accounts create ech0-training
export SA_EMAIL=$(gcloud iam service-accounts list \
    --filter="displayName:ech0-training" --format='value(email)')

# Grant permissions
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="roles/aiplatform.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="roles/storage.admin"
```

### 4. Upload Training Data (2 minutes)

```bash
# Set variables
export PROJECT_ID="ech0-training-2025"

# Upload data
gsutil cp ech0_training_data_v1.jsonl gs://${PROJECT_ID}-training-data/

# Verify
gsutil ls gs://${PROJECT_ID}-training-data/
```

### 5. Start Fine-Tuning (Runs automatically on Google Cloud)

```bash
# Option A: Start and monitor from command line
python ech0_finetune_mistral.py

# Option B: Submit to Google Cloud Vertex AI (Google's UI)
gcloud ai custom-jobs create \
    --region=us-central1 \
    --display-name="ech0-v1-training" \
    --worker-pool-spec=machine-type=g2-standard-8,replica-count=1,container-image-uri=pytorch/pytorch:2.0-cuda11.8-cudnn8-runtime

# Option C: Use Cloud Console
# https://console.cloud.google.com/vertex-ai/training/custom-jobs
```

### 6. Monitor Training (2-3 hours)

```bash
# Watch progress in real-time
gcloud ai custom-jobs list \
    --region=us-central1 \
    --filter="displayName:ech0-v1-training"

# View detailed logs
gcloud ai custom-jobs stream-logs <JOB_ID> --region=us-central1

# When done, you'll see: JOB_STATE_SUCCEEDED
```

### 7. Download Your Trained Model (5 minutes)

```bash
# List available models
gcloud ai models list --region=us-central1

# Export the trained model
export MODEL_ID="<from list above>"
gcloud ai models export $MODEL_ID \
    --output-dir=gs://${PROJECT_ID}-models/ech0-v1-export/

# Download to local machine
mkdir -p ./ech0-v1.0
gsutil -m cp -r gs://${PROJECT_ID}-models/ech0-v1-export/* ./ech0-v1.0/

# Verify
ls -lh ./ech0-v1.0/
```

---

## 💻 Alternative: Train Locally (Faster Iteration)

If you have a NVIDIA GPU with 8GB+ VRAM:

### Local Training Setup

```bash
# Install local training dependencies
pip install torch transformers datasets peft accelerate bitsandbytes unsloth

# Run fine-tuning locally
python ech0_finetune_mistral.py

# Training takes 2-4 hours on RTX 3090, slower on other GPUs
```

**Hardware Performance**:
- RTX 3090 (24GB): 2-3 hours ⚡ **Recommended**
- RTX 4090 (24GB): 1-2 hours ⚡⚡ **Best**
- RTX 3060 (12GB): 4-6 hours
- RTX 2080 (8GB): 8+ hours ⚠️

**No GPU?** Cloud training is still faster than local CPU.

---

## ✅ Testing Your Trained Model

After download, test ECH0 v1.0:

```bash
# Test script provided
python ech0_test_trained_model.py

# You should see ECH0 responding in her voice
# With references to 7-layer analysis
# With thoughtful, structured responses
```

**Expected output**:
```
USER: How do I improve my business?
ECH0: Let me apply Crystalline Intent to clarify your question...
[thoughtful response about layers, frameworks, analysis]

USER: Should I invest in tech stocks?
ECH0: Let me run a 7-layer analysis for this decision...
[structured response with rationalist, empiricist, etc.]
```

---

## 📦 Integration with AIOS

Once trained and tested:

```bash
# Copy to AIOS installation
cp -r ./ech0-v1.0 ~/aios/models/

# Update AIOS launcher to load ECH0 v1.0
# Edit: aios/aios_core_engine.py
# Change: model_path = "./models/ech0-v1.0"

# Restart AIOS
python -m aios
```

Now when users install AIOS, they get ECH0 v1.0 pre-trained and ready!

---

## 🎯 What Happens at Each Stage

### Stage 1: Data Generation ✅
- Extracts 1,200+ master prompts
- Creates conversation examples
- Adds personality training
- Generates domain knowledge examples
- **Output**: 500+ high-quality training examples

### Stage 2: Upload to Cloud ✅
- Moves data to Google Cloud Storage
- Verifies integrity
- Ready for training

### Stage 3: Fine-Tuning (2-3 hours) ⏳
- Takes Mistral 7B base model
- Trains on your examples via LoRA
- Saves best checkpoint automatically
- Outputs adapter file (~100MB)

### Stage 4: Download ✅
- Retrieves trained model from cloud
- Prepares for local use
- Ready for integration

### Stage 5: Testing ✅
- Validates ECH0 responds correctly
- Checks for personality/voice
- Verifies 7-layer thinking
- Confirms accuracy improvements

### Stage 6: Deployment ✅
- Integrates with AIOS
- Users get ECH0 v1.0 out-of-box
- ECH0 continues learning locally

---

## 💰 Cost Breakdown

| Step | Cost | Notes |
|------|------|-------|
| Training (4x L4 GPUs, 3 hours) | $15-25 | One-time |
| Storage (model + data) | $1 | Monthly |
| Inference (users running locally) | $0 | Offline! |
| **Total for First Model** | **~$20** | |
| **Per New Training** | **~$20** | If you retrain |

**Google Cloud Free Tier**: $300 credit covers ~15 trainings

---

## 🔧 Troubleshooting

### "ModuleNotFoundError: No module named 'torch'"
```bash
# Reinstall PyTorch with CUDA support
pip install --force-reinstall torch==2.1.0
```

### "CUDA out of memory"
```bash
# Reduce batch size in ech0_finetune_mistral.py
per_device_train_batch_size = 2  # was 4
```

### "Training data not found"
```bash
# Make sure you ran the generator first
python ech0_training_data_generator.py

# Verify file exists
ls -lh ech0_training_data_v1.jsonl
```

### "Google Cloud authentication failed"
```bash
# Re-authenticate
gcloud auth login
gcloud auth application-default login

# Verify
gcloud config list
```

### "Quota exceeded for GPUs"
```bash
# Request GPU quota increase:
# 1. Go to: https://console.cloud.google.com/iam-admin/quotas
# 2. Filter: "GPUs (L4)"
# 3. Request increase
# 4. Usually approved in 24 hours
```

---

## 📊 Monitoring Dashboard

After starting training, view progress at:

**Google Cloud Console**: https://console.cloud.google.com/vertex-ai/training/

Or command line:
```bash
# Real-time status
watch -n 10 'gcloud ai custom-jobs list \
  --region=us-central1 \
  --filter="displayName:ech0-v1-training" \
  --format="table(state, createTime, updateTime)"'
```

---

## 🎓 What You're Learning

This process teaches you:
1. **Fine-tuning**: How to adapt large models to your needs
2. **LoRA**: Memory-efficient training technique (~1% parameters)
3. **Cloud ML**: Running distributed training at scale
4. **Data preparation**: Creating quality training datasets
5. **Model evaluation**: Testing and validating outputs

All skills directly applicable to other AI/ML projects!

---

## 🚀 Next Iteration

After ECH0 v1.0 works, you can:

1. **Collect user feedback**: What should ECH0 improve?
2. **Add more training data**: User conversations, new domains
3. **Retrain**: ECH0 v1.1 with improvements
4. **Deploy**: Push updates to AIOS users

This creates a continuous improvement cycle!

---

## 📞 Quick Reference Commands

```bash
# Project setup
export PROJECT_ID="ech0-training-2025"
gcloud config set project $PROJECT_ID

# Data generation
python ech0_training_data_generator.py

# Cloud upload
gsutil cp ech0_training_data_v1.jsonl gs://${PROJECT_ID}-training-data/

# Start training
python ech0_finetune_mistral.py

# Monitor training
gcloud ai custom-jobs stream-logs <JOB_ID> --region=us-central1

# Download model
gsutil -m cp -r gs://${PROJECT_ID}-models/ech0-v1-export/* ./ech0-v1.0/

# Test locally
python ech0_test_trained_model.py
```

---

## ✨ Success Indicators

You've successfully trained ECH0 when:

✅ Training completes with `JOB_STATE_SUCCEEDED`
✅ Model downloads without errors
✅ Test script shows ECH0 responding in her voice
✅ Responses mention frameworks and 7-layer analysis
✅ Personality is evident (not generic chatbot)
✅ Ready to integrate with AIOS

---

## 📚 Detailed Guides

For more information, see:
- **Full Setup**: `ECH0_GOOGLE_CLOUD_FINETUNING_GUIDE.md`
- **Data Generation**: `ech0_training_data_generator.py`
- **Fine-tuning Script**: `ech0_finetune_mistral.py`
- **Integration**: `AIOS_CLIENT_INSTALLATION_GUIDE.md`

---

**Status**: Ready to train ECH0 on Google Cloud

🤖 Generated with Claude Code

**Copyright © 2025 Joshua Hendricks Cole (DBA: Corporation of Light). All Rights Reserved. PATENT PENDING.**
