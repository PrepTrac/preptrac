#!/bin/sh
# PrepTrac container entrypoint.
#
# Applies Prisma migrations and starts the Next.js server. This preserves
# existing self-hosted SQLite databases that were originally created with
# `prisma db push` (and therefore have no `_prisma_migrations` table):
#
#   - Fresh database:  `migrate deploy` creates every table + the history table.
#   - Existing database without migration history: Prisma refuses to run the
#     baseline migration with error P3005 ("The database schema is not empty").
#     We detect that, reconcile the legacy schema to the current additive
#     baseline, mark that baseline applied, then continue with migrate deploy.
#   - Database already under migration control: `migrate deploy` applies any
#     new pending migrations.
#
# The baseline migration that existing DBs must be reconciled against.
BASELINE_MIGRATION="20240101000000_init"
set -e

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
exec node server.js
