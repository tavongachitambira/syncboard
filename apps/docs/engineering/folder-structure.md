# Folder Structure

**Project:** SyncBoard

**Version:** 1.0

**Status:** Draft

---

# Purpose

This document defines the folder structure of the SyncBoard monorepo.

It explains where each kind of code lives, why it lives there, and what each package and directory is responsible for.

A predictable structure means developers spend less time navigating and more time building.

---

# Repository Layout

```
syncboard/
├── apps/
│   ├── api/
│   ├── docs/
│   ├── socket/
│   └── web/
├── packages/
│   ├── db/
│   ├── eslint-config/
│   ├── shared/
│   ├── typescript-config/
│   └── ui/
├── .github/
├── .eslintrc.js
├── .prettierrc
├── package.json
└── turbo.json
```

---

# Top-Level Directories

## `apps/`

Contains deployable applications.

Each app is independently deployable.

Apps may consume packages but never import from other apps.

---

## `packages/`

Contains shared libraries consumed by apps.

Packages have no runtime of their own.

Packages must not import from `apps/`.

---

## `.github/`

Contains CI/CD pipeline definitions.

```
.github/
└── workflows/
    ├── ci.yml
    └── deploy.yml
```

---

# apps/api

The Express REST API.

```
apps/api/
├── src/
│   ├── config/
│   │   └── env.ts
│   ├── lib/
│   │   ├── logger.ts
│   │   ├── redis.ts
│   │   └── prisma.ts
│   ├── middleware/
│   │   ├── authenticate.ts
│   │   ├── authorize.ts
│   │   ├── error-handler.ts
│   │   ├── rate-limit.ts
│   │   └── validate.ts
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.router.ts
│   │   │   ├── auth.service.ts
│   │   │   └── auth.schema.ts
│   │   ├── incident/
│   │   │   ├── incident.router.ts
│   │   │   ├── incident.service.ts
│   │   │   └── incident.schema.ts
│   │   ├── comment/
│   │   ├── member/
│   │   ├── notification/
│   │   ├── organization/
│   │   └── service/
│   ├── types/
│   │   └── express.d.ts
│   └── index.ts
├── package.json
└── tsconfig.json
```

## Module Structure

Each domain module owns its router, service, and schema.

```
modules/incident/
├── incident.router.ts    — Route definitions and middleware
├── incident.service.ts   — Business logic and database access
└── incident.schema.ts    — Zod validation schemas
```

Routers call services.

Services call the database.

Services do not call other services directly — they dispatch events or return values.

---

# apps/socket

The Socket.IO realtime server.

```
apps/socket/
├── src/
│   ├── config/
│   │   └── env.ts
│   ├── lib/
│   │   ├── logger.ts
│   │   ├── redis.ts
│   │   └── prisma.ts
│   ├── handlers/
│   │   ├── document.handler.ts
│   │   ├── incident.handler.ts
│   │   └── presence.handler.ts
│   ├── middleware/
│   │   └── authenticate.ts
│   ├── rooms/
│   │   └── rooms.ts
│   └── index.ts
├── package.json
└── tsconfig.json
```

Handlers receive socket events and produce broadcasts.

They do not contain business logic.

Business rules live in services, which handlers call.

---

# apps/web

The Next.js frontend.

```
apps/web/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── register/
│   │       └── page.tsx
│   ├── (app)/
│   │   ├── layout.tsx
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   └── incidents/
│   │       ├── page.tsx
│   │       └── [incidentId]/
│   │           └── page.tsx
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ui/              — Primitives from @workspace/ui
│   └── [domain]/        — Feature-specific components
├── features/
│   ├── incident/
│   │   ├── api.ts       — API client functions
│   │   ├── hooks.ts     — React hooks
│   │   ├── types.ts     — Feature-local TypeScript types
│   │   └── components/  — Feature-local components
│   └── presence/
├── hooks/               — Application-wide hooks
├── lib/
│   ├── api.ts           — Axios/fetch client instance
│   └── socket.ts        — Socket.IO client instance
├── store/               — Zustand stores
├── next.config.ts
├── package.json
└── tsconfig.json
```

## Route Groups

`(auth)` — unauthenticated pages (login, register, invite acceptance)

`(app)` — authenticated pages with the application shell

Route groups do not create URL segments.

---

# apps/docs

Project documentation.

```
apps/docs/
├── architecture/
├── product/
└── readme.md
```

Documentation lives inside the repository.

It should be updated whenever the system it describes changes.

---

# packages/db

Prisma schema, migrations, and client.

```
packages/db/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── src/
│   └── index.ts         — Re-exports PrismaClient
├── package.json
└── tsconfig.json
```

All database access across the monorepo imports the client from `@workspace/db`.

Migrations are run as part of the deployment pipeline, never manually against production.

---

# packages/shared

Shared TypeScript types, Zod schemas, and constants.

```
packages/shared/
├── src/
│   ├── events/
│   │   └── index.ts     — Socket.IO event name constants
│   ├── schemas/
│   │   └── index.ts     — Zod schemas shared between apps
│   ├── types/
│   │   └── index.ts     — TypeScript types shared between apps
│   └── index.ts
├── package.json
└── tsconfig.json
```

`packages/shared` is the single source of truth for types that cross the app boundary.

For example, the `Incident` type used in the API response and the frontend are both imported from here.

---

# packages/ui

Shared React component library.

```
packages/ui/
├── src/
│   ├── components/
│   │   ├── button.tsx
│   │   └── ...
│   ├── hooks/
│   ├── lib/
│   │   └── utils.ts
│   └── styles/
│       └── globals.css
├── components.json
├── package.json
└── tsconfig.json
```

Components here are unstyled primitives built on shadcn/ui conventions.

Application-specific layout and feature components live in `apps/web/components/`.

---

# packages/eslint-config

Shared ESLint configurations.

```
packages/eslint-config/
├── base.js
├── next.js
└── react-internal.js
```

Each app and package extends the appropriate config.

---

# packages/typescript-config

Shared TypeScript configurations.

```
packages/typescript-config/
├── base.json
├── nextjs.json
└── react-library.json
```

Each app and package extends the appropriate config.

---

# Naming Rules

Directories use kebab-case.

Files use kebab-case for utilities and PascalCase for React components.

Never use `index.ts` barrel files inside feature folders.

Import directly from the file that exports what you need.

Barrel files are permitted only in `packages/` public entry points.

---

# Dependency Rules

```
apps/web     → packages/ui, packages/shared
apps/api     → packages/db, packages/shared
apps/socket  → packages/db, packages/shared
packages/ui  → (no internal dependencies)
packages/db  → (no internal dependencies)
packages/shared → (no internal dependencies)
```

Apps may not depend on other apps.

Packages may not depend on apps.

Circular dependencies are not permitted.

Turborepo enforces the build order; these rules enforce the architecture.

---

# Summary

The SyncBoard monorepo separates deployable applications from shared libraries. Within each application, modules own their routers, services, and schemas together. Shared types, validation schemas, and event constants live in `packages/shared` to keep the API contract consistent across the full stack.

Following this structure means any new feature has an obvious home, and code review can catch misplaced files before they become harder to move.
