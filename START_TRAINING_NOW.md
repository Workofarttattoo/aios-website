# 🚀 START ECH0 TRAINING IN 30 SECONDS

## The Fastest Way (Recommended)

### Option 1: Open Google Cloud Console (EASIEST)

```bash
open "https://console.cloud.google.com/vertex-ai/models?project=ech0-training-2025"
```

Then:
1. Click **"Create"** button
2. Select **"Fine-tune a model"**
3. Choose **"Mistral 7B"**
4. Paste training data: `gs://ech0-training-2025-training-data/ech0_training_data_v1.jsonl`
5. Select machine: **A100 (a2-highgpu-1g)**
6. Click **"Start Training"**

**Done! Training starts in ~1 minute.**

---

## Option 2: Via gcloud CLI (Single Command)

```bash
# Find Mistral 7B model ID
gcloud ai models list \
  --region=us-central1 \
  --project=ech0-training-2025 \
  --format="value(name)" | grep -i mistral
```

Then fine-tune:

```bash
gcloud ai models customize \
  --display-name="ech0-v1-a100" \
  --training-data="gs://ech0-training-2025-training-data/ech0_training_data_v1.jsonl" \
  --region=us-central1
```

---

## ✅ Current Status

| Item | Status |
|------|--------|
| Training Data | ✅ Uploaded (22.38 KB) |
| Output Bucket | ✅ Ready |
| GPU (A100) | ✅ Available |
| Billing | ✅ Enabled |
| Estimated Cost | $3-5 |
| Training Time | ~10 minutes |

---

## What Happens Next

1. **Setup (2 min)**: Provision A100 GPU, load Mistral 7B
2. **Training (4 min)**: Fine-tune with your 26 examples
3. **Save (2 min)**: Upload model to gs://ech0-training-2025-models/
4. **Done**: Download and test

**Total: ~10 minutes from start to trained model**

---

## 🎯 Recommendation

**USE OPTION 1** - Click the link, follow 6 steps, done. Fastest and easiest.

Your data is ready and waiting on Google Cloud!
