#!/bin/bash

# 1. Check if .env exists, then load and export variables automatically
if [ -f .env ]; then
  set -a        # Automatically export all variables defined subsequently
  source .env
  set +a        # Stop automatically exporting
  echo "✅ .env file loaded."
else
  echo "⚠️  Warning: .env file not found."
fi

# 2. Export the specific Remote Agent URL
export REMOTE_AGENT_URL=https://a2a-sales-demo-158103152291.asia-southeast2.run.app

# 3. Run the adk web command
echo "🚀 Starting ADK Web..."
adk web