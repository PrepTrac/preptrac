#!/usr/bin/env bash
# Production start script — use after 'npm run build'.
# Tuned for low-memory hosts (e.g. Raspberry Pi): limits Node.js heap.
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Limit heap size for Raspberry Pi / low-RAM (default 512MB; override with NODE_OPTIONS if needed)
export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=512}"

if [[ ! -d ".next" ]]; then
  echo "==> No .next folder. Run 'npm run build' first."
  exit 1
fi

echo "==> Starting PrepTrac (production) at http://localhost:3000"
echo "    NODE_OPTIONS=$NODE_OPTIONS"
exec npm start
