#!/bin/sh
# PrepTrac entrypoint for Nixpacks/Coolify deploys.
#
# Same migration strategy as scripts/start.sh (handles fresh databases and
# legacy db-push databases that have no migration history), but launches
# `next start` (npm start) instead of the standalone `node server.js` used by
# the Dockerfile build. Nixpacks runs the standard Next.js server, not the
# standalone output.
#
# `next start` reads the PORT environment variable (Coolify injects it) and
# binds to 0.0.0.0, so the reverse proxy can reach it.

# The baseline migration that legacy databases must be reconciled against.
BASELINE_MIGRATION="20240101000000_init"
set -e

# Ensure the SQLite file's parent directory exists before Prisma opens it.
# Unlike the Dockerfile (which pre-creates /app/data), the Nixpacks image does
# not, so a DATABASE_URL like file:/app/data/dev.db crashes at startup with
# "directory does not exist" when nothing has created that folder. Mounting a
# persistent volume at the path is still required for data to survive redeploy.
db_path="${DATABASE_URL#file:}"
db_dir="$(dirname "$db_path")"
[ -n "$db_dir" ] && mkdir -p "$db_dir"

echo "[start] Applying database migrations..."

migration_output=$(npx prisma migrate deploy 2>&1) && migration_status=0 || migration_status=$?

if [ "$migration_status" -eq 0 ]; then
  echo "$migration_output"
  echo "[start] Migrations applied."
elif echo "$migration_output" | grep -q "P3005"; then
  # Legacy PrepTrac installations were managed by `prisma db push` and have no
  # migration history. Reconcile that existing schema to the current additive
  # baseline before recording it. This preserves all rows and handles databases
  # created before NotificationLog/Category.kind were introduced.
  echo "[start] Existing database without migration history (P3005). Reconciling the additive baseline..."
  npx prisma db push
  npx prisma migrate resolve --applied "$BASELINE_MIGRATION"
  npx prisma migrate deploy
  echo "[start] Baseline reconciliation complete."
else
  echo "$migration_output"
  echo "[start] Prisma migrate deploy failed (exit $migration_status)."
  exit "$migration_status"
fi

echo "[start] Starting Next.js server..."
exec npm start
