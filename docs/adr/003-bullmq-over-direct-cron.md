# ADR 003 — BullMQ over direct cron

- Status: accepted
- Date: 2026-04-10
- Deciders: Jérémy Moyson

## Context

The USGS sync runs every 2 minutes. A naive approach is a `@Cron()` that calls the sync service directly. But network failures, USGS rate limits, and transient errors are inevitable, and the sync must be observable and retryable.

## Decision

Use BullMQ as an intermediary. The scheduler (`@Cron()`) enqueues a job; a dedicated processor consumes the queue and calls the service. Retry, backoff, and persistence live in the queue configuration.

## Consequences

**Positive:**
- Retry with exponential backoff on transient USGS failures (3 attempts, 5s initial delay)
- Jobs persist in Redis — crashes don't lose pending work
- The scheduler is non-blocking: firing a job is instant
- Bull Board (future) can give an observable view of job status
- The producer (scheduler) and consumer (processor) are decoupled in time

**Negative:**
- Adds a Redis dependency to the stack
- One level of indirection: a bug may be in the scheduler, the queue config, the processor, or the service
- Serialization/deserialization overhead for each job (negligible here)

**Revisit if:**
- The sync is the only remaining BullMQ consumer AND Redis is no longer used for anything else. At that point, BullMQ becomes infrastructure-for-one-feature and a direct cron with a retry loop may be enough.
