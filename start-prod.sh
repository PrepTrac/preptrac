#!/usr/bin/env bash
# Production start script — use after 'npm run build'.
# Tuned for low-memory hosts (e.g. Raspberry Pi): limits Node.js heap.
# If port 3000 is in use, tries 3001, 3002, ... up to 3010.
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Limit heap size for Raspberry Pi / low-RAM (default 512MB; override with NODE_OPTIONS if needed)
export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=512}"

if [[ ! -d ".next" ]]; then
  echo "==> No .next folder. Run 'npm run build' first."
  exit 1
fi

if [[ ! -f ".next/standalone/server.js" ]]; then
  echo "==> No .next/standalone/server.js. Run 'npm run build' first (with output: standalone in next.config.js)."
  exit 1
fi

# Standalone build does not include static/public; copy them so the server can serve assets
if [[ ! -d ".next/standalone/.next/static" ]]; then
  echo "==> Copying .next/static into standalone..."
  mkdir -p .next/standalone/.next
  cp -r .next/static .next/standalone/.next/
fi
if [[ ! -d ".next/standalone/public" ]]; then
  echo "==> Copying public into standalone..."
  cp -r public .next/standalone/
fi

# Find first free port from 3000 to 3010 (failover if 3000 is already in use)
find_free_port() {
  node -e "
    const net = require('net');
    function portFree(port) {
      return new Promise((resolve) => {
        const s = net.createServer();
        s.once('error', () => resolve(false));
        s.once('listening', () => { s.close(); resolve(true); });
        s.listen(port, '127.0.0.1');
      });
    }
    (async () => {
      for (let p = 3000; p <= 3010; p++) {
        if (await portFree(p)) { console.log(p); process.exit(0); }
      }
      console.error('No free port between 3000 and 3010'); process.exit(1);
    })();
  "
}

PORT="$(find_free_port)"
export PORT

# Use absolute path for SQLite so the DB is always the project's prisma/dev.db.
# (Standalone server may change CWD; relative paths then point to the wrong place → "readonly database".)
case "${DATABASE_URL:-file:./dev.db}" in
  file:./*)
    export DATABASE_URL="file:${SCRIPT_DIR}/prisma/dev.db"
    ;;
  *)
    # Keep existing DATABASE_URL (e.g. PostgreSQL or already absolute)
    ;;
esac

# When using local SQLite, ensure prisma dir and DB exist and are writable (avoid "readonly database")
if [[ "$DATABASE_URL" == "file:${SCRIPT_DIR}/prisma/dev.db" ]]; then
  if [[ ! -f "$SCRIPT_DIR/prisma/dev.db" ]]; then
    echo "==> No prisma/dev.db yet. Run 'npm run db:push' once from the project root."
    exit 1
  fi
  if [[ ! -w "$SCRIPT_DIR/prisma" ]] || [[ ! -w "$SCRIPT_DIR/prisma/dev.db" ]]; then
    echo "==> prisma/ or prisma/dev.db is not writable. Fix permissions (e.g. chmod) so this user can write."
    exit 1
  fi
fi

echo "==> Starting PrepTrac (production) at http://localhost:${PORT}"
echo "    PORT=$PORT DATABASE_URL=$DATABASE_URL NODE_OPTIONS=$NODE_OPTIONS"
echo "    Using standalone server (node .next/standalone/server.js)"
exec node .next/standalone/server.js
