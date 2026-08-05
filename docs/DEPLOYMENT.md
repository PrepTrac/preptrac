# Deploying PrepTrac (Coolify / Docker)

PrepTrac is a self-hosted, single-user preparedness-inventory app built with
Next.js (standalone build) + Prisma + SQLite. This guide covers running it on
**Coolify** (or plain Docker) and enabling scheduled notifications.

> ⚠️ **No login, no authentication.** PrepTrac is intentionally single-user and
> has **no sign-in**. Anyone who can reach the app can read and edit all data.
> Do **not** expose it directly to the public internet without access control.
> On Coolify, enable **Basic Authentication** on the resource (proxy layer) or
> restrict access to a trusted LAN / VPN. See the HTTPS section below.

---

## 1. Persistent volume (SQLite at `/app/data`)

The SQLite database file lives at `/app/data/dev.db` inside the container. This
**must** survive redeployments or you lose all data.

- **Docker Compose:** `docker-compose.yml` already declares the named volume
  `preptrac-data` mounted at `/app/data`. Coolify honors compose volumes and
  persists them across redeployments — no extra setup needed.
- **Coolify (Application / Dockerfile build):** in the resource's
  **Persistent Storage** section add an entry whose **mount path is exactly
  `/app/data`**. A path mismatch means a fresh empty database on every redeploy
  (silent data loss). Coolify requires an in-container destination for a named
  volume, so `/app/data` is the destination; `/app/data` is also the path
  `DATABASE_URL` points at.
- Coolify discourages sharing the same volume across multiple containers. Keep
  one app instance per volume (SQLite is a single-file, single-writer database).

Back up the volume regularly — there is no built-in backup automation.

## 2. Environment variables

At minimum, set these in your Coolify resource (or `docker-compose.yml`):

| Variable | Required | Example / notes |
| --- | --- | --- |
| `DATABASE_URL` | **yes** | `file:/app/data/dev.db` — must point inside the mounted volume. If missing or wrong, the container crash-loops on boot. |
| `NODE_ENV` | yes | `production` |
| `PORT` | yes | `8008` (the container listens here) |
| `CRON_SECRET` | for notifications | A long random string (`openssl rand -hex 32`). Gates the cron runner. |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASSWORD` / `SMTP_FROM` | for email | SMTP relay details. Also overridable per-user in **Settings → Notifications**. |

On Coolify, mark `CRON_SECRET` and the `SMTP_PASSWORD` as **secrets** (masked).
For Compose-based deploys, Coolify interpolates variables referenced in the
compose file.

## 3. Health checking

The container exposes `GET /api/health` → `200 { "status": "ok" }`. The
`Dockerfile` declares a `HEALTHCHECK` (and `docker-compose.yml` a `healthcheck`)
that probes it with `wget` (the runner image is Alpine and has no `curl`):

```
HEALTHCHECK CMD wget --quiet --tries=1 --spider http://localhost:8008/api/health || exit 1
```

Coolify reads the container health status and surfaces healthy/unhealthy.

## 4. Scheduled notifications (Coolify Scheduled Task)

Notifications (expiration, maintenance, rotation, low-inventory alerts via email
and webhook) are delivered by an **idempotent** runner at
`/api/cron/notifications`. It is **not** driven by an in-process timer — you
schedule it with a **Coolify Scheduled Task** (or any cron), which is correct
for single- and multi-replica setups alike.

**Setup:**

1. Set `CRON_SECRET` (see above) and your `SMTP_*` / webhook settings.
2. Configure notification lead times and channels in **Settings → Notifications**.
3. In Coolify, add a **Scheduled Task** for the resource:
   - **Schedule:** `@daily` (or `@hourly`, or a cron expression like `0 8 * * *`).
   - **Command:**
     ```sh
     wget -qO- "http://localhost:8008/api/cron/notifications" \
       --header="Authorization: Bearer $CRON_SECRET"
     ```
   The scheduled task runs inside the resource's container, so the app, its
   environment variables, and the database are all in scope.

The runner records each delivery in the `NotificationLog` table. The unique
`dedupKey` guarantees an alert is sent **at most once** per
(user, channel, type, item, event-date), so a retried or overlapping run never
produces duplicate emails/webhooks. Re-running it is safe.

> The secret is accepted only through the `Authorization` header so it does not
> appear in reverse-proxy access logs or browser history.

## 5. HTTPS / reverse proxy

Coolify deploys **Traefik** as the default reverse proxy and provisions
**Let's Encrypt** TLS automatically. Point your DNS A record at the server and
assign the domain to the resource — HTTPS is configured for you. (Caddy is also
selectable in recent versions; Traefik is the default.)

Because PrepTrac has **no authentication** (see the warning above), when exposing
it beyond a trusted LAN you **must** add an access layer. On Coolify, enable
**Basic Authentication** on the resource (a Traefik basic-auth middleware,
independent of the app), or use **Custom Labels** for IP allow-listing.

## 6. Notes

- The schema is applied on every container start via `prisma db push` in the
  entrypoint. This is idempotent for SQLite and safe as long as the volume
  persists. Schema changes in this project are kept **additive** to avoid any
  destructive migration prompt.
- The runner image copies the Prisma CLI from the build stage (no network
  `npm install` at runner build time) for reproducibility.
