#!/bin/bash

# Function to handle script exit (Ctrl+C)
cleanup() {
    echo ""
    echo  "🛑 Shutting down all services..."
    # Kill all child processes in the current process group
    kill 0
    exit
}

# Trap SIGINT (Ctrl+C) and SIGTERM to run the cleanup function
trap cleanup SIGINT SIGTERM

# Add current directory to PYTHONPATH so python can find djck_agent
export PYTHONPATH=$PYTHONPATH:.

# Load and export environment variables from .env
if [ -f .env ]; then
    echo  "🌍 Loading environment variables from .env..."
    set -o allexport
    source .env
    set +o allexport
else
    echo  "⚠️  Warning: .env file not found."
fi

# 1. Start MCP Toolbox
echo "Starting MCP Toolbox... (Port 5000)"
(./toolbox --tools-file "tools.yaml" --ui) &

# Wait indefinitely to keep the background processes alive until Ctrl+C
wait