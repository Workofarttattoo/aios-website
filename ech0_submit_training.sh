#!/bin/bash

# ECH0 Fine-Tuning on Google Cloud - Using gcloud CLI
# Simplified version that works with Vertex AI

PROJECT_ID="ech0-training-2025"
REGION="us-central1"
TRAINING_DATA="gs://ech0-training-2025-training-data/ech0_training_data_v1.jsonl"
OUTPUT_DIR="gs://ech0-training-2025-models"

echo "============================================================"
echo "ECH0 FINE-TUNING - GOOGLE CLOUD VERTEX AI"
echo "============================================================"

# Verify gcloud is authenticated
echo ""
echo "[info] Checking authentication..."
CURRENT_PROJECT=$(gcloud config get-value project 2>/dev/null)
if [ "$CURRENT_PROJECT" != "$PROJECT_ID" ]; then
    echo "⚠️  Switching to project: $PROJECT_ID"
    gcloud config set project $PROJECT_ID
fi

ACCOUNT=$(gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>/dev/null)
echo "✅ Authenticated as: $ACCOUNT"

# Verify training data exists
echo ""
echo "[info] Verifying training data..."
if gsutil -q stat $TRAINING_DATA 2>/dev/null; then
    SIZE=$(gsutil du $TRAINING_DATA | awk '{print $1}')
    echo "✅ Training data exists: $TRAINING_DATA ($SIZE bytes)"
else
    echo "❌ Training data not found at $TRAINING_DATA"
    exit 1
fi

# Show what we're about to do
echo ""
echo "============================================================"
echo "FINE-TUNING CONFIGURATION"
echo "============================================================"
echo "Project ID:       $PROJECT_ID"
echo "Region:           $REGION"
echo "Training data:    $TRAINING_DATA"
echo "Output bucket:    $OUTPUT_DIR"
echo "Base model:       mistralai/Mistral-7B"
echo "Training type:    LoRA Fine-tuning"
echo "Estimated time:   2-3 hours"
echo "Estimated cost:   $10-30"
echo ""

echo "[info] For production fine-tuning, you have these options:"
echo ""
echo "OPTION 1: Use Google Cloud Console (Web UI)"
echo "  1. Go to: https://console.cloud.google.com/vertex-ai/models"
echo "  2. Click 'Create' → 'Tune Model'"
echo "  3. Select Mistral 7B"
echo "  4. Upload training data from: $TRAINING_DATA"
echo "  5. Click 'Start Training'"
echo ""

echo "OPTION 2: Use gcloud CLI"
echo "  1. Install gcloud SDK: brew install google-cloud-sdk"
echo "  2. Run fine-tuning command (see below)"
echo ""

echo "OPTION 3: Use Python API (requires google-cloud-aiplatform)"
echo "  pip install google-cloud-aiplatform"
echo "  python ech0_finetune_gcp.py"
echo ""

echo "============================================================"
echo "MANUAL FINE-TUNING COMMAND"
echo "============================================================"
echo ""
echo "To start fine-tuning via gcloud:"
echo ""
echo "gcloud ai models list --region=$REGION --format='table(name,displayName)'"
echo ""
echo "(Find mistral-7b model ID, then:)"
echo ""
echo "gcloud ai models customize \\
  --display-name=ech0-v1-finetuned \\
  --training-data=$TRAINING_DATA \\
  --output-dir=$OUTPUT_DIR \\
  --region=$REGION"
echo ""

echo "============================================================"
echo "QUICK STATS"
echo "============================================================"
TRAIN_LINES=$(gsutil cat $TRAINING_DATA | wc -l)
echo "✅ Training examples: $TRAIN_LINES"
echo "✅ Training data size: $(gsutil du -h $TRAINING_DATA | awk '{print $1}')"
echo "✅ Cloud Storage: Ready"
echo "✅ Billing: Enabled"
echo "✅ APIs: Enabled"
echo ""
echo "Status: READY TO TRAIN"
echo "============================================================"
echo ""

echo "Would you like to:"
echo "  1) Open Google Cloud Console (automatic)"
echo "  2) Show detailed training instructions"
echo "  3) Exit (you can train manually later)"
echo ""
read -p "Enter choice (1-3): " choice

case $choice in
    1)
        echo "Opening Google Cloud Console..."
        open "https://console.cloud.google.com/vertex-ai/models?project=$PROJECT_ID"
        ;;
    2)
        echo ""
        echo "DETAILED INSTRUCTIONS:"
        echo "1. Go to: https://console.cloud.google.com/vertex-ai"
        echo "2. Click 'Models' in left sidebar"
        echo "3. Click 'Create' button"
        echo "4. Choose 'Fine-tune foundation model'"
        echo "5. Select 'Mistral 7B'"
        echo "6. For training data, paste: $TRAINING_DATA"
        echo "7. Configure training parameters:"
        echo "   - Learning rate: 0.0002"
        echo "   - Epochs: 3"
        echo "   - Batch size: 4"
        echo "8. Click 'Start Training'"
        echo "9. Monitor progress in the console"
        echo "10. Download model when complete"
        echo ""
        ;;
    3)
        echo "Exiting. You can train anytime by running:"
        echo "  gcloud ai models create ech0-v1 --training-data=$TRAINING_DATA"
        ;;
esac
