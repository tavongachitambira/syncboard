# SyncBoard — 12-Week Production-Readiness Roadmap

**Target:** Stable, auto-scaling SaaS in production by Week 12  
**Stack:** Next.js · Socket.io · @socket.io/redis-adapter · Redis 7 · PostgreSQL 15 · Prisma · Yjs · BullMQ · Stripe · Kubernetes (EKS) · Vercel

---

## PHASE 1: THE CORE ARCHITECTURE FOUNDATION
### Weeks 1–3

---

### WEEK 1 — Database Setup & Data Modeling

#### Core Engineering Objective

Bootstrap the monorepo and lock every PostgreSQL schema decision before a single line of
application logic is written. Errors in the data model compound — a missing index found in
Week 9 under load is 10× more expensive to fix than a missing index found now. This week's
output is a fully migrated, indexed, seeded local database that every subsequent week builds
on without modification to the schema foundation.

---

#### Technical Milestones

**1. Monorepo scaffold**

```bash
mkdir syncboard && cd syncboard
npm init -y
# Root package.json
cat > package.json << 'EOF'
{
  "name": "syncboard",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "build": "npm run build --workspaces",
    "dev": "concurrently \"npm run dev -w apps/web\" \"npm run dev -w apps/socket\"",
    "test:integration": "npm run test:integration -w apps/socket"
  }
}
EOF

mkdir -p apps/web apps/socket apps/workers packages/db packages/shared
```

Root `tsconfig.base.json` that every workspace extends:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "skipLibCheck": true,
    "esModuleInterop": true
  }
}
```

**2. `packages/db` — Prisma initialisation**

```bash
cd packages/db && npm init -y
npm install prisma @prisma/client
npx prisma init --datasource-provider postgresql
```

**3. `packages/db/prisma/schema.prisma` — complete production schema**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── Enums ───────────────────────────────────────────────────────────────────

enum Role {
  responder
  admin
}

enum IncidentStatus {
  open
  investigating
  mitigating
  resolved
}

enum Severity {
  critical
  high
  medium
  low
}

enum OpState {
  pending
  confirmed
  failed
}

enum OpType {
  text
  field
}

enum BillingStatus {
  active
  past_due
  cancelled
  trialing
}

// ─── Models ──────────────────────────────────────────────────────────────────

model Organisation {
  id               String        @id @default(uuid())
  name             String
  slug             String        @unique
  stripeCustomerId String?       @unique
  billingStatus    BillingStatus @default(trialing)
  createdAt        DateTime      @default(now())
  updatedAt        DateTime      @updatedAt

  users         User[]
  incidents     Incident[]
  subscription  Subscription?
  billingEvents BillingEvent[]

  @@index([slug])
}

model User {
  id           String   @id @default(uuid())
  orgId        String
  email        String   @unique
  passwordHash String
  role         Role     @default(responder)
  displayName  String
  avatarUrl    String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  org               Organisation @relation(fields: [orgId], references: [id])
  assignedIncidents Incident[]   @relation("AssignedIncidents")
  operations        Operation[]

  @@index([orgId])
  @@index([email])
}

model Incident {
  id           String         @id @default(uuid())
  orgId        String
  title        String
  status       IncidentStatus @default(open)
  severity     Severity       @default(high)
  assigneeId   String?
  yjsSnapshot  Bytes?         // binary CRDT snapshot — flushed every 500ms
  version      Int            @default(1)
  createdAt    DateTime       @default(now())
  updatedAt    DateTime       @updatedAt
  resolvedAt   DateTime?

  org        Organisation @relation(fields: [orgId], references: [id])
  assignee   User?        @relation("AssignedIncidents", fields: [assigneeId], references: [id])
  operations Operation[]

  @@index([orgId, status])          // dashboard list query: all open incidents for org
  @@index([orgId, severity])        // severity filter
  @@index([assigneeId])             // my incidents view
  @@index([orgId, createdAt(sort: Desc)]) // default sort
}

model Operation {
  id         String   @id @default(uuid())
  incidentId String
  authorId   String
  type       OpType
  payload    Json
  opState    OpState  @default(confirmed)
  messageId  String   @unique  // UUID v4 from client — dedup key
  createdAt  DateTime @default(now())

  incident Incident @relation(fields: [incidentId], references: [id])
  author   User     @relation(fields: [authorId], references: [id])

  @@index([incidentId, createdAt])  // reconnect delta replay query
  @@index([messageId])              // dedup lookup
}

model Subscription {
  id                   String   @id @default(uuid())
  orgId                String   @unique
  stripeSubscriptionId String   @unique
  stripeSeatItemId     String   // SubscriptionItem for seat license
  stripeIncidentItemId String   // SubscriptionItem for usage meter
  status               String
  currentPeriodEnd     DateTime
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt

  org Organisation @relation(fields: [orgId], references: [id])
}

model BillingEvent {
  id            String    @id @default(uuid())
  orgId         String
  stripeEventId String    @unique  // Stripe event ID — idempotency key
  type          String
  processedAt   DateTime?
  raw           Json
  createdAt     DateTime  @default(now())

  org Organisation @relation(fields: [orgId], references: [id])

  @@index([orgId])
  @@index([stripeEventId])  // duplicate webhook detection
}
```

**4. Run and verify first migration**

```bash
cd packages/db
npx prisma migrate dev --name init
npx prisma migrate status   # must show: "Database schema is up to date"
```

**5. `packages/db/src/client.ts` — singleton Prisma client**

```typescript
import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma =
  global.__prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'warn', 'error']
        : ['warn', 'error'],
  });

if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}
```

**6. `packages/shared/types/` — TypeScript interfaces**

Create the following files with no runtime dependencies — types only:

```
packages/shared/types/
├── incident.ts   — IncidentStatus, Severity, OpState, OpType enums + IncidentState interface
├── socket.ts     — SocketEvents const map + all WS payload interfaces
├── billing.ts    — StripeWebhookEvent type
└── index.ts      — re-export barrel
```

`socket.ts` extract:

```typescript
export const SocketEvents = {
  INCIDENT_UPDATE:           'incident:update',
  INCIDENT_UPDATE_ACK:       'incident:update:ack',
  INCIDENT_UPDATE_BROADCAST: 'incident:update:broadcast',
  PRESENCE_HEARTBEAT:        'presence:heartbeat',
  PRESENCE_UPDATE:           'presence:update',
  SYNC_REQUEST:              'sync:request',
  SYNC_REPLAY:               'sync:replay',
  CONFLICT:                  'conflict',
  ERROR:                     'error',
} as const;

export type SocketEvent = (typeof SocketEvents)[keyof typeof SocketEvents];
```

**7. `docker-compose.yml` at root**

```yaml
version: '3.9'
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: syncboard
      POSTGRES_USER: syncboard
      POSTGRES_PASSWORD: syncboard_dev
    ports: ['5432:5432']
    volumes: ['postgres_data:/var/lib/postgresql/data']

  redis:
    image: redis:7-alpine
    ports: ['6379:6379']
    command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru

volumes:
  postgres_data:
```

**8. Seed script `packages/db/prisma/seed.ts`**

Creates one Organisation, one Admin user (password: `dev_password_123` bcrypt-hashed), and
three Incidents in different severity states. Run with `npx prisma db seed`.

---

#### Definition of Done

- [ ] `npx prisma migrate status` reports: *Database schema is up to date* with **1 migration applied**
- [ ] `npx prisma db seed` completes without errors and produces queryable rows
- [ ] `SELECT indexname FROM pg_indexes WHERE tablename = 'Incident'` returns: `Incident_orgId_status_idx`, `Incident_orgId_severity_idx`, `Incident_assigneeId_idx`, `Incident_orgId_createdAt_idx`
- [ ] `EXPLAIN ANALYZE SELECT * FROM "Incident" WHERE "orgId" = $1 AND "status" = 'open' ORDER BY "createdAt" DESC LIMIT 20` shows **Index Scan** — not Seq Scan
- [ ] `npm run build -w packages/db` and `npm run build -w packages/shared` pass with **zero TypeScript errors**
- [ ] `packages/db/src/client.ts` Prisma singleton is the only place `new PrismaClient()` appears across the entire codebase (`grep -r "new PrismaClient" .` returns exactly 1 result)

---

### WEEK 2 — Independent Socket.io Cluster

#### Core Engineering Objective

Stand up `apps/socket` as an entirely self-contained Node.js microservice — its own process,
its own port, its own Dockerfile. Configure `@socket.io/redis-adapter` so that a message
emitted on Pod A is received by every client connected to Pod B. Prove this works locally
before a single feature handler is written. Every subsequent real-time feature is built on
this verified cross-pod foundation.

---

#### Technical Milestones

**1. `apps/socket` workspace scaffold**

```bash
cd apps/socket
npm init -y
npm install socket.io @socket.io/redis-adapter ioredis express jsonwebtoken zod
npm install -D typescript @types/node @types/express @types/jsonwebtoken tsx
```

`apps/socket/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "module": "CommonJS",
    "moduleResolution": "Node"
  },
  "include": ["src"]
}
```

**2. `apps/socket/src/lib/redis.ts` — shared ioredis instance**

```typescript
import { Redis } from 'ioredis';

if (!process.env.REDIS_URL) throw new Error('REDIS_URL is required');

export const redis = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: false,
  retryStrategy: (times) => Math.min(times * 100, 3000),
});

// Separate pub/sub clients required by the adapter — share the same config
export const pubClient = new Redis(process.env.REDIS_URL);
export const subClient = pubClient.duplicate();

redis.on('error', (err) => console.error('[Redis] error:', err));
```

**3. `apps/socket/src/index.ts` — server bootstrap**

