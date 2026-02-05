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
DB_PASSWORD="${DB_PASSWORD:-26}sM*\"J$P2#oZv2"

echo "🚀 Deploying backend to Cloud Run..."
echo "   Project: $PROJECT_ID"
echo "   Region: $REGION"
echo "   Service: $SERVICE_NAME"
echo "   Cloud SQL: $CLOUD_SQL_CONNECTION_NAME"

# Load environment variables from .env file
if [ -f .env ]; then
  export $(grep -v '^#' .env | grep -v '^$' | xargs)
fi

# Build and deploy backend with environment variables and Cloud SQL connection
gcloud run deploy $SERVICE_NAME \
  --source . \
  --project $PROJECT_ID \
  --region $REGION \
  --platform managed \
  --allow-unauthenticated \
  --memory 512Mi \
  --timeout 300s \
  --add-cloudsql-instances $CLOUD_SQL_CONNECTION_NAME \
  --set-env-vars "GEMINI_API_KEY=${GEMINI_API_KEY},ELEVENLABS_API_KEY=${ELEVENLABS_API_KEY},FAL_KEY=${FAL_KEY},TTS_ENDPOINT=${TTS_ENDPOINT},CLOUD_SQL_CONNECTION_NAME=${CLOUD_SQL_CONNECTION_NAME},DB_NAME=${DB_NAME},DB_USER=${DB_USER},DB_PASSWORD=${DB_PASSWORD}"

echo "✅ Backend deployment complete!"

# Get the service URL
echo ""
echo "📡 Getting service URL..."
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME \
  --project $PROJECT_ID \
  --region $REGION \
  --format 'value(status.url)')

echo "   Service URL: $SERVICE_URL"

# Update .env.production with the new API URL
ENV_FILE="$FRONTEND_DIR/.env.production"
API_BASE="${SERVICE_URL}/api"

echo ""
echo "📝 Updating $ENV_FILE..."
echo "# Production API endpoint (Cloud Run)" > "$ENV_FILE"
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
