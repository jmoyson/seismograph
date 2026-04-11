# ADR 004 — pnpm workspaces over Turborepo (not yet)

- Status: accepted
- Date: 2026-04-10
- Deciders: Jérémy Moyson

## Context

We have a monorepo with two apps (`apps/api`, `apps/web`) and one shared package (`packages/shared`, types only, no build step). Turborepo offers task caching and orchestration across packages. The question is whether it earns its keep at this scale.

## Decision

Use pnpm workspaces alone. Do not add Turborepo.

## Consequences

**Positive:**
- Zero configuration on top of `pnpm-workspace.yaml`
- `@seismograph/shared` is consumed as TypeScript source with no build step — no cache to invalidate
- `pnpm --filter` is enough to run commands on a single app
- Local dev loop is the simplest possible: edit shared types → both apps see them instantly

**Negative:**
- No task caching — a second run of `pnpm build` rebuilds everything
- If we grow to many apps, rebuilds will become noticeably slower

**Revisit if:**
- We reach 4+ apps OR a shared package requires an explicit build (e.g., a compiled UI library) OR CI build time exceeds 5 minutes due to redundant rebuilds.

Note: Turborepo is not inferior — it's premature. The criterion is "do we feel the pain it solves?" Today the answer is no.
