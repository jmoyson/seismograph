# apps/web — Frontend Instructions

React SPA built with Vite. The backend is NestJS at `apps/api/` (see `apps/api/CLAUDE.md` for backend conventions).

## Stack

Vite · React 19 · TypeScript · TanStack Query (`@tanstack/react-query`) · Axios · `react-globe.gl` (Three.js wrapper)

## Folder structure

```
apps/web/src/
├── App.tsx
├── main.tsx
├── api/
│   └── client.ts                 # Axios instance (single source of truth for API base URL)
├── features/                     # UI features (vertical slices, same isolation rule as backend)
│   ├── earthquake-list/
│   ├── earthquake-detail/
│   ├── globe/
│   └── statistics/
├── hooks/                        # React hooks shared across features (useEarthquakes, useSSE, useStatistics)
└── shared/                       # Pure utilities, presentational primitives, constants
    └── utils/
        └── formatting.ts         # getColorByMagnitude, timeAgo — consumed by multiple features
```

## Feature isolation rule

**A feature in `src/features/<feature>/` MUST NEVER import from another feature.**

Allowed imports from inside a feature:
1. npm packages
2. `../../shared/*` (pure utilities / presentational primitives)
3. `../../hooks/*` (shared React hooks)
4. `../../api/client` (the single Axios instance)
5. `@seismograph/shared` (cross-app types)
6. Other files in the same feature

This rule is enforced mechanically by `pnpm check:slices` (run from repo root) via dependency-cruiser.

If a utility is used by more than one feature, it belongs in `src/shared/utils/`, NOT in one of the features.

## API consumption pattern

- **Always** import the Axios instance from `src/api/client.ts`. Never create your own Axios instance in a feature.
- **Always** wrap API calls in a hook under `src/hooks/` that uses TanStack Query. Features consume the hook, not Axios directly.
- **Always** import API types from `@seismograph/shared`. Never redefine `Earthquake`, `EarthquakeStats`, etc. inside `apps/web`.

## SSE pattern

There is exactly one consumer of `EventSource` in the codebase: `src/hooks/useSSE.ts`. Features consume the hook. Features never create their own `EventSource`.

## How to add a feature

To add a feature `x-y`:

1. Create directory `src/features/x-y/`.
2. Add the React components for the feature.
3. If the feature needs API data, add a hook in `src/hooks/useX.ts` (or reuse an existing one) that uses TanStack Query and the shared Axios client.
4. If the feature needs a utility that might be used elsewhere later, put it in `src/shared/utils/`, not in the feature.
5. Import the feature into `App.tsx`.
6. Run `pnpm check:slices` from the repo root — must pass.
7. Commit with a message like `feat(web): add x-y feature`.

## DON'Ts

- **NEVER** redefine API types that already exist in `@seismograph/shared`.
- **NEVER** create an `axios` instance inside a feature. Use `src/api/client.ts`.
- **NEVER** instantiate `EventSource` outside `src/hooks/useSSE.ts`.
- **NEVER** import from `../<other-feature>/`. If you need something from another feature, it belongs in `shared/` or `hooks/`.
