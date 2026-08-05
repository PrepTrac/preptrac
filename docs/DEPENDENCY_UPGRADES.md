# Dependency modernization

PrepTrac's major framework migration was completed together so the application
uses one compatible runtime set:

- Next.js 16 and React 19
- Prisma ORM 7 with the `prisma-client` generator and SQLite driver adapter
- tRPC 11 and TanStack React Query 5
- Zod 4
- Tailwind CSS 4 with the dedicated PostCSS plugin
- Nodemailer 9
- ESLint 9 flat configuration and TypeScript 6

The supported runtime is Node.js 20.19 or newer. CI and Docker use the current
Node 20 release.

## Intentionally pinned tooling

`npm outdated` may report these packages. They are intentionally pinned to the
newest version compatible with the supported runtime/toolchain:

- `eslint@9`: `eslint-plugin-jsx-a11y` currently declares support through ESLint
  9; upgrading to ESLint 10 would create an unsupported peer combination.
- `typescript@6`: Next.js 16's TypeScript ESLint parser currently supports
  TypeScript versions below 6.1, so TypeScript 7 is not yet supported.
- `@testing-library/jest-dom@6`: version 7 requires Node.js 22, while PrepTrac
  supports Node.js 20.
- `@types/node@20`: matches the production and CI runtime rather than describing
  APIs only available in newer Node.js majors.

These are compatibility pins, not security suppressions. Both the full and
production-only `npm audit` reports are currently clean.