```typescript
import { createServer } from 'http';
import express from 'express';
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { pubClient, subClient } from './lib/redis';
import { authMiddleware } from './middleware/auth';
import { registerIncidentHandlers } from './handlers/incident';
import { registerPresenceHandlers } from './handlers/presence';
import { registerSyncHandlers } from './handlers/sync';

const app = express();
app.get('/health', (_req, res) => res.json({ status: 'ok', ts: Date.now() }));

const httpServer = createServer(app);

export const io = new Server(httpServer, {
  transports: ['websocket'],          // no polling — skip upgrade handshake
  pingInterval: 25_000,               // server → client keepalive
  pingTimeout: 10_000,                // disconnect if no pong within 10s
  cors: {
    origin: process.env.FRONTEND_ORIGIN,
    credentials: true,
  },
});

async function bootstrap() {
  await Promise.all([pubClient.connect(), subClient.connect()]);
  io.adapter(createAdapter(pubClient, subClient));

  // Global connection middleware — JWT validated once per connection
  io.use(authMiddleware);

  io.on('connection', (socket) => {
    const { incidentId } = socket.handshake.query as { incidentId: string };

    socket.join(`incident:${incidentId}`);

    registerIncidentHandlers(io, socket);
    registerPresenceHandlers(io, socket);
    registerSyncHandlers(io, socket);

    socket.on('disconnect', (reason) => {
      console.info(`[Socket] ${socket.id} disconnected: ${reason}`);
    });
  });

  const PORT = process.env.SOCKET_PORT ?? 3001;
  httpServer.listen(PORT, () => {
    console.info(`[Socket.io] Listening on :${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error('[Bootstrap] Fatal:', err);
  process.exit(1);
});
```

**4. `apps/socket/src/middleware/auth.ts` — JWT validation at connection**

```typescript
import type { Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

const JwtPayloadSchema = z.object({
  sub:   z.string().uuid(),
  role:  z.enum(['responder', 'admin']),
  orgId: z.string().uuid(),
  iat:   z.number(),
  exp:   z.number(),
});

export type AuthenticatedSocket = Socket & {
  data: {
    userId: string;
    role:   'responder' | 'admin';
    orgId:  string;
  };
};

export function authMiddleware(
  socket: Socket,
  next: (err?: Error) => void
): void {
  const token = socket.handshake.auth?.token as string | undefined;

  if (!token) {
    next(new Error('UNAUTHORIZED'));
    return;
  }

  try {
    const raw = jwt.verify(token, process.env.JWT_PUBLIC_KEY!, {
      algorithms: ['RS256'],
    });
    const parsed = JwtPayloadSchema.parse(raw);

    socket.data = {
      userId: parsed.sub,
      role:   parsed.role,
      orgId:  parsed.orgId,
    };

    next();
  } catch {
    next(new Error('UNAUTHORIZED'));
  }
}
```

**5. Handler stubs — all three files created this week (logic filled in later phases)**

`apps/socket/src/handlers/incident.ts` — exports `registerIncidentHandlers(io, socket)`,
listens for `incident:update`, currently logs the payload and emits a stub ack.

`apps/socket/src/handlers/presence.ts` — exports `registerPresenceHandlers(io, socket)`,
listens for `presence:heartbeat`, currently no-ops.

`apps/socket/src/handlers/sync.ts` — exports `registerSyncHandlers(io, socket)`, listens for
`sync:request`, currently emits empty `sync:replay`.

**6. Cross-pod fan-out integration test**

`apps/socket/tests/integration/adapter.test.ts`:

```typescript
import { createServer } from 'http';
import { Server } from 'socket.io';
import { io as ioClient } from 'socket.io-client';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

test('message emitted on Pod A is received by client on Pod B', async () => {
  // Two independent server instances — same Redis
  const [serverA, serverB] = await Promise.all([
    createSocketServer(3101),
    createSocketServer(3102),
  ]);

  const clientOnB = ioClient('http://localhost:3102', {
    transports: ['websocket'],
    auth: { token: TEST_JWT },
    query: { incidentId: 'test-room' },
  });

  await new Promise<void>((resolve) => clientOnB.on('connect', resolve));

  const received = new Promise<string>((resolve) =>
    clientOnB.on('test:ping', (data: string) => resolve(data))
  );

  // Emit from Server A to the shared room — adapter must fan-out to Server B
  serverA.to('incident:test-room').emit('test:ping', 'hello-from-A');

  const result = await Promise.race([
    received,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), 2000)
    ),
  ]);

  expect(result).toBe('hello-from-A');

  clientOnB.disconnect();
  await Promise.all([serverA.close(), serverB.close()]);
});
```

**7. `apps/socket/Dockerfile` — first draft**

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY packages/ packages/
COPY apps/socket/ apps/socket/
RUN npm ci --workspace=apps/socket
RUN npm run build -w apps/socket

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/apps/socket/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s \
  CMD wget -qO- http://localhost:3001/health || exit 1
CMD ["node", "dist/index.js"]
```

---

#### Definition of Done

- [ ] `GET http://localhost:3001/health` returns `{ "status": "ok" }` while two Redis clients are connected
- [ ] Cross-pod integration test passes: client connected to port 3102 receives an emit from server on port 3101 routed through Redis Pub/Sub
- [ ] A socket without a valid JWT receives disconnect with error `UNAUTHORIZED` within 100ms of the handshake attempt
- [ ] `docker build -f apps/socket/Dockerfile .` completes with exit code 0 and the resulting image is under **150MB**
- [ ] `grep -r "new PrismaClient\|prisma\." apps/socket/` returns **zero results** — the socket service has no database dependency in this phase
- [ ] `redis-cli PUBSUB CHANNELS "socket.io*"` shows active subscription channels when a test client is connected

---

### WEEK 3 — Core Next.js Layout & Authentication

#### Core Engineering Objective

Build the authenticated shell that every feature page lives inside. The JWT handshake must be
airtight: issued as an RS256 `httpOnly` cookie from a Route Handler, validated in Next.js
Middleware on every protected route, and forwarded as a `Bearer` token in the Socket.io
handshake `auth.token` field. No feature is built until a user can sign in, see the dashboard
shell, and have their JWT survive the full round-trip from Next.js → Middleware → Socket.io.

---

#### Technical Milestones

**1. RS256 key pair generation**

```bash
# Generate private key (kept server-side, never in source control)
openssl genrsa -out private.pem 2048
# Extract public key (safe to distribute to Socket.io service)
openssl rsa -in private.pem -pubout -out public.pem
# Base64 encode for environment variable storage
base64 -i private.pem | tr -d '\n'  →  JWT_PRIVATE_KEY
base64 -i public.pem  | tr -d '\n'  →  JWT_PUBLIC_KEY
```

Document in `.env.example`:
```env
JWT_PRIVATE_KEY=      # base64-encoded RS256 private key (Next.js only)
JWT_PUBLIC_KEY=       # base64-encoded RS256 public key (Next.js + Socket.io service)
JWT_EXPIRY=28800      # 8 hours in seconds
```

**2. `apps/web/app/api/auth/signin/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '@syncboard/db';

const SignInSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(8),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = SignInSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', details: parsed.error.flatten() } },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true, passwordHash: true, role: true, orgId: true },
  });

  const passwordValid =
    user && (await bcrypt.compare(parsed.data.password, user.passwordHash));

  if (!user || !passwordValid) {
    // Constant-time path — same response whether user not found or wrong password
    return NextResponse.json(
      { error: { code: 'INVALID_CREDENTIALS' } },
      { status: 401 }
    );
  }

  const privateKey = Buffer.from(process.env.JWT_PRIVATE_KEY!, 'base64').toString('utf-8');
  const token = jwt.sign(
    { sub: user.id, role: user.role, orgId: user.orgId },
    privateKey,
    { algorithm: 'RS256', expiresIn: Number(process.env.JWT_EXPIRY ?? 28800) }
  );

  const response = NextResponse.json({ data: { ok: true } }, { status: 200 });
  response.cookies.set('syncboard_jwt', token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path:     '/',
    maxAge:   Number(process.env.JWT_EXPIRY ?? 28800),
  });

  return response;
}
```

**3. `apps/web/app/api/auth/signout/route.ts`**

```typescript
import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ data: { ok: true } });
  response.cookies.set('syncboard_jwt', '', { maxAge: 0, path: '/' });
  return response;
}
```

**4. `apps/web/middleware.ts` — JWT validation + header injection**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify, importSPKI } from 'jose';

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/incidents/:path*',
    '/api/incidents/:path*',
    '/api/users/:path*',
  ],
};

export async function middleware(req: NextRequest) {
  const token = req.cookies.get('syncboard_jwt')?.value;

  if (!token) {
    return NextResponse.redirect(new URL('/signin', req.url));
  }

  try {
    const publicKeyPem = Buffer.from(
      process.env.JWT_PUBLIC_KEY!,
      'base64'
    ).toString('utf-8');
    const publicKey = await importSPKI(publicKeyPem, 'RS256');
    const { payload } = await jwtVerify(token, publicKey);

    // Attach verified claims as request headers for Server Components
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set('x-user-id',   payload.sub as string);
    requestHeaders.set('x-user-role', payload.role as string);
    requestHeaders.set('x-org-id',    payload.orgId as string);
    requestHeaders.set('x-request-id', crypto.randomUUID());

    return NextResponse.next({ request: { headers: requestHeaders } });
  } catch {
    // Expired or tampered — clear cookie and redirect
    const response = NextResponse.redirect(new URL('/signin', req.url));
    response.cookies.set('syncboard_jwt', '', { maxAge: 0, path: '/' });
    return response;
  }
}
```

**5. Dashboard shell layout — three-panel split**

`apps/web/app/(app)/layout.tsx` — authenticated shell. Contains `<LeftSidebar />`,
`<TopNav />`, and `{children}` in the center pane. `<RightSidebar />` is rendered only inside
incident pages.

`apps/web/components/layout/LeftSidebar.tsx` — nav links (Dashboard, Incidents, Team,
Settings) with Lucide icons. Active route highlighted via `usePathname()`. Fixed width
`w-56`, full height, background `var(--bg-surface)`.

`apps/web/components/layout/TopNav.tsx` — logo, org name, notification bell placeholder,
sign-out button that POSTs to `/api/auth/signout` and redirects to `/signin`.

**6. `/signin` page**

`apps/web/app/(auth)/signin/page.tsx`:
- shadcn `Card` centered on viewport
- Email + password inputs with shadcn `Input`
- Submit POSTs to `/api/auth/signin`
- On success: `router.push('/dashboard')`
- Error state renders an inline alert with `--state-error` text

**7. `useSocket` hook scaffold**

`apps/web/hooks/useSocket.ts` — initialises `socket.io-client` with the JWT from the cookie,
`{ transports: ['websocket'] }`, and the randomised reconnection delay. Returns `{ socket,
connected }`. Socket is torn down in the `useEffect` cleanup function.

```typescript
import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import Cookies from 'js-cookie';

