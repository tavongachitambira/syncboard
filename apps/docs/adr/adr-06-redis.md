# ADR-06: Redis for Presence, Pub/Sub, and Rate Limiting

**Project:** SyncBoard

**Version:** 1.0

**Status:** Accepted

**Date:** 2025-01

---

# Context

SyncBoard has several requirements that are poorly served by PostgreSQL:

**Presence** — who is currently viewing an incident. Presence is ephemeral: it should disappear automatically when a user disconnects, it changes many times per minute under active use, and querying it must be fast. Writing presence events to PostgreSQL on every connection and disconnection would generate unnecessary load and leave stale data on crashes.

**Pub/Sub for horizontal Socket.IO scaling** — when running multiple Socket.IO instances, an event emitted by one instance must reach clients connected to all other instances. This requires a message broker between instances.

**Rate limiting** — enforcing per-IP or per-user request limits requires an atomic counter that is shared across all API server instances. An in-memory counter on a single process is not accurate when traffic is distributed across multiple servers.

**Refresh token registry** — access tokens are stateless JWTs, but refresh tokens must be revocable (logout, compromised account). A hash of each issued refresh token is stored with a TTL matching its lifetime, shared across all API instances.

The solution must be:

- Fast (sub-millisecond for presence reads and rate limit increments)
- Able to expire keys automatically (TTL-based cleanup for presence, refresh token expiry)
- Accessible from multiple server processes simultaneously

---

# Decision

SyncBoard uses **Redis** for:

1. **Presence tracking** — Redis Sorted Sets with a score of the last-seen timestamp. Presence expires via TTL.
2. **Socket.IO Pub/Sub** — `@socket.io/redis-adapter` uses Redis Pub/Sub channels to broadcast events across Socket.IO instances.
3. **Rate limiting** — Redis atomic `INCR` with `EXPIRE` for sliding window counters per IP/user.
4. **Refresh token registry** — a SHA-256 hash of each issued refresh token is stored under the key `refresh:{userId}:{jti}` with a TTL equal to the token's 7-day lifetime. Logout deletes the key, revoking the token immediately. `/auth/refresh` checks the stored hash matches, deletes the key, and issues a new token pair (rotation). A missing or mismatched entry is treated as reuse and every `refresh:{userId}:*` key is deleted.

Presence data structure:

```
Key:   presence:incident:{incidentId}
Type:  Sorted Set
Score: Unix timestamp (last heartbeat)
Value: userId
```

Users are added on join, updated on heartbeat, and removed on disconnect.

Stale entries (score older than 30 seconds) are pruned on each presence read.

Redis is treated as **ephemeral** — no data stored in Redis is the source of truth. If Redis restarts:

- Presence is rebuilt as users reconnect
- Rate limit counters reset (acceptable — brief window of unenforced limits after restart)
- Refresh tokens become unrevocable until they naturally expire (acceptable for MVP; already-issued access tokens are unaffected since they verify statelessly)
- Socket.IO subscriptions are re-established automatically

---

# Alternatives Considered

## In-Memory (per-process)

Store presence and rate limit state in Node.js memory within each server process.

Rejected because:

- State is lost on process restart
- State is not shared across multiple server instances
- Presence on server A is invisible to clients connected to server B

## PostgreSQL for Presence

Store presence as rows in a `Presence` table, deleted on disconnect.

Rejected because:

- PostgreSQL writes are significantly slower than Redis for this access pattern
- Process crashes do not reliably trigger cleanup, leaving stale presence rows
- TTL-based expiry requires a polling job rather than being built into the storage engine
- This pattern generates significant write amplification for a dataset that has no long-term value

## Apache Kafka / RabbitMQ for Pub/Sub

A dedicated message broker for inter-instance event routing.

Rejected because:

- Kafka and RabbitMQ are significantly more complex to operate than Redis
- Redis Pub/Sub is sufficient for the Socket.IO adapter use case
- The Socket.IO Redis adapter is the documented and well-supported path for Redis-backed scaling
- Kafka would be reconsidered if the event stream needed durable replay guarantees across services

---

# Consequences

**Positive**

- Presence reads and writes are sub-millisecond
- TTL-based expiry handles disconnect cleanup without any application-level polling
- Redis Pub/Sub enables horizontal Socket.IO scaling with minimal configuration
- Atomic counters for rate limiting are accurate across all server instances
- A single Redis instance serves all four use cases without additional infrastructure

**Negative**

- Redis is an additional operational dependency that must be monitored and kept available
- Redis restart clears the refresh-token registry, meaning a revoked refresh token (e.g. from a forced logout) would no longer be rejected if replayed before its natural expiry — this is acceptable for MVP but should be mitigated by Redis persistence or a managed Redis service in production
- Redis Pub/Sub does not persist messages — if a Socket.IO instance is down when a message is published, it misses the event. Clients catch up on reconnect via the REST API.
- Redis Cluster adds complexity; Sentinel-based HA is the recommended path for a single-region production deployment

---

# Notes

Redis is never exposed publicly. It runs on a private network accessible only to the API and Socket servers.

Redis must be configured with a password (`requirepass`) in production.

TLS is enabled for Redis connections in production environments that support it.

Redis memory usage must be monitored. Set a `maxmemory` policy appropriate for the instance size. `allkeys-lru` is recommended — it evicts the least recently used keys when memory is full, which is acceptable for presence and rate limit data.

A future billing queue (BullMQ) will use the same Redis instance. BullMQ jobs are stored as Redis sorted sets and survive Redis restarts if persistence (`AOF` or `RDB`) is enabled. Enable at least `AOF` persistence in production when BullMQ is introduced.
