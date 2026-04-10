# ADR 006 — Testcontainers + OrbStack for integration tests

- Status: accepted
- Date: 2026-04-10
- Deciders: Jérémy Moyson

## Context

Integration tests for each slice must run against a real database to have meaning. Options: mock `PrismaClient`, use `pg-mem`, use an embedded Postgres binary, or use Testcontainers. The dev machine is a Mac mini M1 with 8 GB RAM, so heavyweight Docker stacks are problematic.

## Decision

Use `@testcontainers/postgresql` with the `postgres:17-alpine` image. On macOS, use **OrbStack** as the Docker daemon instead of Docker Desktop. In CI, use GitHub Actions' native `services: postgres:17-alpine` sidecar (Testcontainers is not needed when Docker already provides a running container). Switch between modes via `process.env.CI`.

## Consequences

**Positive:**
- Tests run against real PostgreSQL — same version, same SQL features as production
- `PrismaService` is never mocked, so tests catch real query bugs
- `.withReuse(true)` keeps the test container alive between runs for instant iteration
- OrbStack uses ~200 MB idle vs. 3-4 GB for Docker Desktop — viable on 8 GB RAM
- One environment variable (`CI=true`) switches behavior; test code is the same

**Negative:**
- Requires Docker (OrbStack) on the dev machine
- OrbStack's personal license is free but not commercial — a team with commercial usage would need to switch daemons
- First container boot downloads the alpine image (~80 MB, cached afterwards)

**Revisit if:**
- OrbStack is no longer free for our usage → switch to Colima (Docker-compatible, also lightweight)
- The test suite becomes slow enough that a schema-per-suite strategy is worth the complexity (currently we use a single container + `TRUNCATE` between tests)
