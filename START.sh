#!/usr/bin/env bash
#
# START.sh — boot the NollywoodVideo Express API (port from $PORT, 4110 in production)
#
# This script ONLY starts the backend API. It never runs next dev/build/start.
#
set -e

# Resolve the directory this script lives in and work from there.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "==> NollywoodVideo API starting from: $SCRIPT_DIR"

# Basic sanity checks
if ! command -v node >/dev/null 2>&1; then
  echo "ERROR: node is not installed or not on PATH." >&2
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "ERROR: npm is not installed or not on PATH." >&2
  exit 1
fi

if [ ! -f "package.json" ]; then
  echo "ERROR: package.json not found in $SCRIPT_DIR." >&2
  exit 1
fi

if [ ! -f "server/index.js" ]; then
  echo "ERROR: server/index.js not found in $SCRIPT_DIR." >&2
  exit 1
fi

if [ ! -f ".env" ]; then
  echo "WARNING: no .env file found. Copy .env.example to .env and fill in the values."
fi

echo "==> Node: $(node -v)  npm: $(npm -v)"

# Install production dependencies only.
echo "==> Installing production dependencies (npm install --omit=dev)..."
npm install --omit=dev

# Make sure the log directory exists.
mkdir -p logs

# Launch the API in the background, detached from this shell.
echo "==> Launching API: nohup node server/index.js > logs/api.log 2>&1 &"
nohup node server/index.js > logs/api.log 2>&1 &
API_PID=$!

# Record the pid so it can be stopped later.
echo "$API_PID" > logs/api.pid

# Give the process a moment to fail fast on bad config.
sleep 2

if kill -0 "$API_PID" >/dev/null 2>&1; then
  echo "==> NollywoodVideo API running with PID: $API_PID"
  echo "==> Logs: $SCRIPT_DIR/logs/api.log"
  echo "==> Stop with: kill \$(cat $SCRIPT_DIR/logs/api.pid)"
else
  echo "ERROR: API process exited immediately. Last 40 log lines:" >&2
  tail -n 40 logs/api.log >&2 || true
  exit 1
fi