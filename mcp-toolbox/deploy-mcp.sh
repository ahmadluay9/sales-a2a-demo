#!/bin/bash

# 1. Configuration
PROJECT_ID=$(gcloud config get-value project)
SERVICE_NAME="a2a-sales-mcp"
REGION="asia-southeast2"
SECRET_NAME_TOOLS="mcp-sales-tools"
SECRET_NAME_DB_PASS="pg-pass"  # Your DB password secret name
IMAGE="us-central1-docker.pkg.dev/database-toolbox/toolbox/toolbox:latest"
POSTGRES_HOST="34.101.127.72"

# 2. Load and prepare Environment Variables from .env
if [ -f .env ]; then
    echo "🌍 Processing .env variables..."
    DB_PASS_VALUE=$(grep '^POSTGRES_PASSWORD=' .env | cut -d '=' -f2-)
    ENV_VARS=$(grep -v '^#' .env | grep -v '^$' | grep -v 'POSTGRES_PASSWORD' | xargs | sed 's/ /,/g')
    ENV_VARS="${ENV_VARS},POSTGRES_HOST=${POSTGRES_HOST}"
else
    ENV_VARS="POSTGRES_HOST=${POSTGRES_HOST}"
fi

# 3. Secret Management (Tools YAML)
echo "🔒 Managing Tools Secret..."
if gcloud secrets describe "$SECRET_NAME_TOOLS" >/dev/null 2>&1; then
    gcloud secrets versions add "$SECRET_NAME_TOOLS" --data-file="tools.yaml"
else
    gcloud secrets create "$SECRET_NAME_TOOLS" --data-file="tools.yaml" --replication-policy="automatic"
fi

# 3.1 Secret Management (Database Password)
echo "🔑 Managing DB Password Secret..."
if [ -n "$DB_PASS_VALUE" ]; then
    if gcloud secrets describe "$SECRET_NAME_DB_PASS" >/dev/null 2>&1; then
        # Check if secret exists, add new version
        echo -n "$DB_PASS_VALUE" | gcloud secrets versions add "$SECRET_NAME_DB_PASS" --data-file=-
    else
        # Create new secret
        echo -n "$DB_PASS_VALUE" | gcloud secrets create "$SECRET_NAME_DB_PASS" --data-file=- --replication-policy="automatic"
    fi
else
    echo "⚠️ No POSTGRES_PASSWORD found in .env. Skipping secret update (assuming it exists on Cloud)."
fi

# 4. Deployment
echo "🚀 Deploying $SERVICE_NAME to $REGION..."

gcloud run deploy "$SERVICE_NAME" \
  --image "$IMAGE" \
  --region "$REGION" \
  --set-secrets "/app/tools.yaml=${SECRET_NAME_TOOLS}:latest,POSTGRES_PASSWORD=${SECRET_NAME_DB_PASS}:latest" \
  --set-env-vars "$ENV_VARS" \
--args="--tools_file=/app/tools.yaml,--address=0.0.0.0,--port=8080,--ui" \
  --allow-unauthenticated