# Changelog

All notable changes to PrepTrac are documented here. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [Unreleased]

- **Household** — Toggle between US (lb, ft/in) and metric (kg, cm) for weight and height. Unit preference is stored in the browser and applies to the family members list and add/edit form; data is still stored in metric.
- **Docs** — Household section and README now explain how **water in days** is calculated from household members (total weight and activity level → daily water need → inventory gallons ÷ daily gallons). In-app Household page and README “Household, Days of Food, and Water in Days” updated accordingly.
- **Inventory** — Low-inventory alerts and webhooks only run when a threshold is set (minQuantity &gt; 0). No default of 10 when threshold is 0 or empty; leave empty or 0 for no threshold alerts.
- **Dashboard** — Fuel/energy total now displays as "generator + battery + solar" kWh; the third view (previously "battery only") is now "battery + solar".
- **Settings** — Fuel/energy goals: the "Battery kWh only" field is now labeled "battery + solar kWh"; Total kWh helper text updated to include solar.
- **Code quality** — Type-safety and validation improvements: replaced `any` with specific types or `unknown` across app, components, server, and utils; removed non-null assertions (`!`) in favor of guards and optional chaining; added Zod `.strict()` to tRPC input schemas (items, events, notifications); derived `BulkItem` from Prisma `Item` in syncItemEvents; Item form now sends date fields as ISO strings to match API contract.
- **Forms** — Required fields (marked with *) now show a red border and error message when the user submits without filling them in. Applies to Item form, Location form, Category form, Settings (webhook URL when enabled), and Household member form (Age, Weight, Height).
- **Item Form** — Unit field is now a dropdown with popular options (gallons, bottles, rounds, kWh, cans, lbs, meals, etc.) plus "Other" for custom units, reducing typos and keeping goal/dashboard matching consistent.
- **Item Form** — Reordered fields in add/edit inventory form: Location and Category now appear before Target Quantity and Low Inventory Threshold.
- **Dashboard** — Fuel/energy widget now defaults to generator + battery (total kWh) view instead of gallons.
- **Settings** — Fuel/energy goals: Total kWh is shown first, above Fuel (gallons), as a read-only computed value (6 kWh/gal × fuel gallons + battery kWh); Fuel and Battery kWh remain editable.

---

## [0.1.1] — 2026-02-07

- **Import/Export** — CSV export and template now use user-friendly columns only (no id, categoryId, locationId, createdAt, updatedAt). Dates are in simple form (e.g. 1/1/2026) instead of ISO timestamps.
- **Dependencies** — Upgraded dependencies; fixed finding for 14.2.35, upgraded to 15.0.8.
- **CI** — Added permissions to GitHub Actions workflow to fix code scanning alert (workflow does not contain permissions).

---

## [0.1.0] — Initial release

- **Dashboard** — Water (gallons/days), fuel & energy (gallons, total kWh, battery kWh), days of food, ammo, total items, upcoming expirations and maintenance, category progress goals, recent activity with filters and pagination.
- **Inventory** — Add/edit items (quantity, unit, calories per unit for food), filter by category/location/expiring/low stock, export to CSV or JSON.
- **Import** — CSV template download and upload; category and location matched by name or ID.
- **Household** — Family members (age, weight, height, sex) for daily calorie estimate and days-of-food calculation.
- **Locations** — View items by location and consumption history; add items to a location.
- **Activity** — Log consume or add; analytics (bar and pie charts) and recent activity list with pagination and filters.
- **Calendar** — Expiration, maintenance, and rotation events; add/edit events.
- **Settings** — Goals (ammo, water, food, fuel gallons/kWh/battery kWh), categories, locations, notifications, test data (fill/remove).
- **Docker** — `docker compose up -d` with persistent SQLite volume; app on port 8008.
- **Docs** — README, QUICKSTART, PROJECT_SUMMARY, ARCHITECTURE, WEBHOOKS.

[Unreleased]: https://github.com/your-username/PrepTrac/compare/v0.1.1...HEAD
[0.1.1]: https://github.com/your-username/PrepTrac/releases/tag/v0.1.1
[0.1.0]: https://github.com/your-username/PrepTrac/releases/tag/v0.1.0