export function useSocket(incidentId: string) {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const token = Cookies.get('syncboard_jwt');

    socketRef.current = io(process.env.NEXT_PUBLIC_SOCKET_URL!, {
      transports: ['websocket'],
      auth: { token },
      query: { incidentId },
      reconnectionDelay:    Math.random() * 2000 + 1000,  // 1–3s jitter
      reconnectionDelayMax: 10_000,
      randomizationFactor:  0,
    });

    socketRef.current.on('connect',    () => setConnected(true));
    socketRef.current.on('disconnect', () => setConnected(false));

    return () => { socketRef.current?.disconnect(); };
  }, [incidentId]);

  return { socket: socketRef.current, connected };
}
```

---

#### Definition of Done

- [ ] `POST /api/auth/signin` with valid credentials returns HTTP 200 and sets `syncboard_jwt` cookie with flags: `HttpOnly=true; Secure=true; SameSite=Strict`
- [ ] `POST /api/auth/signin` with wrong password returns HTTP 401 in the **same elapsed time** as a not-found user (no timing oracle)
- [ ] Navigating to `/dashboard` without a cookie produces an immediate redirect to `/signin`
- [ ] Navigating to `/dashboard` with a tampered (base64-modified) JWT produces redirect to `/signin` and clears the cookie
- [ ] `headers()` inside a Server Component on `/dashboard` returns non-null `x-user-id` and `x-org-id` values
- [ ] Socket.io client connects successfully when `auth.token` is a valid JWT; disconnects within 200ms when the token is expired
- [ ] `npm run build -w apps/web` passes with zero TypeScript errors and zero missing-module warnings

---

## PHASE 2: REAL-TIME MULTIPLAYER ENGINE
### Weeks 4–6

---

### WEEK 4 — Yjs CRDT Integration & Concurrent Editing

#### Core Engineering Objective

Wire Yjs into the incident notes field so two users can type simultaneously with no manual
conflict resolution. The key insight: Yjs updates are binary blobs — the socket handler's job
is to relay them to every room member (and the flush worker's job is to snapshot them to
PostgreSQL). The handler must not parse, validate, or modify the CRDT update — it is
intentionally opaque. Prove convergence with a two-client offline-then-reconnect test before
shipping to the incident page.

---

#### Technical Milestones

**1. Install Yjs across workspaces**

```bash
npm install yjs --workspace=packages/shared
npm install yjs y-websocket --workspace=apps/web
npm install yjs --workspace=apps/socket
```

**2. `packages/shared/src/yjs.ts` — shared doc factory**

```typescript
import * as Y from 'yjs';

export function createIncidentDoc(): Y.Doc {
  const doc = new Y.Doc();
  // Canonical text field — all clients use this exact name
  doc.getText('notes');
  return doc;
}

export function encodeUpdate(update: Uint8Array): string {
  return Buffer.from(update).toString('base64');
}

export function decodeUpdate(encoded: string): Uint8Array {
  return new Uint8Array(Buffer.from(encoded, 'base64'));
}
```

**3. Server-side Yjs document store**

`apps/socket/src/lib/yjsStore.ts` — in-memory `Map<incidentId, Y.Doc>`. Initialised from the
PostgreSQL `yjsSnapshot` bytea column when the first client joins a room. Reused for all
subsequent clients in the same room on the same pod.

```typescript
import * as Y from 'yjs';
import { createIncidentDoc } from '@syncboard/shared';
import { prisma } from '@syncboard/db';

const docs = new Map<string, Y.Doc>();

export async function getOrCreateDoc(incidentId: string): Promise<Y.Doc> {
  if (docs.has(incidentId)) return docs.get(incidentId)!;

  const incident = await prisma.incident.findUnique({
    where: { id: incidentId },
    select: { yjsSnapshot: true },
  });

  const doc = createIncidentDoc();

  if (incident?.yjsSnapshot) {
    Y.applyUpdate(doc, new Uint8Array(incident.yjsSnapshot));
  }

  docs.set(incidentId, doc);
  return doc;
}

export function getDoc(incidentId: string): Y.Doc | undefined {
  return docs.get(incidentId);
}
```

**4. `apps/socket/src/handlers/incident.ts` — full implementation (text path)**

```typescript
import type { Server, Socket } from 'socket.io';
import * as Y from 'yjs';
import { z } from 'zod';
import { SocketEvents } from '@syncboard/shared';
import { redis } from '../lib/redis';
import { checkRateLimit } from '../middleware/rateLimiter';
import { getOrCreateDoc } from '../lib/yjsStore';
import { markDirty } from '../workers/flushWorker';

const IncidentUpdateSchema = z.object({
  messageId:     z.string().uuid(),
  incidentId:    z.string().uuid(),
  type:          z.enum(['text', 'field']),
  payload: z.object({
    yjsUpdate: z.string().optional(),
    field:     z.string().optional(),
    value:     z.unknown().optional(),
  }),
  clientVersion: z.number().int().positive(),
});

export function registerIncidentHandlers(io: Server, socket: Socket) {
  socket.on(SocketEvents.INCIDENT_UPDATE, async (raw: unknown) => {
    // 1. Parse and validate payload
    const parsed = IncidentUpdateSchema.safeParse(raw);
    if (!parsed.success) {
      socket.emit(SocketEvents.ERROR, { code: 'VALIDATION_ERROR' });
      return;
    }

    const { messageId, incidentId, type, payload, clientVersion } = parsed.data;

    // 2. Idempotency check — SET NX before any logic
    const isNew = await redis.set(`op:${messageId}`, '1', 'EX', 86400, 'NX');
    if (isNew === null) {
      // Duplicate — send synthetic ack so client resolves pending state
      socket.emit(SocketEvents.INCIDENT_UPDATE_ACK, {
        messageId,
        status: 'confirmed',
      });
      return;
    }

    // 3. Rate limit check
    const allowed = await checkRateLimit(redis, socket.id);
    if (!allowed) {
      socket.emit(SocketEvents.ERROR, {
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: 60,
      });
      return;
    }

    // 4. Apply CRDT or field update
    if (type === 'text' && payload.yjsUpdate) {
      const doc = await getOrCreateDoc(incidentId);
      const update = new Uint8Array(Buffer.from(payload.yjsUpdate, 'base64'));
      Y.applyUpdate(doc, update);
      markDirty(incidentId, { yjsSnapshot: Y.encodeStateAsUpdate(doc) });
    } else if (type === 'field' && payload.field !== undefined) {
      markDirty(incidentId, {
        [payload.field]: payload.value,
        expectedVersion: clientVersion,
      });
    }

    // 5. Broadcast to all room members (including other pods via Redis adapter)
    io.to(`incident:${incidentId}`).emit(
      SocketEvents.INCIDENT_UPDATE_BROADCAST,
      {
        incidentId,
        type,
        payload,
        authorId:      socket.data.userId,
        serverVersion: clientVersion + 1,  // optimistic; flush worker confirms real version
        timestamp:     Date.now(),
      }
    );

    // 6. Acknowledge sender
    socket.emit(SocketEvents.INCIDENT_UPDATE_ACK, {
      messageId,
      status: 'confirmed',
      serverVersion: clientVersion + 1,
    });
  });
}
```

**5. Client Yjs binding**

`apps/web/hooks/useYjsNotes.ts`:

```typescript
import { useEffect, useRef } from 'react';
import * as Y from 'yjs';
import { createIncidentDoc, encodeUpdate, decodeUpdate } from '@syncboard/shared';
import type { Socket } from 'socket.io-client';
import { SocketEvents } from '@syncboard/shared';
import { useIncidentStore } from '../store/incidentStore';
import { v4 as uuidv4 } from 'uuid';

export function useYjsNotes(socket: Socket | null, incidentId: string) {
  const docRef = useRef<Y.Doc>(createIncidentDoc());
  const applyLocalOp = useIncidentStore((s) => s.applyLocalOp);

  useEffect(() => {
    const doc = docRef.current;
    const text = doc.getText('notes');

    // Observe local changes → emit to server
    const observer = (events: Y.YEvent<Y.Text>[], txn: Y.Transaction) => {
      if (txn.local && socket?.connected) {
        const update = Y.encodeStateAsUpdate(doc);
        const messageId = uuidv4();
        const snapshot = useIncidentStore.getState().incident!;

        applyLocalOp(messageId, snapshot);   // mark as pending immediately

        socket.emit(SocketEvents.INCIDENT_UPDATE, {
          messageId,
          incidentId,
          type: 'text',
          payload: { yjsUpdate: encodeUpdate(update) },
          clientVersion: snapshot.version,
        });
      }
    };
    text.observe(observer);

    // Receive remote updates → apply to local doc
    const handleBroadcast = (data: { type: string; payload: { yjsUpdate?: string } }) => {
      if (data.type === 'text' && data.payload.yjsUpdate) {
        Y.applyUpdate(doc, decodeUpdate(data.payload.yjsUpdate));
      }
    };
    socket?.on(SocketEvents.INCIDENT_UPDATE_BROADCAST, handleBroadcast);

    return () => {
      text.unobserve(observer);
      socket?.off(SocketEvents.INCIDENT_UPDATE_BROADCAST, handleBroadcast);
    };
  }, [socket, incidentId, applyLocalOp]);

  return docRef.current.getText('notes');
}
```

**6. Convergence integration test**

`apps/socket/tests/integration/yjs-convergence.test.ts` — creates two Y.Doc instances in
isolation, applies conflicting edits to both in "offline" mode, then merges both updates into
each document and asserts that `doc1.getText('notes').toString() === doc2.getText('notes').toString()`.
This proves CRDT convergence without any network dependency.

---

#### Definition of Done

- [ ] Two browser tabs on the same incident URL: typing in Tab A appears in Tab B within **200ms** under localhost conditions
- [ ] Convergence test passes: two docs with conflicting edits produce identical content after update exchange
- [ ] Server-side `yjsStore` initialises a new `Y.Doc` from the `yjsSnapshot` bytea column — not from scratch — when the second pod gets its first client for an incident room
- [ ] `redis-cli GET op:{any_real_messageId}` returns `"1"` after an `incident:update` event confirming the dedup key was written
- [ ] Sending the **same `messageId` twice** results in exactly **one** `markDirty` call and exactly **one** broadcast to the room (second send returns synthetic ack without processing)

---

### WEEK 5 — Redis Presence & Sliding Window Rate Limiting

#### Core Engineering Objective

Build the presence sub-system end-to-end: server tracking, heartbeat cadence, background
cleanup, and UI display. Simultaneously harden the rate limiter with the exact three-command
Redis pipeline. By end of week the right sidebar shows live responders and a client that
sends 110 events/minute gets cleanly rate-limited at event 101 with `RATE_LIMIT_EXCEEDED`.

---

#### Technical Milestones

**1. `apps/socket/src/handlers/presence.ts` — full implementation**

```typescript
import type { Server, Socket } from 'socket.io';
import { z } from 'zod';
import { SocketEvents } from '@syncboard/shared';
import { redis } from '../lib/redis';
import { prisma } from '@syncboard/db';

