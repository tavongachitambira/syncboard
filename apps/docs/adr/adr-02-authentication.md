# ADR-02: JWT-Based Authentication with RS256

**Project:** SyncBoard

**Version:** 2.0

**Status:** Accepted (supersedes v1.0 — see Revision History)

**Date:** 2025-01 (revised 2026-06)

---

# Context

SyncBoard requires authentication for all API endpoints and WebSocket connections. Users log in with email and password. External systems authenticate via API keys.

The primary client is a Next.js web application served from the same top-level domain as the API. The realtime layer (`apps/socket`) runs as a separate process from the REST API (`apps/api`) and must be able to verify a caller's identity on every WebSocket event without adding a round-trip to a shared store on the hot path.

The authentication mechanism must:

- Be resistant to common browser-based attacks (XSS, CSRF)
- Be verifiable independently by both `apps/api` and `apps/socket` without a network round-trip per request
- Work naturally with the WebSocket handshake
- Support logout and revocation without an unacceptable security window
- Be simple enough to implement correctly without a third-party identity provider

---

# Decision

SyncBoard uses **JSON Web Tokens signed with RS256**, generated and verified using `jose`.

Two tokens are issued on login:

- **Access token** — short-lived (15 minutes). Contains `userId`, `organizationId`, and `role`. Verified statelessly by any service holding the public key — no database or Redis lookup required to validate it.
- **Refresh token** — long-lived (7 days), opaque. Only its hash is stored, in Redis, with a TTL matching its lifetime. Used exclusively to mint a new access token.

Both tokens are delivered to the browser as `HttpOnly; Secure; SameSite=Lax` cookies — never via `localStorage` and never in a JavaScript-readable form — so neither token is reachable via XSS.

```
Login
  ↓
Credentials validated
  ↓
Access token signed (RS256, 15 min)
Refresh token generated, hash stored in Redis (TTL 7 days)
  ↓
Both tokens set as HttpOnly cookies
  ↓
Authenticated requests include the access token cookie automatically
  ↓
Access token expires → client calls /auth/refresh → refresh token hash validated against Redis → new access token issued
```

Key management: one RS256 key pair is generated per environment. The **private key** signs tokens and is held only by `apps/api`. The **public key** verifies tokens and is distributed to any service that needs to authenticate a caller without being able to forge a token — currently `apps/socket`, and the Next.js route-guard middleware in `apps/web` if it verifies tokens at the edge.

API key authentication is unrelated to user tokens and is unchanged: external systems authenticate via the `Authorization: Bearer <API_KEY>` header.

---

# Alternatives Considered

## Server-Side Sessions (Opaque Cookie + Redis Store)

This was the original v1.0 decision: an opaque session ID issued as a cookie, validated against server-side state on every request.

Reconsidered because:

- Every request — including every Socket.IO event — would require a Redis round-trip just to confirm who the caller is, adding latency exactly where low latency matters most
- `apps/socket` would need to share session-parsing logic and a live connection to the same store as `apps/api`, coupling two otherwise independently deployable processes
- RS256 lets `apps/socket` verify a caller using only a public key in memory, with no dependency on a store being reachable or healthy

This was not the wrong call in isolation — it's operationally simpler and revocation is instant. It was changed because the per-event verification cost on the realtime path outweighed the complexity of adding token refresh.

## Auth0 / Clerk / Better Auth

Third-party identity providers reduce the implementation burden.

Rejected for MVP because:

- Adds an external dependency and monthly cost
- Reduces control over the authentication flow and user data
- The current requirements don't need MFA, SSO, or social login

This decision will be revisited if MFA, SSO, or social login is required.

---

# Consequences

**Positive**

- `apps/api` and `apps/socket` each verify callers independently using only the public key — no shared store on the request hot path
- A Redis outage does not invalidate already-issued access tokens; stateless verification keeps working
- The same access-token cookie authenticates both HTTP requests and the WebSocket handshake
- No session-affinity requirement at the load balancer for access-token verification (relevant once `apps/api` scales past one instance)

**Negative**

- Logout is not instantaneous for the access token itself — a compromised access token remains valid until it naturally expires. Mitigated by keeping the access-token lifetime short (15 minutes).
- Refresh tokens still require a Redis-backed revocation registry, which reintroduces an operational dependency — just scoped to refresh, not to every request.
- Public-key rotation must be coordinated across every verifying service. Use a versioned `kid` (key ID) in the token header so tokens signed with the previous key remain verifiable during rollover.

---

# Notes

Passwords are hashed with bcrypt at cost factor 12.

API secrets are hashed with SHA-256 and compared using a constant-time comparison function to prevent timing attacks.

The RS256 private key must never be committed to the repository and must be loadable only by `apps/api`. The public key may be freely distributed to any service that needs to verify tokens.

Logout invalidates the refresh token immediately (its hash is deleted from Redis) and clears both cookies. The access token issued before logout remains technically valid until it expires — this is the accepted tradeoff for stateless verification, bounded by the 15-minute lifetime.

Socket.IO middleware verifies the access token on every connection handshake and rejects the connection immediately if it is missing, expired, or fails signature verification.

Authentication middleware in `apps/api` validates the access token on every protected route before any business logic executes.

---

# Revision History

| Version | Date    | Change                                                                                                   |
| ------- | ------- | --------------------------------------------------------------------------------------------------------- |
| 1.0     | 2025-01 | Original decision: server-side sessions stored in Redis, issued as an opaque cookie.                       |
| 2.0     | 2026-06 | Superseded by RS256 JWT (via `jose`) to match the implemented Phase 2 auth — route guards and Socket.IO middleware verify signed tokens rather than looking up a server-side session. See "Alternatives Considered" for the tradeoff. |
