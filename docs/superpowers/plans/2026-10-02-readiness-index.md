# Readiness index Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Implement the approved app-wide Readiness index design and commit release v0.3.0.

**Architecture:** Keep the existing routes, queries, forms and server calculations. Use semantic CSS tokens and explicit utility replacements throughout the frontend, a shared SVG brand mark, a coverage component, and a pure attention derivation rendered by a dedicated component.

**Tech Stack:** Existing Next.js, React, Tailwind, next-themes, Recharts, Vitest, Playwright; no new dependencies.

**Spec:** `docs/superpowers/specs/2026-10-02-readiness-index-design.md`

## Global Constraints

- No schema, migration, API contract, notification delivery, unit, default goal, or access-model changes.
- Preserve user-defined category colors, all controls and read-only restrictions.
- Food goals use days; water goals use gallons. Missing estimates remain unavailable.
- Expiration uses the existing 30-day policy; low stock requires a positive explicit threshold.
- Browser workflows use a separate disposable local database with synthetic data.
- Commit once at the end as v0.3.0; do not push or deploy.

## Review Focus

- Missing household, zero inventory and absent/invalid goals must not invent coverage or targets (Task 1).
- Item checks duplicated by events merge by item/type, not name; dated rows precede undated low stock (Task 1).
- Long names and narrow screens must wrap without app-wide overflow (Task 4).
- Collapsed navigation, mobile focus management, system theme and dialogs remain usable (Task 4).
- Custom colors and alternate fuel measurements remain available (Tasks 2 and 4).

### Task 1: Coverage and attention behavior

**Files:** Create `src/utils/attention.ts`, `src/utils/attention.test.ts`, `src/components/DashboardMetrics.test.tsx`; modify `src/components/DashboardMetrics.tsx`.
**Interfaces:** Attention consumes existing dashboard item checks/events and filtered low-stock items; produces `deriveAttention(input, now): AttentionCheck[]`. Metrics consumes dashboard stats and optional food-days/water-gallons goals.

- [x] Add failing tests: merge duplicate expiration and maintenance item/event records; retain distinct types and standalone events; 30-day expiration filtering; positive low thresholds; overdue maintenance before future checks; undated low stock last; six-row display handled by renderer.
- [x] Run `npm test -- src/utils/attention.test.ts src/components/DashboardMetrics.test.tsx`; expect new behavior failures.
- [x] Implement pure derivation and coverage band with explicit household/fallback labels, actual goal units, clamped segmented scales, accessible details and secondary fuel/ammo/items.
- [x] Run the focused tests; expect all pass.

### Task 2: Identity and semantic visual system

**Files:** Create `src/components/BrandMark.tsx`, `public/brand-mark.svg`, `public/favicon.svg`; modify `src/styles/globals.css`, `src/app/layout.tsx`, `src/components/Navigation.tsx`, `src/components/ThemeToggle.tsx`, `public/manifest.json`, existing PNG install icons.
**Interfaces:** Semantic tokens provide paper/surface/ink/muted/line/action/caution/danger colors in both themes. Brand uses one stacked-supply P geometry at every size.

- [x] Define opaque warm-neutral/olive palettes, focus treatment, small control radii, ledger and open-section classes.
- [x] Apply solid olive navigation, clear active edge, accessible collapsed labels, mobile shell and bottom controls.
- [x] Generate PNG icons locally from the same SVG geometry, preserving install dimensions; update metadata and manifest colors.
- [x] Verify `npx tsc --noEmit` and focused component tests; expect pass.

### Task 3: Dashboard composition

**Files:** Create `src/components/AttentionList.tsx`; modify `src/app/dashboard/page.tsx`, `src/components/CategoryGoals.tsx`.
**Interfaces:** Uses Task 1 derivation, existing `dashboard.getStats`, `settings.getGoals`, `household.getAll`, `locations.getAll` and `items.getAll({lowInventory:true})`.

- [x] Put coverage first, then attention beside actual storage locations, then open category goal rows and recent activity.
- [x] Limit attention to six rows; label count as returned checks, link Inventory/Calendar and handle query failures separately from empty results.
- [x] Replace empty inventory cards with ordered household → supplies/storage → goals checklist.
- [x] Verify focused tests and TypeScript; expect pass.

### Task 4: App-wide page and overlay treatments

**Files:** Existing `src/app/` pages, `src/components/` forms/tables/settings/overlays, `src/utils/chartTheme.ts`, `src/utils/eventStyles.ts`, their existing tests, `e2e/readiness.spec.ts`.
**Interfaces:** Preserve all existing event handlers, query invalidation, filters, pagination and URLs. Replace explicit hardcoded frontend utility colors with semantic tokens, never globally override Tailwind colors or user category styles.

- [x] Read existing JSX and controls before changing it; apply ledger tables, compact wrapping inventory toolbar, open settings/activity/household layouts and square calendar cells.
- [x] Keep card alternative, real overlay elevation, opaque dialogs, validation and semantic status text; remove decorative headings and generic panel shadows.
- [x] Update chart axes/grid/tooltip theme colors while preserving series differentiation. Update event semantic classes and their meaningful consistency tests.
- [x] Add browser checks for both themes, desktop/mobile overflow, settings keyboard controls, collapsed navigation, theme persistence, coverage details and representative forms.
- [x] Run lint, TypeScript, all Vitest tests, production build and Playwright smoke/accessibility checks against an isolated synthetic database; expect all pass.
- [x] Visually inspect every product page and representative overlays in both themes; iterate on observed defects.

### Task 5: Release and review

**Files:** `package.json`, `package-lock.json`, `CHANGELOG.md`, spec status and this plan.

- [x] Set package/root lock versions to 0.3.0 without dependency changes; document the overhaul and verification.
- [x] Perform one independent whole-change review; fix important findings and rerun relevant checks.
- [x] Check staged diff for secrets/unrelated changes; commit as `feat(release): readiness index overhaul v0.3.0`.
- [x] Report commit, changes, checks and remaining unverified behavior.

## Verification record

Implemented inline on the existing clean feature branch at the user's request. A read-only independent review identified mobile notification geometry, long-name wrapping and dark hover contrast; all were fixed and covered by browser checks. Existing server coverage policies and calendar interactions were retained as required by the spec.

- `DATABASE_URL=file:/tmp/preptrac-unit-unused.db npm test`: 157 tests passed across 20 files; every integration test creates its own temporary database.
- `npm run lint`: passed with 0 errors and 32 existing lint warnings; no warnings were suppressed for this release.
- `npx tsc --noEmit`: passed.
- `DATABASE_URL=<disposable SQLite path> npm run build`: passed.
- `npm run test:e2e -- --workers=2`: 19 passed; the separately run demo test is skipped in the seeded suite.
- `PREPTRAC_E2E_MODE=demo npm run test:e2e -- --grep 'demo mode' --workers=1`: 1 passed.
- Visual inspection: all seven product pages in both themes, representative dialogs, demo banner and mobile shell. Browser checks cover 320px, 1024px, 1440px and 1920px, long unbroken names, system theme and persistence, supply details, hover contrast, settings keys and drawer focus restoration.
- `git diff --check`: passed.

Only Chromium was exercised. Native PWA installation and external notification delivery were not tested; their behavior was not changed. No live data, shared databases or deployments were used. Next dev's generated agent-instruction files were moved to ignored scratch storage and excluded from the release.
