#!/bin/bash
set -e

# --- Configuration ---
SERVICE_NAME="a2a-sales-demo"
TOOLBOX_SERVICE_NAME="a2a-sales-mcp"
REGION="asia-southeast2"


# 1. Function to read .env file and export variables
load_env() {
  if [ -f .env ]; then
    echo "Loading environment variables from .env file..."
    set -o allexport
    source .env
    set +o allexport
  else
    echo "❌ Error: .env file not found."
    exit 1
  fi
}

load_env

# 2. Dynamic Configuration
# Automatically fetch the Toolbox URL from Cloud Run
echo "🔍 Fetching URL for toolbox service: $TOOLBOX_SERVICE_NAME..."
TOOLBOX_URL=$(gcloud run services describe "$TOOLBOX_SERVICE_NAME" \
  --region "$REGION" \
  --format 'value(status.url)')

if [ -z "$TOOLBOX_URL" ]; then
    echo "❌ Error: Could not find service $TOOLBOX_SERVICE_NAME in $REGION."
    exit 1
fi
echo "✅ Found Toolbox URL: $TOOLBOX_URL"

# 3. Validation
REQUIRED_VARS=(
  GOOGLE_CLOUD_PROJECT
  GOOGLE_CLOUD_LOCATION
)

for VAR in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!VAR}" ]; then
    echo "❌ Error: Environment variable '$VAR' is not set."
    exit 1
  fi
done

# 4. Prepare Deployment Vars
ENV_VARS_LIST=(
  "GOOGLE_CLOUD_PROJECT=$GOOGLE_CLOUD_PROJECT"
  "GOOGLE_CLOUD_LOCATION=$GOOGLE_CLOUD_LOCATION"
  "TOOLBOX_URL=$TOOLBOX_URL" # Injected dynamically
)

# Add optional Vertex AI/Gemini API key vars if they exist
if [ -n "$GOOGLE_GENAI_USE_VERTEXAI" ]; then
  ENV_VARS_LIST+=("GOOGLE_GENAI_USE_VERTEXAI=$GOOGLE_GENAI_USE_VERTEXAI")
fi

if [ -n "$GOOGLE_API_KEY" ]; then
  ENV_VARS_LIST+=("GOOGLE_API_KEY=$GOOGLE_API_KEY")
fi

ENV_VARS=$(IFS=, ; echo "${ENV_VARS_LIST[*]}")

# 5. Deployment
echo "🚀 Deploying $SERVICE_NAME to $REGION..."

# Check if we are in a source directory
if [ ! -f "Dockerfile" ] && [ ! -f "package.json" ] && [ ! -f "requirements.txt" ] && [ ! -f "go.mod" ]; then
    echo "⚠️  Warning: No Dockerfile or standard lock file found. Ensure you are in the source root."
fi

# Deploy to Cloud Run
if gcloud run deploy "$SERVICE_NAME" \
  --source . \
  --region "$REGION" \
  --project "$GOOGLE_CLOUD_PROJECT" \
  --allow-unauthenticated \
  --set-env-vars="$ENV_VARS"; then

  echo "✅ Deployment successful!"
  
SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" \
  --region "$REGION" \
  --project "$GOOGLE_CLOUD_PROJECT" \
  --format 'value(status.url)')

  echo "------------------------------------------------"
  echo "🌍 Demo UI:     $SERVICE_URL"
  echo "🔧 Toolbox API: $TOOLBOX_URL"
  echo "------------------------------------------------"
else
  echo "❌ Deployment failed."
  exit 1
fi