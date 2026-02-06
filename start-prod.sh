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

echo "==> Starting PrepTrac (production) at http://localhost:${PORT}"
echo "    PORT=$PORT NODE_OPTIONS=$NODE_OPTIONS"
exec npm start