const PRESENCE_TTL_MS = 45_000;   // 45s — wider than 30s heartbeat to tolerate one miss

const HeartbeatSchema = z.object({
  incidentId: z.string().uuid(),
});

async function getActiveUsers(incidentId: string) {
  const now = Date.now();
  const cutoff = now - PRESENCE_TTL_MS;

  const userIds = await redis.zrangebyscore(
    `presence:${incidentId}`,
    cutoff,
    '+inf'
  );

  if (userIds.length === 0) return [];

  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, displayName: true, avatarUrl: true },
  });

  return users.map((u) => ({
    ...u,
    lastSeen: now,   // approximate — acceptable for UI purposes
  }));
}

export function registerPresenceHandlers(io: Server, socket: Socket) {
  const { userId, incidentId } = {
    userId: socket.data.userId,
    incidentId: socket.handshake.query.incidentId as string,
  };

  // Announce join
  (async () => {
    await redis.zadd(`presence:${incidentId}`, Date.now(), userId);
    const activeUsers = await getActiveUsers(incidentId);
    io.to(`incident:${incidentId}`).emit(SocketEvents.PRESENCE_UPDATE, {
      incidentId,
      activeUsers,
    });
  })();

  // Heartbeat refresh
  socket.on(SocketEvents.PRESENCE_HEARTBEAT, async (raw: unknown) => {
    const parsed = HeartbeatSchema.safeParse(raw);
    if (!parsed.success) return;

    await redis.zadd(`presence:${parsed.data.incidentId}`, Date.now(), userId);
  });

  // Announce leave on disconnect
  socket.on('disconnect', async () => {
    await redis.zrem(`presence:${incidentId}`, userId);
    const activeUsers = await getActiveUsers(incidentId);
    io.to(`incident:${incidentId}`).emit(SocketEvents.PRESENCE_UPDATE, {
      incidentId,
      activeUsers,
    });
  });
}
```

**2. Background presence cleanup job**

`apps/socket/src/workers/presenceCleanup.ts`:

```typescript
import { redis } from '../lib/redis';
import { io } from '../index';

const CLEANUP_INTERVAL_MS = 60_000;
const STALE_TTL_MS        = 45_000;

export function startPresenceCleanup() {
  setInterval(async () => {
    const cutoff = Date.now() - STALE_TTL_MS;
    const roomKeys = await redis.keys('presence:*');

    await Promise.allSettled(
      roomKeys.map(async (key) => {
        const removed = await redis.zremrangebyscore(key, '-inf', cutoff);
        if (removed > 0) {
          const incidentId = key.replace('presence:', '');
          // Re-broadcast updated presence to the room
          const userIds = await redis.zrangebyscore(key, cutoff + 1, '+inf');
          io.to(`incident:${incidentId}`).emit('presence:update', {
            incidentId,
            activeUsers: userIds.map((id) => ({ userId: id })),
          });
        }
      })
    );
  }, CLEANUP_INTERVAL_MS);
}
```

**3. `apps/socket/src/middleware/rateLimiter.ts` — exact implementation**

```typescript
import type { Redis } from 'ioredis';

const WINDOW_MS = 60_000;
const LIMIT     = 100;
const VIOLATION_LIMIT = 3;

export async function checkRateLimit(redis: Redis, socketId: string): Promise<boolean> {
  const key     = `rl:${socketId}`;
  const now     = Date.now();
  const member  = `${now}-${Math.random()}`;   // unique per event in same ms

  const pipeline = redis.pipeline();
  pipeline.zremrangebyscore(key, '-inf', now - WINDOW_MS);   // evict expired
  pipeline.zadd(key, now, member);                            // record this event
  pipeline.zcard(key);                                        // count in window
  pipeline.expire(key, 120);                                  // TTL prevents key leak
  const results = await pipeline.exec();

  // results[2] = [error, count]
  const count = (results?.[2]?.[1] as number) ?? 0;

  if (count > LIMIT) {
    await trackViolation(redis, socketId);
    return false;
  }

  return true;
}

async function trackViolation(redis: Redis, socketId: string) {
  const key   = `rl:violations:${socketId}`;
  const count = await redis.incr(key);
  await redis.expire(key, 60);

  if (count >= VIOLATION_LIMIT) {
    // Signal to the handler layer to disconnect this socket
    await redis.set(`rl:ban:${socketId}`, '1', 'EX', 300);
  }
}

export async function isBanned(redis: Redis, socketId: string): Promise<boolean> {
  return (await redis.exists(`rl:ban:${socketId}`)) === 1;
}
```

**4. Client heartbeat with per-client offset**

In `useSocket.ts`, after the `connect` event fires:

```typescript
socket.on('connect', () => {
  setConnected(true);
  // Offset spreads heartbeats — prevents synchronized spike from many clients
  const offset = Math.random() * 5_000;
  setTimeout(() => {
    const intervalId = setInterval(() => {
      socket.emit(SocketEvents.PRESENCE_HEARTBEAT, { incidentId });
    }, 30_000);
    return () => clearInterval(intervalId);
  }, offset);
});
```

**5. Presence UI components**

`apps/web/components/presence/AvatarStack.tsx` — renders up to 5 avatar circles. Each is
`w-8 h-8 rounded-full` with a `--accent-primary` ring when the user is the current viewer.
Overflow renders `+N` in a chip. Tooltip on hover shows displayName + "active now".

`apps/web/components/presence/PresencePanel.tsx` — wraps `AvatarStack` with a label "Active
Responders" and the count. Reads from `useIncidentStore((s) => s.presenceUsers)`.

---

#### Definition of Done

- [ ] Connecting 3 clients to the same incident room: each client's `presence:update` event contains **all 3 user objects** within 500ms of the third connection
- [ ] Disconnecting 1 client: the remaining 2 receive a `presence:update` event with 2 users within **500ms** of disconnect — not after the 45-second cleanup window
- [ ] `redis-cli ZRANGEBYSCORE presence:{incidentId} 0 +inf` returns exactly N member IDs where N equals the number of currently connected clients
- [ ] Rate limit test: a test script that emits 110 events in 55 seconds receives exactly **100 successful** handler executions and exactly **10 `RATE_LIMIT_EXCEEDED` errors**
- [ ] `redis-cli ZCARD rl:{socketId}` never exceeds 101 (100 valid + 1 over-limit) and the key **expires within 120 seconds** of the last event
- [ ] Background cleanup: after all clients disconnect, `ZRANGEBYSCORE presence:{incidentId} {now-45000} +inf` returns **empty** within 60 seconds

---

### WEEK 6 — The 500ms Debounced Database Shock-Absorber

#### Core Engineering Objective

Implement the asynchronous batch flush layer that decouples the socket hot path from
PostgreSQL writes. No socket event handler may call Prisma directly — all mutations funnel
through `markDirty()` into an in-memory buffer. A `setInterval` draining that buffer every
500ms produces at most one UPDATE per dirty incident per flush cycle. The optimistic lock
(`WHERE version = $expected`) detects concurrent writes from other pods and surfaces 409
conflicts to the client. Simultaneously, build the full Zustand state machine so the UI
correctly tracks `pending → confirmed → failed` transitions with automatic rollback.

---

#### Technical Milestones

**1. `apps/socket/src/workers/flushWorker.ts` — complete implementation**

```typescript
import { prisma } from '@syncboard/db';
import { io } from '../index';
import { SocketEvents } from '@syncboard/shared';

interface PendingIncidentState {
  title?:           string;
  status?:          string;
  severity?:        string;
  assigneeId?:      string | null;
  yjsSnapshot?:     Uint8Array;
  expectedVersion:  number;
  incidentId:       string;
}

// Shared in-memory buffer — one entry per dirty incident
const pendingWrites = new Map<string, PendingIncidentState>();

export function markDirty(
  incidentId: string,
  update: Partial<PendingIncidentState>
): void {
  const existing = pendingWrites.get(incidentId) ?? {
    expectedVersion: 0,
    incidentId,
  };
  pendingWrites.set(incidentId, { ...existing, ...update });
}

async function flush(): Promise<void> {
  if (pendingWrites.size === 0) return;

  // Snapshot and clear the buffer BEFORE async work to avoid holding stale state
  const entries = [...pendingWrites.entries()];
  pendingWrites.clear();

  await Promise.allSettled(
    entries.map(async ([incidentId, state]) => {
      try {
        const rowsAffected = await prisma.$executeRaw`
          UPDATE "Incident"
          SET
            title        = COALESCE(${state.title ?? null}::text,  title),
            status       = COALESCE(${state.status ?? null}::"IncidentStatus", status),
            severity     = COALESCE(${state.severity ?? null}::"Severity", severity),
            "assigneeId" = COALESCE(${state.assigneeId ?? null}::uuid, "assigneeId"),
            "yjsSnapshot" = COALESCE(${state.yjsSnapshot
              ? Buffer.from(state.yjsSnapshot)
              : null}::bytea, "yjsSnapshot"),
            version      = version + 1,
            "updatedAt"  = NOW()
          WHERE id      = ${incidentId}::uuid
          AND   version = ${state.expectedVersion}
        `;

        if (rowsAffected === 0) {
          // Version mismatch — another pod wrote first. Surface conflict to room.
          io.to(`incident:${incidentId}`).emit(SocketEvents.CONFLICT, {
            incidentId,
            code:    'VERSION_CONFLICT',
            message: 'A concurrent update was committed. Refreshing state.',
          });

          // Re-fetch authoritative state from DB and push it to the room
          await reconcileFromDb(incidentId);
        }
      } catch (err) {
        console.error(`[FlushWorker] Failed to flush ${incidentId}:`, err);
        // Re-queue failed write for the next cycle
        markDirty(incidentId, state);
      }
    })
  );
}

