# ADR 005 — USGS feed polling pattern

- Status: accepted
- Date: 2026-04-10
- Deciders: Jérémy Moyson

## Context

The USGS Earthquake Hazards Program publishes a GeoJSON feed refreshed every minute. It does not expose a push API, webhooks, or a stream — only periodic HTTP snapshots. We need to surface updates to the web client in near-real-time.

## Decision

Poll the USGS hourly feed every 2 minutes via a BullMQ-scheduled job. The processor upserts earthquakes into Postgres, then emits an `earthquakes.synced` event via `EventEmitter2`. The SSE controller listens for that event and fans it out to connected clients.

## Consequences

**Positive:**
- Clean separation: the polling cadence is set in one place (scheduler), the fan-out logic is independent (SSE controller), the business logic is isolated (service)
- Adding a new consumer of `earthquakes.synced` (e.g., `alert-earthquakes`) requires zero changes to the producer
- Each piece is independently testable
- Upsert-by-id means USGS can re-publish the same event without duplication

**Negative:**
- Latency is bounded below by the polling interval (~2 minutes)
- We pay the cost of fetching even when nothing has changed (USGS responses are small enough to ignore)

**Revisit if:**
- USGS publishes a streaming/webhook endpoint
- Product requires < 10s latency for alerts
