#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

PID_FILE="$SCRIPT_DIR/.preptrac-dev.pid"

if [[ -f "$PID_FILE" ]]; then
  OLD_PID=$(cat "$PID_FILE")
  if kill -0 "$OLD_PID" 2>/dev/null; then
    echo "PrepTrac is already running (PID $OLD_PID). Use ./stop.sh first."
    exit 1
  fi
  rm -f "$PID_FILE"
fi

echo "==> Starting PrepTrac dev server..."
npm run dev &
echo $! > "$PID_FILE"
echo ""
echo "PrepTrac is running at http://localhost:3000 (PID $(cat "$PID_FILE"))"
echo "Run ./stop.sh to stop."
echo ""