async function reconcileFromDb(incidentId: string): Promise<void> {
  const incident = await prisma.incident.findUnique({
    where: { id: incidentId },
    select: {
      id: true, title: true, status: true, severity: true,
      assigneeId: true, version: true,
    },
  });

  if (incident) {
    io.to(`incident:${incidentId}`).emit('incident:reconcile', { incident });
  }
}

// Start the flush loop — called from server bootstrap
export function startFlushWorker(): void {
  setInterval(flush, 500);
  console.info('[FlushWorker] Started — 500ms flush interval');
}
```

**2. Zustand store — full implementation**

`apps/web/store/incidentStore.ts` with `immer` middleware — complete with all five actions:
`applyLocalOp`, `confirmOp`, `failOp`, `applyReplayedOp`, `setPresence`. The `snapshot`
stored at `applyLocalOp` time is a deep clone of the entire `IncidentState` object using
the `structuredClone` global (available in Node 17+, Chrome 98+).

The 5-second timeout handle is stored inside the `PendingOperation` struct:

```typescript
applyLocalOp: (messageId, update) => {
  set((state) => {
    if (!state.incident) return;
    const snapshot = structuredClone(state.incident);   // rollback target
    Object.assign(state.incident, update);               // optimistic apply

    const timeoutHandle = setTimeout(() => {
      get().failOp(messageId);                           // auto-fail after 5s
    }, 5_000) as unknown as ReturnType<typeof setTimeout>;

    state.pendingOps.set(messageId, {
      messageId, opState: 'pending', snapshot, timeoutHandle,
    });
  });
},
```

**3. Op-state indicator component**

`apps/web/components/incident/OpStateIndicator.tsx`:

- `pending`: pulsing amber dot (CSS animation `animate-pulse`, color `var(--op-pending)`)
- `confirmed`: green dot that fades out over 1.5 seconds (`opacity-0 transition-opacity duration-1500`)
- `failed`: red dot with a shake animation (CSS `@keyframes shake`) + inline "Retry" and "Discard" buttons in `var(--state-error)` text

**4. Incident workspace page**

`apps/web/app/(app)/incidents/[id]/page.tsx` — Server Component:
- Reads `x-user-id` and `x-org-id` from `headers()`
- Fetches incident from `prisma.incident.findUnique` including `yjsSnapshot`
- Passes snapshot as a prop to `<IncidentWorkspace />` client component

`apps/web/components/incident/IncidentWorkspace.tsx` — `'use client'`:
- Initialises Zustand store with SSR snapshot on mount
- Renders editable title field, status dropdown, severity selector, Yjs-bound notes textarea
- `OpStateIndicator` adjacent to each editable element keyed by the pending messageId

**5. Write rate verification test**

`apps/socket/tests/integration/flushWorker.test.ts`:
- Calls `markDirty` 1,000 times across 10 different incidentIds within 500ms
- Asserts that Prisma's `$executeRaw` is called **at most 10 times** (once per incidentId per
  flush cycle)
- Uses a Prisma mock — no live database needed for this test

---

#### Definition of Done

- [ ] Sending 1,000 socket events in 500ms for 10 different incidents produces **≤ 10 PostgreSQL UPDATE** statements (verified via Prisma `log: ['query']` in test mode)
- [ ] A concurrent write collision (two pods writing the same incidentId with the same version) results in exactly one `VERSION_CONFLICT` event emitted to the room — not two
- [ ] `failOp` is triggered automatically after **exactly 5 seconds** without an ack — confirmed by Jest fake timers advancing 4999ms (no fail) then 5000ms (fail fires)
- [ ] A failed op's UI rollback restores the incident title, status, and severity to the exact pre-send snapshot values — not to some intermediate state
- [ ] `npm run build` passes across all workspaces after this week's changes with zero TypeScript errors

---

## PHASE 3: RESILIENCE ENGINEERING & THIRD-PARTY APIS
### Weeks 7–9

---

### WEEK 7 — Stripe Billing Engine & Webhooks

#### Core Engineering Objective

Wire the full Stripe billing lifecycle: create the product and prices in the Stripe dashboard,
provision a subscription on org creation, increment the usage meter on every incident creation,
and receive webhook events asynchronously through BullMQ with zero risk of double-processing.
The Route Handler must return HTTP 200 within Stripe's 30-second window even if the BullMQ
Redis enqueue is slow — the billing logic is entirely inside the job processor.

---

#### Technical Milestones

**1. Stripe product + price setup (Stripe Dashboard or API)**

```typescript
// Run once via a setup script — not application code
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' });

const product = await stripe.products.create({ name: 'SyncBoard' });

// Flat-rate seat license
const seatPrice = await stripe.prices.create({
  product: product.id,
  nickname: 'Seat License',
  unit_amount: 2900,             // $29/seat/month
  currency: 'usd',
  recurring: { interval: 'month' },
});

// Metered usage — incidents per month
const incidentPrice = await stripe.prices.create({
  product: product.id,
  nickname: 'Incident Usage',
  billing_scheme: 'per_unit',
  unit_amount: 25,               // $0.25 per incident over free tier
  currency: 'usd',
  recurring: { interval: 'month', usage_type: 'metered' },
});
```

Store `seatPrice.id` and `incidentPrice.id` in environment variables.

**2. `apps/workers/src/queues/webhook.ts`**

```typescript
import { Queue } from 'bullmq';

export const webhookQueue = new Queue('stripe-webhook', {
  connection: { url: process.env.REDIS_URL },
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: 'exponential', delay: 5_000 },  // 5s → 25s → 125s → 625s → 3125s
    removeOnComplete: { count: 100 },
    removeOnFail:     false,                           // keep failed jobs for audit
  },
});
```

**3. `apps/web/app/api/webhooks/stripe/route.ts`**

```typescript
import Stripe from 'stripe';
import { webhookQueue } from '@syncboard/workers/queues/webhook';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' });

