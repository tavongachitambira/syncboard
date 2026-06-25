# ADR-01: Monorepo with Turborepo

**Project:** SyncBoard

**Version:** 1.0

**Status:** Accepted

**Date:** 2025-01

---

# Context

SyncBoard is composed of multiple applications and shared libraries:

- A Next.js web frontend
- An Express REST API
- A Socket.IO realtime server
- A shared Prisma database package
- A shared TypeScript types package
- A shared React component library

These applications share code: types, validation schemas, UI components, and the Prisma client. Without a shared workspace, this code must either be duplicated or published to a private package registry and versioned manually.

The team consists of a single developer during the MVP phase, with the possibility of expanding. The tooling must minimize overhead while maintaining clear boundaries between concerns.

---

# Decision

SyncBoard uses a **pnpm workspace monorepo** orchestrated by **Turborepo**.

The repository layout:

```
syncboard/
├── apps/
│   ├── api/
│   ├── socket/
│   └── web/
├── packages/
│   ├── db/
│   ├── shared/
│   ├── ui/
│   ├── eslint-config/
│   └── typescript-config/
├── turbo.json
└── package.json
```

Apps consume packages via pnpm workspace protocol:

```json
{
  "dependencies": {
    "@workspace/db": "workspace:*",
    "@workspace/shared": "workspace:*"
  }
}
```

Turborepo manages the build pipeline, caching, and task orchestration:

```json
{
  "pipeline": {
    "build": { "dependsOn": ["^build"], "outputs": [".next/**", "dist/**"] },
    "lint": { "outputs": [] },
    "typecheck": { "outputs": [] },
    "dev": { "persistent": true, "cache": false }
  }
}
```

---

# Alternatives Considered

## Separate Repositories (Polyrepo)

Each app lives in its own repository.

Rejected because:

- Shared code must be published to a registry and versioned separately
- Cross-cutting changes (e.g. renaming a shared type) require coordinated PRs across multiple repositories
- CI pipelines become harder to coordinate
- A single developer context-switches between multiple repository states

## Nx

A more feature-rich monorepo tool with a broader plugin ecosystem.

Rejected because:

- Turborepo is simpler to configure for this use case
- Turborepo has first-class Vercel integration
- Nx's additional features are not needed at this scale

---

# Consequences

**Positive**

- Shared code (types, Prisma client, validation schemas, components) is consumed directly without a publish step
- A single `pnpm install` installs all dependencies
- Turborepo's remote cache speeds up CI significantly once established
- TypeScript changes in `packages/shared` are immediately reflected in all apps
- A single lint, typecheck, and test command covers the entire codebase

**Negative**

- Developers must understand the workspace package resolution model
- pnpm workspace protocol requires pnpm; npm and yarn are not supported
- Turborepo's incremental caching relies on file hashing; non-deterministic build outputs break the cache

---

# Notes

The `eslint-config` and `typescript-config` packages follow the Turborepo starter convention and are consumed by all other packages. This ensures consistent linting and TypeScript settings across the entire repository without duplication.

Apps must never import from other apps. The dependency graph flows in one direction: apps depend on packages, packages do not depend on apps, and packages do not depend on other packages unless necessary.
