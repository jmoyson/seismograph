# ADR 007 — dependency-cruiser for slice isolation enforcement

- Status: accepted
- Date: 2026-04-10
- Deciders: Jérémy Moyson

## Context

Vertical Slice Architecture's central rule is "no cross-slice imports". Left to human discipline alone, this rule is violated at the first moment of fatigue. We need a mechanical check that runs locally and in CI. Options: a bash script parsing imports with regex, `eslint-plugin-boundaries` / `eslint-plugin-import`, or `dependency-cruiser`.

## Decision

Use `dependency-cruiser` with a config at the repo root (`.dependency-cruiser.cjs`). Three rules: `no-cross-slice-api`, `no-cross-feature-web`, `no-circular`. Exposed via `pnpm check:slices`. A second script `pnpm graph:slices` generates an SVG dependency graph to `docs/dependency-graph.svg`.

## Consequences

**Positive:**
- Exact AST-based analysis, not fragile regex — catches dynamic imports, re-exports, path aliases
- Can express declarative rules by path glob
- Generates a visual graph, which is itself a useful architectural artifact
- Runs in under 5 seconds on a repo this size
- Integrates with any CI system — just `pnpm check:slices`

**Negative:**
- An additional tool to learn (rule syntax is dep-cruiser-specific)
- Slightly heavier config than an ESLint rule
- The graph step requires `graphviz` (`brew install graphviz`) on the machine generating it

**Revisit if:**
- ESLint becomes heavy enough in this repo that we want all linting in one tool (ESLint boundaries + no-restricted-paths could replace dep-cruiser's role)