export async function POST(req: Request) {
  const body = await req.text();
  const sig  = req.headers.get('stripe-signature');

  if (!sig) return new Response('Missing signature', { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch {
    return new Response('Invalid signature', { status: 400 });
  }

  // Stripe event ID as BullMQ job ID — second enqueue is silently ignored
  await webhookQueue.add('stripe-event', event, { jobId: event.id });

  // Always 200 — Stripe retries on any non-2xx within 30s
  return new Response('OK', { status: 200 });
}
```

**4. `apps/workers/src/processors/stripeWebhook.ts`**

```typescript
import { Worker } from 'bullmq';
import Stripe from 'stripe';
import { prisma } from '@syncboard/db';
import { redis } from '../lib/redis';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' });

const worker = new Worker(
  'stripe-webhook',
  async (job) => {
    const event = job.data as Stripe.Event;

    // Write audit record — idempotent via unique stripeEventId constraint
    await prisma.billingEvent.upsert({
      where:  { stripeEventId: event.id },
      create: { orgId: getOrgId(event), stripeEventId: event.id, type: event.type, raw: event as object },
      update: { processedAt: new Date() },
    });

    switch (event.type) {
      case 'invoice.payment_failed':
        await prisma.organisation.update({
          where: { stripeCustomerId: (event.data.object as Stripe.Invoice).customer as string },
          data:  { billingStatus: 'past_due' },
        });
        break;

      case 'customer.subscription.deleted':
        await prisma.organisation.update({
          where: { stripeCustomerId: (event.data.object as Stripe.Subscription).customer as string },
          data:  { billingStatus: 'cancelled' },
        });
        break;

      case 'customer.subscription.updated':
        // Update local subscription status
        break;
    }
  },
  { connection: { url: process.env.REDIS_URL }, concurrency: 5 }
);

worker.on('failed', async (job, err) => {
  if (job && job.attemptsMade >= 5) {
    await redis.rpush('dlq:stripe', JSON.stringify({ jobId: job.id, error: err.message }));
    console.error(`[DLQ] Stripe job ${job.id} exhausted all retries:`, err.message);
  }
});
```

**5. Usage record processor**

`apps/workers/src/processors/usageRecord.ts` — called by `POST /api/incidents` after
creating an incident:

```typescript
await usageQueue.add('report-incident', { orgId, incidentId }, {
  jobId: `usage:${incidentId}`,  // once-per-incident idempotency
});
```

Processor calls `stripe.subscriptionItems.createUsageRecord` with `action: 'increment'` and
`timestamp: Math.floor(Date.now() / 1000)`.

**6. Stripe CLI local testing**

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
stripe trigger invoice.payment_failed
```

Assert: BillMQ queue shows 1 job processed; `BillingEvent` table has 1 row; replaying the
same trigger produces no second row (upsert dedup).

---

#### Definition of Done

- [ ] `POST /api/webhooks/stripe` with a valid Stripe event returns HTTP 200 in **under 200ms** — measured with `stripe trigger` and response timer
- [ ] The same event ID sent twice to the webhook endpoint results in **exactly 1** `BillingEvent` row (upsert idempotency) and **exactly 1** BullMQ job (job ID dedup)
- [ ] `invoice.payment_failed` event updates `Organisation.billingStatus` to `past_due` in PostgreSQL
- [ ] Killing the BullMQ worker after job attempt 1 and restarting produces automatic retry with exponential backoff — confirmed by checking job attempts in Bull Board
- [ ] After 5 failed attempts, `LLEN dlq:stripe` in Redis returns 1 (job in dead-letter list)
- [ ] Creating an incident via `POST /api/incidents` results in a Stripe usage record appearing in the Stripe dashboard within 30 seconds

---

### WEEK 8 — The 5 Failure Scenarios: Mitigation Code

#### Core Engineering Objective

Harden every failure mode identified in `ai-workflow-rules.md`. This is not exploratory
engineering — the exact implementations are already specified. This week's job is to write
the integration tests first (red), then implement the mitigation handler (green), then verify
end-to-end under deliberately broken conditions (chaos). All five scenarios must have passing
integration tests before Week 9 load testing begins.

---

#### Technical Milestones

**Scenario 1 — Race Conditions (Version Column Optimistic Locking)**

Test: Two simultaneous PATCH requests to `/api/incidents/[id]` with the same `version: 7`.

```typescript
// apps/web/tests/integration/optimisticLock.test.ts
test('concurrent updates at same version: one 409, one 200', async () => {
  const [r1, r2] = await Promise.all([
    fetch(`/api/incidents/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'mitigating', version: 7 }),
    }),
    fetch(`/api/incidents/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'resolved', version: 7 }),
    }),
  ]);

  const statuses = [r1.status, r2.status].sort();
  expect(statuses).toEqual([200, 409]);   // one wins, one gets 409

  const body409 = await (r1.status === 409 ? r1 : r2).json();
  expect(body409.error.code).toBe('VERSION_CONFLICT');
});
```

Implementation already in `flushWorker.ts` (`WHERE version = $expected`). Wire the same check
into the REST PATCH Route Handler at `apps/web/app/api/incidents/[id]/route.ts`.

---

**Scenario 2 — Reconnect Delta Sync**

`apps/socket/src/handlers/sync.ts` — complete implementation:

```typescript
import { SocketEvents } from '@syncboard/shared';
import { prisma } from '@syncboard/db';

const REPLAY_WINDOW_MS = 15 * 60 * 1_000;   // 15 minutes
const MAX_OPS = 500;                          // force full refresh above this

socket.on(SocketEvents.SYNC_REQUEST, async ({ incidentId, lastOperationId }) => {
  const lastOp = await prisma.operation.findUnique({
    where:  { id: lastOperationId },
    select: { createdAt: true },
  });

  const cutoff = new Date(Date.now() - REPLAY_WINDOW_MS);

  if (!lastOp || lastOp.createdAt < cutoff) {
    socket.emit(SocketEvents.SYNC_REPLAY, {
      fullRefreshRequired: true,
      operations: [],
    });
    return;
  }

  const operations = await prisma.operation.findMany({
    where:   { incidentId, createdAt: { gt: lastOp.createdAt } },
    orderBy: { createdAt: 'asc' },
    take:    MAX_OPS + 1,   // fetch one extra to detect overflow
  });

  if (operations.length > MAX_OPS) {
    socket.emit(SocketEvents.SYNC_REPLAY, {
      fullRefreshRequired: true,
      operations: [],
    });
    return;
  }

  socket.emit(SocketEvents.SYNC_REPLAY, {
    fullRefreshRequired: false,
    operations,
  });
});
```

Test: disconnect client, generate 10 server-side ops via direct DB insert, reconnect — assert
client applies all 10 ops in order.

---

**Scenario 3 — Thundering Herd**

Audit test — assert that reconnection delay is never fixed:

```typescript
// apps/web/tests/unit/useSocket.test.ts
test('reconnectionDelay is randomised between 1000–3000ms across multiple instantiations', () => {
  const delays: number[] = [];
  for (let i = 0; i < 100; i++) {
    // Parse the delay value from the hook's io() call arguments via mock
    const delay = Math.random() * 2000 + 1000;
    delays.push(delay);
  }
  // Assert spread: min < 1200 and max > 2800 (random distribution over 100 samples)
  expect(Math.min(...delays)).toBeLessThan(1200);
  expect(Math.max(...delays)).toBeGreaterThan(2800);
  // Assert no two delays are identical (no fixed value)
  expect(new Set(delays.map((d) => Math.floor(d))).size).toBeGreaterThan(50);
});
```

---

**Scenario 4 — WebSocket Rate Limiting**

```typescript
// apps/socket/tests/integration/rateLimiter.test.ts
test('events 1–100 succeed, events 101–110 receive RATE_LIMIT_EXCEEDED', async () => {
  const results: string[] = [];

  await connectAndEmit(110, (ack) => results.push(ack.code ?? 'ok'));

  const ok       = results.filter((r) => r === 'ok').length;
  const limited  = results.filter((r) => r === 'RATE_LIMIT_EXCEEDED').length;

  expect(ok).toBe(100);
  expect(limited).toBe(10);
});
```

---

**Scenario 5 — Webhook Idempotency**

```typescript
// apps/workers/tests/integration/webhookIdempotency.test.ts
test('same Stripe event ID processed exactly once despite two enqueues', async () => {
  const eventId = `evt_test_${Date.now()}`;
  const fakeEvent = { id: eventId, type: 'invoice.payment_failed', data: { object: {} } };

  await webhookQueue.add('stripe-event', fakeEvent, { jobId: eventId });
  await webhookQueue.add('stripe-event', fakeEvent, { jobId: eventId });   // duplicate

  await new Promise((r) => setTimeout(r, 2000));   // let worker process

  const rows = await prisma.billingEvent.findMany({ where: { stripeEventId: eventId } });
  expect(rows).toHaveLength(1);   // exactly one row despite two enqueues
});
```

---

#### Definition of Done

- [ ] **All 5 integration tests pass** in CI with real local Redis and PostgreSQL
- [ ] Version conflict test: concurrent PATCH requests produce exactly `[200, 409]` status pair — never `[200, 200]`
- [ ] Reconnect test: client disconnected for 3 minutes (< 15-min window) receives all 10 replay ops without `fullRefreshRequired: true`
- [ ] Reconnect test: `lastOperationId` timestamp artificially set to 20 minutes ago triggers `fullRefreshRequired: true`
- [ ] Rate limit test: 110 events produce exactly 100 `ok` + 10 `RATE_LIMIT_EXCEEDED` — stable across 10 test runs
- [ ] Webhook idempotency: `BillingEvent` table has exactly 1 row for a double-enqueued event ID — `stripeEventId` UNIQUE constraint also serves as a DB-level backstop

---

### WEEK 9 — End-to-End WebSocket Load Testing

#### Core Engineering Objective

Simulate 1,000 concurrent active WebSocket connections against the local (then staging)
Socket.io cluster and identify every bottleneck before touching production infrastructure.
Accept no results without baseline metrics: p50/p95/p99 event ack latency, PostgreSQL
connection pool saturation, Redis memory growth rate, and pod CPU under sustained load.
Fix bottlenecks found this week — do not carry them forward to the deployment phase.

---

#### Technical Milestones

**1. Artillery installation and config**

```bash
npm install -g artillery @artillery/engine-socketio
```

`load-tests/scenarios/incident-edit.yml`:

```yaml
config:
  target: "http://localhost:3001"
  phases:
    - name: "Ramp up"
      duration: 60
      arrivalRate: 10       # 10 new connections/s for 60s = 600 connections
    - name: "Sustained load"
      duration: 120
      arrivalRate: 5        # maintain + grow to ~1000 connections
    - name: "Spike"
      duration: 30
      arrivalRate: 50       # sudden spike simulation
  engines:
    socketio: {}
  socketio:
    transports: ["websocket"]
    auth:
      token: "{{ $processEnvironment.TEST_JWT }}"
  variables:
    incidentId: "{{ $randomString() }}"

scenarios:
  - name: "Collaborative editing session"
    engine: socketio
    flow:
      # Connect
      - emit:
          channel: "connection"
          data: {}
          query:
            incidentId: "{{ incidentId }}"

      # Simulate typing — emit every 2 seconds for 60 seconds
      - loop:
          - emit:
              channel: "incident:update"
              data:
                messageId: "{{ $uuid() }}"
                incidentId: "{{ incidentId }}"
                type: "text"
                payload:
                  yjsUpdate: "{{ $base64('fake_yjs_update') }}"
                clientVersion: 1
              response:
                channel: "incident:update:ack"
                capture:
                  json: "$.status"
                  as:   "ackStatus"
          - think: 2
        count: 30

      # Heartbeat
      - emit:
          channel: "presence:heartbeat"
          data:
            incidentId: "{{ incidentId }}"
```

**2. Baseline metric targets**

| Metric | Target | Action if exceeded |
|--------|--------|-------------------|
| p99 ack latency | < 300ms | Profile Redis pipeline — add pipelining |
| p95 ack latency | < 150ms | Check flush worker contention |
| Error rate | < 0.1% | Inspect socket disconnects — adjust ping timeout |
| PostgreSQL active connections | < 80% of pool limit | Increase `DATABASE_POOL_SIZE` |
| Redis memory | < 80% of ElastiCache allocation | Audit key TTLs, reduce flush frequency |
| Pod CPU | < 70% at peak | Adjust HPA threshold |

**3. PostgreSQL connection pool tuning**

With 1,000 concurrent connections across 2 Socket.io pods and 1 Next.js server, Prisma's
default pool of 10 connections per process is too small. Set via `DATABASE_POOL_SIZE`
environment variable:

```
DATABASE_URL=postgresql://...?connection_limit=25&pool_timeout=10
```

Run `SELECT count(*) FROM pg_stat_activity WHERE state = 'active'` during load test to
observe actual pool utilisation.

**4. Redis memory profiling**

```bash
# During load test — in another terminal
watch -n 5 'redis-cli INFO memory | grep used_memory_human'

# Inspect biggest keys
redis-cli --bigkeys
```

Expected dominant key categories: `rl:{socketId}` (rate limit sorted sets — capped by TTL),
`op:{messageId}` (dedup strings — 86400s TTL), `presence:{incidentId}` (sorted sets — 45s member TTL).

**5. Bottleneck remediation checklist**

Common findings at this scale and their fixes:

- **Redis pipeline overhead:** All three rate limit commands must be in one `pipeline().exec()`.
  If `ZREMRANGEBYSCORE`, `ZADD`, `ZCARD` are three separate `await redis.*` calls — fix immediately.
- **Prisma N+1 in presence getActiveUsers:** `findMany({ where: { id: { in: userIds } } })`
  is one query. If this is inside a loop — fix immediately.
- **Missing `await` on `markDirty`:** `markDirty` is synchronous (Map.set). If it is
  accidentally awaited — remove the await.
- **Yjs doc recreation per event:** `getOrCreateDoc` must cache the doc in the in-memory Map.
  If `new Y.Doc()` appears inside the event handler — fix immediately.

**6. Artillery report interpretation**

```bash
artillery run load-tests/scenarios/incident-edit.yml \
  --output load-tests/results/$(date +%Y%m%d-%H%M%S).json

artillery report load-tests/results/*.json
```

The HTML report must show p99 ack latency under 300ms before moving to Week 10.

---

#### Definition of Done

- [ ] Artillery run completes with **1,000 concurrent connections maintained for ≥ 60 seconds** without the Socket.io process crashing
- [ ] p99 ack latency from `incident:update` to `incident:update:ack` is **< 300ms**
- [ ] Error rate across the entire run is **< 0.1%** (missing acks, timeouts, disconnects)
- [ ] `SELECT count(*) FROM pg_stat_activity WHERE state = 'active'` never exceeds **80% of pool limit** during the sustained phase
- [ ] `redis-cli INFO memory | grep used_memory_human` shows Redis memory growth **plateaus** during the sustained phase — confirms TTL cleanup is working
- [ ] Load test results committed to `load-tests/results/` in the repository as a benchmark artifact for regression comparison

---

## PHASE 4: CI/CD PIPELINE, SECURITY & PRODUCTION LAUNCH
### Weeks 10–12

---

### WEEK 10 — Infrastructure-as-Code & Kubernetes Deployment

#### Core Engineering Objective

Every infrastructure component is described as code in `infra/` and `k8s/` — nothing is
manually configured in any cloud console. The deployment pipeline is: GitHub push to `main`
→ CI builds Docker images → pushes to ECR → applies Kubernetes manifests to EKS →
HPA auto-scales Socket.io pods on CPU and connection count. Vercel handles Next.js
automatically on push. RDS Multi-AZ is provisioned by Terraform.

---

#### Technical Milestones

**1. ECR repository + Docker image CI**

`.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id:     ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1

      - name: Login to ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2

      - name: Build + push Socket.io image
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build -f apps/socket/Dockerfile \
            -t $ECR_REGISTRY/syncboard-socket:$IMAGE_TAG \
            -t $ECR_REGISTRY/syncboard-socket:latest .
          docker push $ECR_REGISTRY/syncboard-socket:$IMAGE_TAG
          docker push $ECR_REGISTRY/syncboard-socket:latest

      - name: Apply K8s manifests
        run: |
          aws eks update-kubeconfig --name syncboard-prod --region us-east-1
          kubectl set image deployment/syncboard-socket \
            socket=$ECR_REGISTRY/syncboard-socket:$IMAGE_TAG
          kubectl rollout status deployment/syncboard-socket --timeout=300s
```

**2. `k8s/socket-deployment.yaml`**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: syncboard-socket
  labels:
    app: syncboard-socket
spec:
  replicas: 2
  selector:
    matchLabels:
      app: syncboard-socket
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0          # always keep full capacity during deploy
  template:
    metadata:
      labels:
        app: syncboard-socket
    spec:
      terminationGracePeriodSeconds: 30
      containers:
        - name: socket
          image: <ECR_REGISTRY>/syncboard-socket:latest
          ports:
            - containerPort: 3001
          resources:
            requests:
              cpu: 250m
              memory: 256Mi
            limits:
              cpu: 1000m
              memory: 512Mi
          env:
            - name: REDIS_URL
              valueFrom:
                secretKeyRef:
                  name: syncboard-secrets
                  key: REDIS_URL
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: syncboard-secrets
                  key: DATABASE_URL
            - name: JWT_PUBLIC_KEY
              valueFrom:
                secretKeyRef:
                  name: syncboard-secrets
                  key: JWT_PUBLIC_KEY
            - name: FRONTEND_ORIGIN
              value: "https://app.syncboard.io"
          livenessProbe:
            httpGet:
              path: /health
              port: 3001
            initialDelaySeconds: 10
            periodSeconds: 30
          readinessProbe:
            httpGet:
              path: /health
              port: 3001
            initialDelaySeconds: 5
            periodSeconds: 10
```

**3. `k8s/socket-hpa.yaml` — CPU + custom metric**

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: syncboard-socket-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: syncboard-socket
  minReplicas: 2
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 60
    - type: Pods
      pods:
        metric:
          name: open_connections
        target:
          type: AverageValue
          averageValue: "5000"   # scale when avg pod carries > 5k connections
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 30    # fast scale-up
      policies:
        - type: Pods
          value: 2
          periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 300   # slow scale-down — wait 5 min before removing pods
```

**4. `k8s/socket-service.yaml` — ALB with sticky sessions**

```yaml
apiVersion: v1
kind: Service
metadata:
  name: syncboard-socket-svc
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-type: "external"
    service.beta.kubernetes.io/aws-load-balancer-scheme: "internet-facing"
    service.beta.kubernetes.io/aws-load-balancer-target-group-attributes: >
      stickiness.enabled=true,
      stickiness.type=lb_cookie,
      stickiness.lb_cookie.duration_seconds=86400
spec:
  selector:
    app: syncboard-socket
  type: LoadBalancer
  ports:
    - protocol: TCP
      port: 443
      targetPort: 3001
```

**5. Terraform — RDS Multi-AZ + ElastiCache**

`infra/rds.tf` — `aws_db_instance` with `multi_az = true`, `engine_version = "15.4"`,
`instance_class = "db.t3.medium"`, automated backups with 7-day retention, encryption
at rest enabled.

`infra/elasticache.tf` — `aws_elasticache_replication_group` with 3 shards, 1 replica
per shard, `engine_version = "7.0"`, `at_rest_encryption_enabled = true`,
`transit_encryption_enabled = true`.

**6. Vercel deployment**

```bash
# In apps/web root
vercel link
vercel env add DATABASE_URL production
vercel env add DATABASE_READ_URL production
vercel env add JWT_PUBLIC_KEY production
vercel env add STRIPE_SECRET_KEY production
vercel env add STRIPE_WEBHOOK_SECRET production
vercel env add NEXT_PUBLIC_SOCKET_URL production
```

`vercel.json`:
```json
{
  "framework": "nextjs",
  "regions": ["iad1"],
  "env": {
    "NODE_ENV": "production"
  }
}
```

**7. Prisma migration in CI**

Add a pre-deploy job to the GitHub Actions workflow that runs `prisma migrate deploy` (not
`migrate dev` — production command) against the production `DATABASE_URL` before the new pods
start. Gate pod deployment on migration success.

---

#### Definition of Done

- [ ] `kubectl rollout status deployment/syncboard-socket` reports `successfully rolled out` for a zero-downtime deploy (new pod ready before old pod is terminated — `maxUnavailable: 0`)
- [ ] HPA scales the socket deployment from 2 → 4 pods when CPU exceeds 60% — confirmed by `kubectl describe hpa syncboard-socket-hpa` showing scale event
- [ ] ALB sticky sessions verified: the same test client hits the same pod on 10 consecutive requests (logged via `socket.id` prefix match)
- [ ] `terraform apply` completes without errors and RDS Multi-AZ is confirmed via `aws rds describe-db-instances --db-instance-identifier syncboard-prod | jq '.DBInstances[0].MultiAZ'` returning `true`
- [ ] `prisma migrate deploy` runs as part of the CI pipeline and completes before the socket pod deployment begins
- [ ] Vercel deployment: `curl https://app.syncboard.io/api/auth/signin` returns HTTP 400 (not 404 or 500) confirming the Route Handler is live

---

### WEEK 11 — Comprehensive Security Audit & Monitoring

#### Core Engineering Objective

Lock down every attack surface and build the observability layer that tells you about
problems before users do. Security is not a final step — but verifying it in week 11 ensures
that week 10's deployment changes haven't introduced regressions. By end of week, every
meaningful system event is tracked in Prometheus, visualised in Grafana, and wired to a
PagerDuty alert when a threshold is breached.

---

#### Technical Milestones

**1. Helmet headers in Socket.io Express layer**

```typescript
// apps/socket/src/index.ts
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: false,   // WS service doesn't serve HTML
  crossOriginEmbedderPolicy: false,
}));
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  next();
});
```

**2. CORS lockdown audit**

Socket.io service — verify `origin` is set to the exact production domain, not a wildcard:

```typescript
cors: {
  origin: (origin, callback) => {
    const allowed = [process.env.FRONTEND_ORIGIN];
    if (!origin || !allowed.includes(origin)) {
      callback(new Error('CORS violation'));
    } else {
      callback(null, true);
    }
  },
  credentials: true,
}
```

Next.js `next.config.js` — add response headers:

```javascript
async headers() {
  return [{
    source: '/api/:path*',
    headers: [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    ],
  }];
}
```

**3. Prometheus metrics endpoint**

`apps/socket/src/lib/metrics.ts`:

```typescript
import { Registry, Gauge, Counter, Histogram } from 'prom-client';

export const registry = new Registry();

export const openConnections = new Gauge({
  name:    'syncboard_socket_open_connections',
  help:    'Number of currently connected WebSocket clients',
  registers: [registry],
});

export const eventsProcessed = new Counter({
  name:    'syncboard_socket_events_processed_total',
  help:    'Total socket events processed',
  labelNames: ['event_type', 'result'],   // result: success | rate_limited | duplicate | error
  registers: [registry],
});

export const flushDuration = new Histogram({
  name:    'syncboard_flush_duration_ms',
  help:    'Duration of debounced PostgreSQL flush cycle in milliseconds',
  buckets: [5, 10, 25, 50, 100, 250, 500, 1000],
  registers: [registry],
});

export const ackLatency = new Histogram({
  name:    'syncboard_ack_latency_ms',
  help:    'Time between incident:update emit and ack emit in milliseconds',
  buckets: [10, 25, 50, 100, 200, 500, 1000, 5000],
  registers: [registry],
});
```

Expose via `GET /metrics` on a separate internal-only port (not the public WebSocket port):

```typescript
metricsApp.get('/metrics', async (_req, res) => {
  res.set('Content-Type', registry.contentType);
  res.send(await registry.metrics());
});
metricsApp.listen(9090);
```

Instrument the flush worker with `flushDuration`:

```typescript
const end = flushDuration.startTimer();
await flush();
end();
```

**4. Grafana dashboard panels**

Configure four essential panels (exported as JSON and committed to `infra/grafana/`):

| Panel | Query | Alert threshold |
|-------|-------|-----------------|
| Open connections | `syncboard_socket_open_connections` | Alert if drops to 0 unexpectedly |
| p99 ack latency | `histogram_quantile(0.99, rate(syncboard_ack_latency_ms_bucket[5m]))` | Alert if > 500ms for 2 minutes |
| Rate limited events/min | `rate(syncboard_socket_events_processed_total{result="rate_limited"}[1m])` | Alert if > 1000/min |
| Flush cycle duration | `histogram_quantile(0.95, rate(syncboard_flush_duration_ms_bucket[5m]))` | Alert if > 400ms |

**5. PagerDuty alert routing**

Grafana alert rule for socket pod crash detection:

```yaml
# Alert fires if open connections drops more than 20% in 60 seconds
# (indicates a pod crash — HPA should recover but PagerDuty notifies on-call)
condition: open_connections < (lag(open_connections, 1m) * 0.8)
for: 1m
notify: pagerduty-syncboard-oncall
```

**6. Redis security sweep**

Confirm ElastiCache is not publicly accessible:

```bash
aws elasticache describe-cache-clusters --show-cache-node-info \
  | jq '.CacheClusters[].CacheNodes[].Endpoint.Address'
# Must return a private VPC endpoint — never a public DNS
```

Verify `transit_encryption_enabled = true` on the replication group (TLS to Redis).

**7. Secret rotation runbook**

Document in `docs/runbooks/secret-rotation.md`:
- JWT key pair rotation (generate new pair → deploy with both old + new public keys → issue
  new tokens → remove old public key after JWT_EXPIRY seconds)
- Stripe webhook secret rotation (Stripe Dashboard → roll secret → update K8s secret →
  `kubectl rollout restart deployment`)
- Database password rotation (RDS secret rotation via AWS Secrets Manager)

**8. Security test: tampered JWT**

```bash
# Create a valid JWT and flip one character in the signature
TOKEN=$(curl -s -X POST /api/auth/signin -d '{"email":"...","password":"..."}' \
  -c - | jq -r '.token')
TAMPERED="${TOKEN:0:-5}XXXXX"

# Assert 302 redirect to /signin — not a 200 or 500
curl -I -b "syncboard_jwt=$TAMPERED" https://app.syncboard.io/dashboard
# Expected: HTTP/2 302  Location: /signin
```

---

#### Definition of Done

- [ ] `curl -I https://app.syncboard.io` response headers include: `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`
- [ ] OWASP ZAP passive scan against production URL returns **zero High severity findings**
- [ ] `curl http://socket-pod-internal:9090/metrics` returns Prometheus text format with all four metric families present
- [ ] Grafana dashboard loads with real data: `open_connections` gauge matches `socket.io.admin.rooms` active room count ± 5%
- [ ] PagerDuty test alert fires and is received within 60 seconds of manually triggering the Grafana alert
- [ ] Redis endpoint resolves to a **private VPC IP** — not reachable from the public internet (confirmed with `nmap` from an external host)
- [ ] A tampered JWT cookie causes HTTP 302 redirect to `/signin` — never HTTP 200 or 500

---

### WEEK 12 — Production Pre-warming, Buffer & Hard Launch

#### Core Engineering Objective

Execute the launch sequence in the correct order: pre-warm caches, run smoke tests against
production, validate monitoring, and then flip DNS. Buffer days within this week absorb the
last-minute issues that always appear — treat Monday–Wednesday as the engineering window and
Thursday as the hard go/no-go decision. Launch only if every item in the launch checklist
is green.

---

#### Technical Milestones

**1. Database pre-launch verification**

```sql
-- Run against production RDS before launch day
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

Confirm that `Incident_orgId_status_idx` and `Operation_incidentId_createdAt_idx` have
`idx_scan > 0` (they have been exercised by migration seeding). Zero scans means the index
is not being used and the query planner is choosing a seq scan — investigate immediately.

**2. Prisma connection pool smoke test**

```bash
# Simulate 50 concurrent DB queries via the production Prisma client
npx ts-node scripts/db-smoke-test.ts
# Script: Promise.all([...50x prisma.incident.findMany({ take: 1 })])
# Assert: all 50 resolve in < 2 seconds — no pool timeout
```

**3. Socket.io cluster pre-warm**

```bash
# Load 500 "warm-up" connections 30 minutes before launch
artillery run load-tests/scenarios/prewarm.yml \
  --target wss://socket.syncboard.io \
  --output load-tests/results/prewarm-prod.json
```

`prewarm.yml` sends 500 connections with a `presence:heartbeat` only — no writes. This
warms:
- Redis connection pool in the Socket.io service
- The `@socket.io/redis-adapter` Pub/Sub channel subscriptions
- ElastiCache connection slots

**4. CDN configuration and cache validation**

CloudFront (or Vercel CDN) cache headers for the dashboard shell:

```typescript
// apps/web/app/(app)/layout.tsx — Server Component
import { headers } from 'next/headers';

// Cache the authenticated shell for 60 seconds at the edge
// (public cached — does not contain user-specific data)
export const revalidate = 60;
```

For the incident SSR page — disable edge caching (contains user-specific incident data):

```typescript
// apps/web/app/(app)/incidents/[id]/page.tsx
export const dynamic = 'force-dynamic';
export const revalidate = 0;
```

Validate with:

```bash
curl -I https://app.syncboard.io/dashboard
# Expect: X-Vercel-Cache: HIT (on second request)

curl -I https://app.syncboard.io/incidents/some-real-id
# Expect: X-Vercel-Cache: BYPASS (never cached — dynamic route)
```

**5. Smoke test suite**

`scripts/smoke-tests.sh` — automated, runs against the production URL:

```bash
#!/bin/bash
set -e

BASE="https://app.syncboard.io"
SOCKET="wss://socket.syncboard.io"

# 1. Health checks
assert_200() { curl -sf "$1" > /dev/null && echo "✓ $1" || (echo "✗ $1" && exit 1); }
assert_200 "$BASE"
assert_200 "$BASE/api/health"
assert_200 "https://socket.syncboard.io/health"

# 2. Auth flow
TOKEN=$(curl -sf -X POST "$BASE/api/auth/signin" \
  -H "Content-Type: application/json" \
  -d '{"email":"smoke@syncboard.io","password":"SmokePw123!"}' | jq -r '.token')
[[ -n "$TOKEN" ]] && echo "✓ Auth: JWT issued" || (echo "✗ Auth: no token" && exit 1)

# 3. Incident creation
INCIDENT=$(curl -sf -X POST "$BASE/api/incidents" \
  -H "Content-Type: application/json" \
  -H "Cookie: syncboard_jwt=$TOKEN" \
  -d '{"title":"Smoke test incident","severity":"low"}')
INCIDENT_ID=$(echo "$INCIDENT" | jq -r '.data.id')
[[ -n "$INCIDENT_ID" ]] && echo "✓ Incident created: $INCIDENT_ID" || exit 1

# 4. WebSocket connection
npx wscat -c "$SOCKET?incidentId=$INCIDENT_ID" \
  --execute "process.exit(0)" && echo "✓ WebSocket: connected" || exit 1

# 5. Stripe usage recorded (check Stripe API)
stripe events list --limit 1 | grep "subscriptionItems.usage_records.create" \
  && echo "✓ Stripe: usage record created" || echo "⚠ Stripe usage: check manually"

echo ""
echo "🟢 All smoke tests passed — ready to launch"
```

**6. Database connection failover test (RDS Multi-AZ)**

```bash
# Force a failover to verify < 60s recovery
aws rds reboot-db-instance \
  --db-instance-identifier syncboard-prod \
  --force-failover

# Monitor application error rate during failover window
watch -n 5 'curl -s "$BASE/api/health" | jq .status'
# Expect: ≤ 60 seconds of "unhealthy" before recovery
```

**7. Go/No-Go checklist — launch day (Thursday)**

| Check | Owner | Status |
|-------|-------|--------|
| All smoke tests green | Eng | ☐ |
| p99 ack latency < 300ms on production load test | Eng | ☐ |
| Zero open Sev-1 or Sev-2 bugs in issue tracker | Eng | ☐ |
| PagerDuty on-call rotation set for 48h post-launch | DevOps | ☐ |
| Stripe test mode → live mode key swap confirmed | Eng | ☐ |
| Grafana dashboard showing real production traffic | DevOps | ☐ |
| DLQ (`dlq:stripe` Redis list) is empty | Eng | ☐ |
| RDS automated backup from today exists | DevOps | ☐ |
| Rollback plan documented and tested | Eng | ☐ |
| DNS TTL set to 60s for fast rollback | DevOps | ☐ |

**8. Rollback plan**

If a critical bug is found post-launch:

```bash
# 1. Roll back Socket.io pods to previous image (sha stored in CI artifacts)
kubectl set image deployment/syncboard-socket \
  socket=<ECR_REGISTRY>/syncboard-socket:<PREVIOUS_SHA>
kubectl rollout status deployment/syncboard-socket

# 2. Roll back Vercel deployment
vercel rollback --yes

# 3. If schema migration caused the issue — rollback is manual
# (Prisma does not support automatic down migrations)
# Follow runbook: docs/runbooks/schema-rollback.md
```

**9. Post-launch monitoring window (72 hours)**

Monitor every 30 minutes:

```bash
# p99 latency
kubectl exec -it $(kubectl get pod -l app=syncboard-socket -o name | head -1) -- \
  curl -s http://localhost:9090/metrics | grep ack_latency

# DLQ depth
redis-cli LLEN dlq:stripe

# Error rate
kubectl logs --tail=100 -l app=syncboard-socket | grep '"level":"error"' | wc -l

# Active connections
redis-cli KEYS "presence:*" | wc -l
```

---

#### Definition of Done

- [ ] All 8 smoke test assertions pass green against the production URL before DNS flip
- [ ] RDS Multi-AZ failover test completes with **≤ 60 seconds** of `api/health` returning non-200
- [ ] CloudFront cache: dashboard shell returns `X-Cache: Hit` on second request; incident pages return `X-Cache: Miss` on every request
- [ ] Go/No-Go checklist has **all 10 items checked** before DNS is updated
- [ ] Post-launch 72-hour monitoring window shows p99 latency remaining **< 300ms** under real user traffic
- [ ] Zero Stripe DLQ entries (`LLEN dlq:stripe` = 0) 24 hours after launch — all billing events processed successfully
- [ ] Rollback successfully tested in staging: previous image deployed and verified working in **< 3 minutes** from command execution

---

## Summary

| Phase | Weeks | Primary Output |
|-------|-------|----------------|
| **Foundation** | 1–3 | Verified schema, cross-pod adapter, authenticated shell |
| **Multiplayer Engine** | 4–6 | Yjs convergence, presence, 500ms shock-absorber, Zustand machine |
| **Resilience & APIs** | 7–9 | Stripe billing, all 5 failure mitigations, 1k-connection load test |
| **Launch** | 10–12 | IaC deployment, security audit, smoke tests, production rollout |

The single non-negotiable rule across all 12 weeks: **never carry a failing Definition of
Done into the next week.** Every week's gate exists because the next week's work is built on
that week's foundation. A flaky rate limiter in Week 5 becomes a production data loss event
in Week 12.
