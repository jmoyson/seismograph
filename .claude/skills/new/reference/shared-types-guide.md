# Shared Types Guide

Rules for modifying `packages/shared/src/types.ts` — the single file that defines types shared between `apps/api`, `apps/web`, and `apps/superset-plugins`.

## When to add a type here

Only if the type is used by **2+ apps**. If a type is only used in one app, it stays in that app (e.g., a DTO in a backend slice, a component prop type in a frontend feature).

## Naming conventions

| Category | Pattern | Example |
|----------|---------|---------|
| Entity | Noun | `Earthquake`, `Region` |
| Filters / params | Noun + "Filters" | `EarthquakeFilters`, `RegionFilters` |
| API response shape | Noun + purpose | `EarthquakeStats`, `RegionRanking` |
| SSE event | Descriptive | `SSEEvent` (already exists — extend if needed) |

## Field conventions

### Time fields

Use `string` (ISO 8601 format) in shared types. The backend serializes `Date` → `string` in JSON responses. The frontend parses `string` → `Date` when needed for display or calculation.

```typescript
// CORRECT
time: string;    // "2026-04-10T12:00:00Z"

// WRONG
time: Date;      // Date objects don't survive JSON serialization
```

### Nullable vs optional

- `| null` — the field **exists** but can have no value (e.g., `url: string | null`)
- `?:` — the field **may not be present** at all (e.g., in filters: `minMagnitude?: number`)

```typescript
// Entity: field always present, sometimes null
url: string | null;
status: string | null;

// Filters: field may be omitted entirely
minMagnitude?: number;
days?: number;
```

## Current types (reference)

The file currently exports:
- `Earthquake` — core entity (id, magnitude, place, time, latitude, longitude, depth, tsunami, url, status, significance)
- `EarthquakeFilters` — query parameters for list endpoint
- `EarthquakeStats` — aggregation response (period, counts, distribution)
- `SSEEvent` — real-time sync event payload

## Process

1. Add the new interface to `packages/shared/src/types.ts`
2. If it's a **new** export (not modifying an existing one), also add it to `packages/shared/src/index.ts` (currently just `export * from './types'`, so new types in `types.ts` are auto-exported)
3. Both `apps/api` and `apps/web` pick up changes immediately via pnpm workspace resolution — no build step needed for the shared package
4. Verify both apps still compile: `pnpm build`
