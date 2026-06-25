# ADR-02: Session-Based Authentication with HTTP Cookies

**Project:** SyncBoard

**Version:** 1.0

**Status:** Accepted

**Date:** 2025-01

---

# Context

SyncBoard requires authentication for all API endpoints and WebSocket connections. Users log in with email and password. External systems authenticate via API keys.

The primary client is a Next.js web application served from the same top-level domain as the API. The authentication mechanism must:

- Be resistant to common browser-based attacks (XSS, CSRF)
- Support session invalidation without token rotation complexity
- Work naturally with the WebSocket handshake
- Be simple enough to implement correctly without a third-party identity provider

---

# Decision

SyncBoard uses **server-side sessions stored in memory** (development) and **Redis** (production), issued to clients as **HttpOnly secure cookies**.

When a user logs in:

1. The API validates credentials
2. A session is created and stored server-side
3. A session ID is sent to the browser as an `HttpOnly; Secure; SameSite=Lax` cookie

Subsequent requests include the cookie automatically.

The API verifies the session ID against the store on each request.

Session configuration:

```
HttpOnly: true        — prevents JavaScript from reading the cookie
Secure: true          — cookie is only sent over HTTPS
SameSite: Lax         — prevents CSRF in most cases without requiring a CSRF token
Max-Age: 7 days       — maximum session lifetime
```

Idle timeout: 24 hours of inactivity invalidates the session.

API key authentication uses the `Authorization: Bearer <key>` header and is separate from session authentication.

---

# Alternatives Considered

## JWT (Stateless Tokens)

JWTs are self-contained tokens that do not require a server-side store.

Rejected because:

- JWTs stored in `localStorage` are vulnerable to XSS token theft
- JWTs stored in cookies have the same security properties as session cookies, but add complexity: token rotation, expiry handling, and revocation require infrastructure (a token blocklist or short expiry with refresh tokens) that is more complex than a session store
- Revoking a session (logout, compromised account) is immediate with server-side sessions; with JWTs it requires either a blocklist (stateful) or waiting for the token to expire
- For a web-first application with a same-domain API, sessions are simpler and equally secure

## Auth0 / Clerk / Better Auth

Third-party identity providers reduce the implementation burden.

Rejected for MVP because:

- Adds external dependency and monthly cost
- Reduces control over the authentication flow and user data
- Sessions are sufficient for the current requirements

This decision will be revisited if MFA, SSO, or social login is required.

---

# Consequences

**Positive**

- Cookies are sent automatically by the browser — no token management logic on the client
- HttpOnly cookies cannot be stolen via XSS
- Session invalidation is immediate on logout or account suspension
- The same session cookie authenticates both HTTP requests and the WebSocket handshake

**Negative**

- The session store (Redis) is a shared dependency that must be available for authentication to work
- Horizontal scaling requires sticky sessions or a shared session store — Redis satisfies this
- SameSite=Lax does not protect against all CSRF vectors; a CSRF token should be added when form submissions from third-party origins are a concern (not applicable in MVP)

---

# Notes

Passwords are hashed with bcrypt at cost factor 12.

API secrets are hashed with SHA-256 and compared using a constant-time comparison function to prevent timing attacks.

The session secret (`SESSION_SECRET`) must be at minimum 32 bytes of cryptographic randomness and must never be committed to the repository.

Authentication middleware validates the session on every protected route before any business logic executes.
