#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "==> PrepTrac install"
echo ""

# Check Node.js
if ! command -v node &>/dev/null; then
  echo "Error: Node.js is not installed. Install Node.js 18+ and try again."
  exit 1
fi

NODE_VER=$(node -v | sed 's/^v//' | cut -d. -f1)
if [[ "$NODE_VER" -lt 18 ]]; then
  echo "Error: Node.js 18+ is required. Current: $(node -v)"
  exit 1
fi

echo "Using Node $(node -v)"
echo ""

# Install dependencies
echo "==> Installing dependencies..."
npm install
echo ""

# Create .env if missing
if [[ ! -f .env ]]; then
  echo "==> Creating .env from .env.example..."
  cp .env.example .env
  echo "   Edit .env if you need to change DATABASE_URL or other settings."
else
  echo "==> .env already exists, skipping."
fi
echo ""

# Initialize database
echo "==> Initializing database..."
npm run db:push
npm run db:generate
echo ""

echo "==> Install complete."
echo "   Run ./start.sh to start the app, then open http://localhost:3000"
echo "   Run ./stop.sh to stop the app."
echo ""
