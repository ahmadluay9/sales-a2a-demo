#!/bin/bash

# Configuration
LOG_FILE="service_runner.log"
PIDS=()

# Initialize/Clear the log file
echo "--- New Execution Session: $(date) ---" > "$LOG_FILE"

# Function to log to both Console and File with Timestamp
log_message() {
    local timestamp=$(date "+%Y-%m-%d %H:%M:%S")
    echo "[$timestamp] $1" | tee -a "$LOG_FILE"
}

# Function to handle script exit (Ctrl+C)
cleanup() {
    echo "" | tee -a "$LOG_FILE"
    log_message "🛑 Shutting down all services..."
    # Kill all child processes in the current process group
    for pid in "${PIDS[@]}"; do
        kill "$pid" 2>/dev/null
    done

    pkill -f "uvicorn main:app" 2>/dev/null

    log_message "✅ Shutdown complete."
    exit 0
}


# Trap SIGINT (Ctrl+C) and SIGTERM to run the cleanup function
trap cleanup SIGINT SIGTERM

# Add current directory to PYTHONPATH
export PYTHONPATH=$PYTHONPATH:.

# Load and export environment variables from .env
if [ -f .env ]; then
    log_message "🌍 Loading environment variables from .env..."
    set -o allexport
    source .env
    set +o allexport
else
    log_message "⚠️  Warning: .env file not found."
fi


# Validate required DB vars
: "${POSTGRES_USER:?Missing POSTGRES_USER}"
: "${POSTGRES_PASSWORD:?Missing POSTGRES_PASSWORD}"
: "${POSTGRES_PORT:?Missing POSTGRES_PORT}"
: "${POSTGRES_SESSIONDB:?Missing POSTGRES_SESSIONDB}"

export POSTGRES_HOST=127.0.0.1
echo $POSTGRES_HOST
export REMOTE_AGENT_URL=https://a2a-sales-demo-158103152291.asia-southeast2.run.app

log_message "🚀 Starting DataDash Development Environment..."

for port in 8008 8000; do
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null ; then
        log_message "❌ Error: Port $port is already in use. Please kill the process and try again."
        exit 1
    fi
done

# 1. Start FastAPI App
log_message "Starting FastAPI (Port 8008)..."
uvicorn main:app --reload --port=8008 >>"$LOG_FILE" 2>&1 &
PIDS+=($!)

# 2. Start ADK Web
log_message "Starting ADK Web (Port 8000)..."
adk api_server sales_data_agent_consuming \
    --reload_agents \
    --session_service_uri=postgresql+asyncpg://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_SESSIONDB} \
    --allow_origins="*"  \
    >>"$LOG_FILE" 2>&1 &
PIDS+=($!)

log_message "ℹ️  All services are running."
log_message "📄 Logs: $LOG_FILE"
log_message "🧭 Press Ctrl+C to stop."

# Wait indefinitely to keep the background processes alive until Ctrl+C
wait