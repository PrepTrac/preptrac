# PrepTrac — Project Summary (Technical)

Technical reference for developers and deployers. For end-user guidance, see [README.md](./README.md).

---

## Overview

PrepTrac is a preparedness inventory application. It provides inventory management, household-based days-of-food calculation, locations, consumption logging, calendar events, and notifications. The app runs without authentication (single default user). Built with the T3 Stack (Next.js, tRPC, Prisma, TailwindCSS, TypeScript).

---

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **API**: tRPC
- **Database**: Prisma (SQLite or PostgreSQL)
- **Styling**: TailwindCSS
- **Forms**: React Hook Form
- **Icons**: Lucide React
- **Date handling**: date-fns

No authentication layer: a single default user is created automatically (`getOrCreateDefaultUser` in `src/server/auth.ts`).

---

## Prerequisites

- Node.js 18+
- npm or yarn
- SQLite (default) or PostgreSQL

---

## Installation & Setup

1. Clone or copy the project.
2. **Install dependencies**: `npm install`
3. **Environment**: `cp .env.example .env`  
   Set `DATABASE_URL` (e.g. `file:./dev.db` for SQLite). `NEXTAUTH_*` vars are optional (auth not used).
4. **Database**: `npm run db:push` then `npm run db:generate`
5. **Run**: `npm run dev` → open http://localhost:3000

---

## Database Schema (Prisma)

- **User** — Single default user (no login).
- **Category** — Item categories (Food, Water, Ammo, etc.).
- **Location** — Storage locations.
- **Item** — Name, quantity, unit, category, location, expiration, maintenance, rotation, `caloriesPerUnit` (optional; required for food for Days of Food).
- **FamilyMember** — Household: age, weightKg, heightCm, sex (Mifflin-St Jeor for daily calories).
- **Event** — Calendar events (expiration, maintenance, rotation).
- **ConsumptionLog** — Per-item consumption (quantity, note, date).
- **NotificationSettings** — User notification preferences.
- **TestDataRecord** — Tracks entities created by “Fill test data” for safe removal.

---

## API Structure (tRPC)

Routers under `src/server/api/routers/`:

- **items** — CRUD, filters, consumption logging, consumption stats.
- **categories** — Category CRUD.
- **locations** — Location CRUD, `getConsumptionByLocation`.
- **events** — Event CRUD, sync from items.
- **dashboard** — `getStats` (water, days of food, ammo, category stats, upcoming events/expirations/maintenance).
- **household** — Family member CRUD, `getTotalDailyCalories`.
- **notifications** — Settings, pending notifications, test webhook/email.
- **settings** — `fillTestData`, `removeTestData`, `hasTestData`.
- **auth** — Legacy (e.g. register); app uses default user.

---

## Frontend Structure

```
src/
├── app/
│   ├── dashboard/    # Dashboard page
│   ├── inventory/    # Inventory list
│   ├── locations/    # Location detail + consumption
│   ├── consume/      # Log consumption + analytics
│   ├── household/    # Household profile
│   ├── calendar/     # Calendar view
│   ├── settings/     # Notifications, categories, locations, test data
│   └── auth/         # Legacy (unused)
├── components/
├── server/api/routers/
├── server/db.ts
├── server/auth.ts    # getOrCreateDefaultUser
└── utils/
```

---

## Database Options

### SQLite (default)

- `DATABASE_URL="file:./dev.db"`
- No extra setup. File is typically under `prisma/dev.db`.

### PostgreSQL

1. Create DB: `CREATE DATABASE preptrac;`
2. In `prisma/schema.prisma` set `provider = "postgresql"`.
3. Set `DATABASE_URL` in `.env` to your Postgres URL.
4. Run `npm run db:push`.

---

## Deployment

### Vercel

Push to GitHub, import in Vercel, set env vars, deploy. Ensure `DATABASE_URL` is set (e.g. Vercel Postgres or external).

### Docker

Use a Node 18 image: install deps, copy source, `npm run build`, `CMD ["npm", "start"]`. Expose 3000. Provide `DATABASE_URL` and any other env.

### Self-hosted

- `npm run build` then `npm start`.
- Put a reverse proxy (nginx, Caddy) in front for HTTPS and routing.

---

## Development

- **Prisma Studio**: `npm run db:studio` to inspect/edit data.
- **Types**: Prisma + tRPC + TypeScript give end-to-end type safety.
- **Linting**: Standard ESLint/TypeScript; fix any reported issues in edited files.

---

## Extending the App

- **New item fields**: Add to `prisma/schema.prisma` (Item model), run `npm run db:push`, update `src/server/api/routers/items.ts` and `ItemForm.tsx`.
- **New event types**: Extend event type handling in `src/server/api/routers/events.ts` and calendar UI.
- **Email notifications**: Configure SMTP in `.env` and use the notifications router (e.g. nodemailer) for sending.

---

## Troubleshooting

- **DB connection**: Check `DATABASE_URL` in `.env`. For Postgres, ensure DB exists and credentials work. Run `npm run db:push` to sync schema.
- **Build errors**: Run `npm run db:generate`. If needed, delete `.next` and rebuild. Use Node 18+.
- **Empty database**: Delete `prisma/dev.db` (and `prisma/dev.db-journal` if present), run `npm run db:push`, restart app; default user and default categories/locations are recreated on first load.

---

## Security

- No authentication: intended for single-user / local use. Do not expose directly to the internet without access control if the data is sensitive.
- Use HTTPS in production. Back up the database regularly. Keep dependencies updated.

---

## Roadmap Ideas

- Barcode scanning, mobile app, multi-user/sharing, export/import, advanced reporting, external API integrations, automated suggestions, photo upload, inventory templates.

---

## Documentation

- **README.md** — End-user overview and how to use the product.
- **QUICKSTART.md** — Short setup and first steps.
- **PROJECT_SUMMARY.md** — This file (technical reference).
- **ARCHITECTURE.md** — Deeper system architecture if present.
