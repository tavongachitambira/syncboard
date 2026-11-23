# SyncBoard

A real-time collaborative incident management platform for engineering teams. Create an incident, assign responders, discuss it, move it through its lifecycle to resolution, and keep a complete history of what happened.

> **Status: work in progress.** Authentication and the REST API are in place; the web app currently covers sign-up, sign-in and a dashboard shell. See [What works today](#what-works-today) for the detail and the [documentation](apps/docs/readme.md) for the design and roadmap.

## What works today

- **Authentication.** Email and password sign-up (creating an organization with you as its owner) and sign-in. Short-lived RS256 access tokens and rotating refresh tokens kept in Redis, both delivered as HttpOnly cookies, with refresh-token reuse detection, an `Origin` check on writes, and per-IP rate limiting on sign-up and sign-in.
- **REST API (`/api/v1`).** Organizations, members and invitations, services, incidents (list with filter, search, sort and pagination; create; update; resolve), comments, and an append-only activity log.
- **Authorization.** Role-based access (Owner, Admin, Engineer, Viewer) enforced per route, with every query scoped to the caller's organization. See the [permission matrix](apps/docs/architecture/security-design.md).
- **Optimistic locking.** Incident updates carry a `version`; a stale write is rejected with `409 CONFLICT`.
- **Socket server.** Authenticates the connection from the same cookie, joins the caller to their organization room, and disconnects the socket when its access token expires. Incident-level events are not implemented yet.
- **Web app.** Next.js app with sign-up, sign-in, route protection and a dashboard placeholder.

Not built yet: invitation emails and acceptance, incident assignment endpoints, notifications, collaborative notes (Yjs), and the incident UI.

## Tech stack

| Area      | Technology                                                                     |
| --------- | ------------------------------------------------------------------------------ |
| Web       | Next.js 16 (App Router), React 19, Tailwind CSS v4, shadcn/ui, React Hook Form |
| API       | Express 5, Zod 4, `jose` (JWT), `bcryptjs`, Pino                               |
| Real-time | Socket.IO 4 with the Redis adapter                                             |
| Data      | PostgreSQL via Prisma 7, Redis via `ioredis`                                   |
| Tooling   | TypeScript, pnpm workspaces, Turborepo, ESLint, Prettier                       |

## Repository layout

```
apps/
  web/       Next.js app
  api/       Express REST API
  socket/    Socket.IO server
  docs/      Product, architecture and engineering docs (ADRs, API design, ...)
packages/
  shared/    Zod schemas, types, constants and error codes used by every app
  db/        Prisma schema, migrations, seed script and client factory
  ui/        shadcn/ui components and global styles
  eslint-config/, typescript-config/   shared tooling configuration
```

## Getting started

### Prerequisites

- Node.js 22 or newer
- pnpm (the exact version is pinned in `package.json`)
- PostgreSQL 16 and Redis 7, running locally

### Setup

```bash
pnpm install
```

Create the environment files. Each app validates its variables at startup and exits with a clear message if one is missing or invalid.

```bash
cp apps/api/.env.example apps/api/.env
cp apps/socket/.env.example apps/socket/.env
cp packages/db/.env.example packages/db/.env
```

Generate the RS256 key pair used for access tokens (the private key must be PKCS#8, which is what this command produces):

```bash
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out private.pem
openssl rsa -in private.pem -pubout -out public.pem
awk 'NF {sub(/\r/, ""); printf "%s\\n",$0;}' private.pem   # -> JWT_PRIVATE_KEY in apps/api/.env
awk 'NF {sub(/\r/, ""); printf "%s\\n",$0;}' public.pem    # -> JWT_PUBLIC_KEY in apps/api/.env and apps/socket/.env
```

Set `DATABASE_URL` and `REDIS_URL` for your machine, then create the schema and, optionally, demo data:

```bash
pnpm --filter @workspace/db db:migrate
pnpm --filter @workspace/db db:seed
```

### Run

```bash
pnpm dev
```

| App    | URL                   |
| ------ | --------------------- |
| Web    | http://localhost:3000 |
| API    | http://localhost:4000 |
| Socket | http://localhost:4001 |

After seeding, sign in with any of these (password `password123`): `owner@acme.com`, `admin@acme.com`, `engineer@acme.com`, `viewer@acme.com`.

### Behind a reverse proxy

Set `TRUST_PROXY` in `apps/api/.env` to the number of proxies in front of the API (for example `1`), so per-IP rate limits apply to each client rather than to the proxy. Set `NEXT_PUBLIC_API_URL=/api/v1` for the web app so it calls the API on the same origin.

## Scripts

Run from the repository root.

| Command          | What it does                    |
| ---------------- | ------------------------------- |
| `pnpm dev`       | Start every app in watch mode   |
| `pnpm build`     | Production build (the web app)  |
| `pnpm typecheck` | Type-check every workspace      |
| `pnpm lint`      | Lint the web app and UI package |
| `pnpm format`    | Format with Prettier            |

Database scripts live in `@workspace/db`: `db:migrate`, `db:deploy`, `db:reset`, `db:studio` and `db:seed` (for example `pnpm --filter @workspace/db db:studio`).

## Documentation

Everything from the product vision to the error-handling conventions is in [`apps/docs`](apps/docs/readme.md).
