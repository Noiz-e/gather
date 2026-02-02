#!/bin/bash
set -e

# Configuration
PROJECT_ID="${GCP_PROJECT_ID:-noiz-430406}"
REGION="${GCP_REGION:-asia-southeast1}"
SERVICE_NAME="gather-api"

echo "🚀 Deploying to Cloud Run..."
echo "   Project: $PROJECT_ID"
echo "   Region: $REGION"
echo "   Service: $SERVICE_NAME"

# Build and deploy in one command
gcloud run deploy $SERVICE_NAME \
  --source . \
  --project $PROJECT_ID \
  --region $REGION \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars "GEMINI_API_KEY=${GEMINI_API_KEY}" \
  --memory 512Mi \
  --timeout 300s

echo "✅ Deployment complete!"
echo ""
echo "Get the service URL with:"
echo "  gcloud run services describe $SERVICE_NAME --region $REGION --format 'value(status.url)'"
