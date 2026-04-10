# ADR 002 — Server-Sent Events over WebSocket

- Status: accepted
- Date: 2026-04-10
- Deciders: Jérémy Moyson

## Context

The web client needs to receive earthquake updates from the backend as soon as a sync completes. The communication is strictly unidirectional: server → client. WebSocket supports bidirectional messaging, but we would not use the client → server direction.

## Decision

Use Server-Sent Events (SSE) via NestJS `@Sse()` and the browser's native `EventSource`. One SSE endpoint, one hook on the web side, done.

## Consequences

**Positive:**
- Native `EventSource` reconnection — no client-side reconnect logic to write
- HTTP/1.1 standard, passes through firewalls and corporate proxies
- Zero additional dependencies on either side
- Simple to test: the backend just pushes to `Subject`s, the test subscribes to the Subject directly

**Negative:**
- One TCP connection per client (WebSocket can multiplex)
- No binary frame support (not needed here)
- Some legacy browsers have SSE quirks (not a concern in 2026)

**Revisit if:**
- We need a bidirectional channel (chat, collaborative editing, presence) — at that point, a single WebSocket connection replaces both SSE and the equivalent REST endpoints.
