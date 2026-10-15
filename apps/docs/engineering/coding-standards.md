# Coding Standards

**Project:** SyncBoard

**Version:** 1.0

**Status:** Draft

---

# Purpose

This document defines the coding standards for SyncBoard.

It establishes conventions for language usage, formatting, naming, typing, and code review that all contributors must follow.

Consistent standards reduce cognitive overhead, make code easier to review, and prevent entire categories of bugs before they reach production.

---

# Guiding Principles

- Prefer clarity over cleverness
- Explicit is better than implicit
- Small, focused functions with a single responsibility
- Types are documentation — use them everywhere
- Delete code you do not need

---

# Language

All application code is written in **TypeScript**.

JavaScript is not permitted in application packages.

Configuration files may use JavaScript where TypeScript is not supported by the tooling.

---

# TypeScript Configuration

The base TypeScript configuration enforces:

```json
{
  "strict": true,
  "noUncheckedIndexedAccess": true,
  "isolatedModules": true,
  "moduleResolution": "NodeNext"
}
```

`strict` mode is non-negotiable.

`noUncheckedIndexedAccess` is enabled to prevent silent `undefined` access on arrays and records.

---

# Type Safety

## No `any`

`any` is banned.

Use `unknown` when the type is genuinely unknown, then narrow it.

```ts
// Bad
function parse(input: any) { ... }

// Good
function parse(input: unknown): Result { ... }
```

## No non-null assertions

Avoid `!` non-null assertions.

Prefer explicit guards or optional chaining.

```ts
// Bad
const name = user!.displayName

// Good
const name = user?.displayName ?? "Unknown"
```

## No type casting

Avoid `as` casts unless interfacing with an untyped third-party library.

Every cast must include a comment explaining why it is necessary.

---

# Formatting

Formatting is handled by **Prettier** and is not a matter for manual debate.

Configuration:

```json
{
  "semi": false,
  "singleQuote": false,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 80
}
```

Format on save is expected.

Format is enforced in CI.

---

# Linting

**ESLint** is used across all packages.

The base configuration includes:

- `typescript-eslint` recommended rules
- `eslint-config-prettier` to disable formatting rules
- `eslint-plugin-turbo` for monorepo environment variable safety

All lint warnings are treated as errors in CI (`eslint-plugin-only-warn` surfaces them as warnings locally to preserve developer flow).

---

# Imports

Imports are grouped in the following order:

1. Node built-ins
2. External packages
3. Workspace packages (`@workspace/`)
4. Internal modules (absolute paths)
5. Relative paths

No blank lines between groups are required, but groups must not be mixed.

Do not use default exports from library code in `packages/`.

Named exports are preferred everywhere.

---

# Naming Conventions

| Construct | Convention | Example |
|-----------|------------|---------|
| Variables | camelCase | `incidentId` |
| Functions | camelCase | `createIncident` |
| Classes | PascalCase | `IncidentService` |
| Types / Interfaces | PascalCase | `CreateIncidentInput` |
| Enums | PascalCase | `IncidentStatus` |
| Enum Members | SCREAMING_SNAKE_CASE | `IN_PROGRESS` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_RETRY_COUNT` |
| React Components | PascalCase | `IncidentCard` |
| Files (components) | PascalCase | `IncidentCard.tsx` |
| Files (other) | kebab-case | `create-incident.ts` |
| Directories | kebab-case | `incident-workspace/` |

---

# Functions

Keep functions short and focused.

A function should do one thing.

If a function requires a comment to explain what it does, consider extracting a well-named helper.

Prefer `async`/`await` over raw Promises.

Avoid deeply nested callbacks.

---

# Error Handling

Do not swallow errors silently.

Every `catch` block must either:

- Re-throw the error, or
- Handle it explicitly and log it

```ts
// Bad
try {
  await doSomething()
} catch (_) {}

// Good
try {
  await doSomething()
} catch (error) {
  logger.error({ error }, "doSomething failed")
  throw error
}
```

See the Error Handling document for the full strategy.

---

# Comments

Code should be self-explanatory through naming.

Reserve comments for:

- Why a decision was made (not what the code does)
- Known limitations or future work
- Non-obvious business rules

```ts
// The version field guards against concurrent status updates.
// Do not remove this check — see ADR-05 on optimistic concurrency.
if (incident.version !== input.version) {
  throw new ConflictError("Incident was modified by another user.")
}
```

Do not leave `TODO` comments in merged code without a linked issue.

---

# Validation

All external input is validated using **Zod**.

This applies to:

- REST API request bodies
- Query parameters
- WebSocket event payloads
- Environment variables

Validation occurs before business logic.

Never trust client input.

---

# Environment Variables

Environment variables must be validated at startup using Zod.

```ts
const env = z.object({
  DATABASE_URL: z.url(),
  REDIS_URL: z.url(),
  JWT_PRIVATE_KEY: z.string().min(1),
  JWT_PUBLIC_KEY: z.string().min(1),
  PORT: z.coerce.number().default(4000),
}).parse(process.env)

export { env }
```

Applications crash fast on invalid configuration rather than failing silently at runtime.

Never access `process.env` directly after the startup validation module.

---

# React Conventions

- Functional components only
- Hooks at the top of the component, before any early returns
- One component per file
- Props interfaces are named `[ComponentName]Props`
- Server Components are preferred in Next.js; `"use client"` is added only when interactivity requires it

---

# Git

Branch naming:

```
feat/incident-assignment
fix/presence-disconnect
chore/update-dependencies
docs/adr-websockets
```

Commit messages follow Conventional Commits:

```
feat: add assignment to incident
fix: remove stale presence on disconnect
chore: upgrade socket.io to 4.8
docs: add ADR for WebSocket transport
```

Commits on feature branches can be informal.

Commits merged to `main` must follow the convention.

---

# Code Review

Every pull request requires at least one review before merging.

Reviewers check for:

- Correctness of business logic
- Adequate test coverage
- No missing type annotations
- No `any`, non-null assertions, or unexplained casts
- Consistent naming
- No secrets or environment values committed
- Migrations do not break existing data

Comments marked `nit:` are optional improvements.

Comments without a prefix are required changes.

---

# Summary

These standards exist to keep the SyncBoard codebase consistent, type-safe, and easy to extend as the platform grows.

Tooling enforces formatting and lint rules automatically. The remaining standards require judgment from every contributor who reads and writes code on this project.
