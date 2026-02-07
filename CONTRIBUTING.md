# Contributing to PrepTrac

Thanks for your interest in contributing. PrepTrac is maintained in the open with branches and versioned releases. This guide explains how to propose changes and work with the repo.

---

## Getting started

- **Docs:** [README.md](./README.md) for users, [PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md) for technical setup.
- **Setup:** Clone the repo, then:
  ```bash
  npm install
  cp .env.example .env
  npm run db:push
  npm run dev
  ```
- **Tests:** `npm run test` (Vitest). Add or update tests when changing behavior.
- **Lint:** `npm run lint` (ESLint). Fix any issues in the files you touch.

---

## Branches and workflow

- **`main`** — stable, release-ready code. Default branch.
- **Feature work and fixes** — use a branch, then open a Pull Request into `main`.

**Branch naming:**

- `feature/short-description` — new features (e.g. `feature/barcode-scanning`)
- `fix/short-description` — bug fixes (e.g. `fix/export-empty-inventory`)
- `docs/short-description` — docs-only changes
- `chore/short-description` — tooling, deps, config (e.g. `chore/update-deps`)

---

## Pull requests

1. Create a branch from `main` (pull latest first).
2. Make your changes; keep commits focused and messages clear.
3. Run `npm run lint` and `npm run test` (and `npm run build` if you changed app code).
4. Open a PR into `main`. Describe what changed and why; link any related issue.
5. Address review feedback. Once approved, maintainers will merge.

---

## Issues

- **Bug reports:** Include steps to reproduce, expected vs actual behavior, and environment (Node version, Docker vs local, etc.).
- **Feature ideas:** Describe the use case and how you’d expect it to work. Roadmap ideas are also listed in [PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md).

---

## Version upgrades and releases

- Releases are tagged (e.g. `v0.1.0`, `v0.2.0`). See [CHANGELOG.md](./CHANGELOG.md) for what changed in each version.
- When upgrading to a new version, check the changelog and release notes for new or changed environment variables and migration steps.

---

## License

By contributing, you agree that your contributions will be licensed under the same license as the project: [GNU Affero General Public License v3.0](./LICENSE).
