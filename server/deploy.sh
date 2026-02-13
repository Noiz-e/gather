#!/bin/bash
set -e

# Configuration
PROJECT_ID="${GCP_PROJECT_ID:-noiz-430406}"
REGION="${GCP_REGION:-asia-southeast1}"
SERVICE_NAME="gather-api"
GCS_BUCKET="${GCS_BUCKET:-gs://gatherin.org}"
FRONTEND_DIR="$(dirname "$0")/.."

# Cloud SQL Configuration
# Format: PROJECT_ID:REGION:INSTANCE_NAME
CLOUD_SQL_CONNECTION_NAME="${CLOUD_SQL_CONNECTION_NAME:-${PROJECT_ID}:${REGION}:gather}"
DB_NAME="${DB_NAME:-postgres}"
DB_USER="${DB_USER:-postgres}"
# Password has special chars, use single quotes to avoid bash expansion
DEFAULT_DB_PASSWORD='26}sM*"J$P2#oZv2'
DB_PASSWORD="${DB_PASSWORD:-$DEFAULT_DB_PASSWORD}"

echo "🚀 Deploying backend to Cloud Run..."
echo "   Project: $PROJECT_ID"
echo "   Region: $REGION"
echo "   Service: $SERVICE_NAME"
echo "   Cloud SQL: $CLOUD_SQL_CONNECTION_NAME"

# Load environment variables from .env file
if [ -f .env ]; then
  export $(grep -v '^#' .env | grep -v '^$' | xargs)
fi

# Frontend URL for CORS (the bucket name maps to the custom domain)
FRONTEND_URL="${FRONTEND_URL:-https://gatherin.org}"

# Build and deploy backend with environment variables and Cloud SQL connection
# --min-instances 1: Keep at least 1 instance always warm (avoids cold starts)
# --max-instances 3: Cap scaling to control costs
# --cpu-always-allocated: Keep CPU active even when idle (required for min-instances to be effective)
gcloud run deploy $SERVICE_NAME \
  --source . \
  --project $PROJECT_ID \
  --region $REGION \
  --platform managed \
  --allow-unauthenticated \
  --memory 1Gi \
  --cpu 2 \
  --timeout 300s \
  --min-instances 1 \
  --max-instances 3 \
  --cpu-always-allocated \
  --add-cloudsql-instances $CLOUD_SQL_CONNECTION_NAME \
  --set-env-vars "GEMINI_API_KEY=${GEMINI_API_KEY},ELEVENLABS_API_KEY=${ELEVENLABS_API_KEY},FAL_KEY=${FAL_KEY},TTS_ENDPOINT=${TTS_ENDPOINT},CLOUD_SQL_CONNECTION_NAME=${CLOUD_SQL_CONNECTION_NAME},DB_NAME=${DB_NAME},DB_USER=${DB_USER},DB_PASSWORD=${DB_PASSWORD},JWT_SECRET=${JWT_SECRET},FRONTEND_URL=${FRONTEND_URL},NODE_ENV=production"

echo "✅ Backend deployment complete!"

# Get the service URL (for reference)
echo ""
echo "📡 Getting service URL..."
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME \
  --project $PROJECT_ID \
  --region $REGION \
  --format 'value(status.url)')

echo "   Service URL: $SERVICE_URL"

# Use custom domain for API (mapped via Cloud Run domain mapping)
CUSTOM_API_URL="https://api.gatherin.org"
API_BASE="${CUSTOM_API_URL}/api"

# Update .env.production with the custom domain API URL
ENV_FILE="$FRONTEND_DIR/.env.production"

echo ""
echo "📝 Updating $ENV_FILE..."
echo "# Production API endpoint (Cloud Run via custom domain)" > "$ENV_FILE"
echo "VITE_API_BASE=$API_BASE" >> "$ENV_FILE"
echo "   VITE_API_BASE=$API_BASE"

# Build frontend
echo ""
echo "🔨 Building frontend..."
cd "$FRONTEND_DIR"
npm run build

# Deploy frontend to GCS
echo ""
echo "☁️  Deploying frontend to $GCS_BUCKET..."
gcloud storage cp --recursive dist/* "$GCS_BUCKET"

echo ""
echo "✅ Full deployment complete!"
echo "   Backend: $SERVICE_URL"
echo "   Frontend: $GCS_BUCKET"
