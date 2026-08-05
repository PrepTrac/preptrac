# Security Policy

PrepTrac is a **single-user, self-hosted** preparedness-inventory application.
It intentionally has **no authentication or authorization** built in. Treat
the entire dataset as readable and writable by anyone who can reach the running
instance.

## Reporting a vulnerability

Please report security issues privately rather than as a public issue. Open a
private security advisory via GitHub's **Report a vulnerability** feature on the
repository's Security tab, or email the maintainer directly. Include:

- A description of the issue and its impact.
- Steps to reproduce (proof of concept).
- The PrepTrac version / commit you tested against.

We will acknowledge receipt and aim to provide an initial assessment within a
few days.

## Supported versions

Only the latest release line receives security fixes.

| Version | Supported |
| ------- | --------- |
| latest  | ✅        |
| < latest | ❌       |

## Deployment hardening checklist

Because the app has no built-in auth, the **hosting layer** must enforce access
control. When deploying:

- **Do not expose PrepTrac directly to the public internet.** Place it behind a
  reverse proxy with authentication (e.g. Coolify **Basic Authentication**, an
  IP allow-list, or a VPN / trusted LAN). See
  [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md#5-https--reverse-proxy).
- **Run as a non-root user.** The provided `Dockerfile` runs the container as
  the unprivileged `nextjs` user and owns the `/app/data` volume.
- **Protect secrets.** Store `CRON_SECRET`, `SMTP_PASSWORD`, and webhook
  secrets in the platform's secret store (masked), never in the image or in
  query strings. The scheduled-notification runner accepts `CRON_SECRET` only
  via the `Authorization` header so it never appears in proxy access logs.
- **Back up the SQLite volume** at `/app/data` regularly. There is no built-in
  backup automation.
- **Keep dependencies current.** Dependabot is configured to open grouped
  update PRs; review and merge them. `npm audit` runs as an advisory CI job.

## Webhook signatures

When a webhook secret is configured, outbound webhooks are signed with
HMAC-SHA256 (header `X-PrepTrac-Signature: sha256=<hex>`). Receivers should
verify the signature over the raw request body. See
[WEBHOOKS.md](./WEBHOOKS.md).

## Scope

This policy covers the PrepTrac application code and the provided Docker image.
It does not cover the host OS, reverse proxy, or the platform (Coolify/Docker)
that operators are responsible for securing.
