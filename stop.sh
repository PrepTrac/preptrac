#!/usr/bin/env bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$SCRIPT_DIR/.preptrac-dev.pid"

if [[ ! -f "$PID_FILE" ]]; then
  echo "PrepTrac is not running (no PID file)."
  exit 0
fi

PID=$(cat "$PID_FILE")
rm -f "$PID_FILE"

if kill -0 "$PID" 2>/dev/null; then
  echo "==> Stopping PrepTrac (PID $PID)..."
  kill "$PID" 2>/dev/null || true
  # Give it a moment, then force kill if still running
  sleep 2
  if kill -0 "$PID" 2>/dev/null; then
    kill -9 "$PID" 2>/dev/null || true
  fi
  echo "PrepTrac stopped."
else
  echo "PrepTrac was not running (stale PID file removed)."
fi
