# Skills System — Design Spec

**Date:** 2026-04-13
**Status:** Approved

## Goal

Create a native Claude Code skills system so that any developer — including a junior on day 1 — can build features, slices, plugins, and components by describing what they want in natural language, with all conventions enforced automatically.

The skills mirror the **developer journey**, not the code structure:

```
/onboard          →  "I understand this project"
/new <anything>   →  "I built the thing"
/new-plugin       →  "I built a Superset chart"
/check            →  "My code is correct"
```

## Architecture Decision: Native Claude Code Skills

Skills live in `.claude/skills/<name>/SKILL.md` (native Claude Code format). This is preferred over a custom `skills/` directory because:

- Auto-discovered by Claude Code at session start (description matching + `paths` globs)
- Invocable via `/skill-name` slash command
- Supports frontmatter (`name`, `description`, `paths`, `allowed-tools`, `disable-model-invocation`)
- Supports argument substitution (`$ARGUMENTS`, `$0`, `$1`)
- Supports dynamic context injection via `` !`command` `` shell syntax
- Supports reference files alongside SKILL.md
- Committed to git, shared with the team

Skills do NOT chain to each other — shared conventions live in the CLAUDE.md hierarchy (already loaded automatically). Each skill is self-contained.

## Superpowers Plugin Recommendation

The [Superpowers plugin](https://github.com/anthropics/claude-code-superpowers) provides essential workflow skills (brainstorming, TDD, debugging, code review, plan execution) that complement the project-specific skills defined here. It should be strongly recommended to every developer working on this repo.

Three layers of recommendation, from active to passive:

### Layer 1: Session-start hook (active, automatic)

A `SessionStart` hook in `.claude/settings.json` (committed to git, shared with team) checks for the plugin on every session start. If missing, it prints a warning that Claude sees and relays to the user.

```json
{
  "hooks": {
    "SessionStart": [
      {
        "type": "command",
        "command": "bash -c '[ -d \"$HOME/.claude/plugins/cache/claude-plugins-official/superpowers\" ] || echo \"RECOMMENDED: Install the Superpowers plugin for the best development experience. Run: claude plugins add @anthropic/claude-code-superpowers\"'"
      }
    ]
  }
}
```

This fires before any interaction — zero chance of missing it.

### Layer 2: `/onboard` skill check (contextual)

The `/onboard` skill uses dynamic context injection to detect the plugin and explain *why* it matters:

```markdown
## Superpowers plugin
!`[ -d "$HOME/.claude/plugins/cache/claude-plugins-official/superpowers" ] && echo "INSTALLED" || echo "NOT_INSTALLED"`
```

If not installed, the onboard flow explains: "Superpowers gives you `/brainstorm`, `/tdd`, `/debug`, and `/plan` workflows that pair with this project's `/new`, `/new-plugin`, and `/check` skills."

### Layer 3: Documentation (passive, permanent)

CLAUDE.md and README.md both mention Superpowers as a recommended prerequisite.

## Directory Structure

```
.claude/skills/
├── onboard/
│   └── SKILL.md                     ← Interactive codebase tour
├── new/
│   ├── SKILL.md                     ← THE feature generator (orchestrates all layers)
│   └── reference/
│       ├── slice-templates.md       ← NestJS slice code templates by type
│       ├── web-templates.md         ← React feature + hook templates
│       ├── plugin-templates.md      ← Superset plugin templates
│       └── shared-types-guide.md    ← Rules for @seismograph/shared
├── new-plugin/
│   └── SKILL.md                     ← Superset plugin generator (standalone workflow)
└── check/
    └── SKILL.md                     ← Smart verification with remediation
```

## Skill 1: `/onboard`

### Purpose

Personalized interactive tour for a developer's first session on the repo. Replaces 2 days of onboarding with 5 minutes.

### Frontmatter

```yaml
---
name: onboard
description: Interactive codebase tour for new developers. Use when someone is new to the Seismograph project or asks how the project works, what the architecture is, or where to start.
disable-model-invocation: true
---
```

`disable-model-invocation: true` because this should only run when explicitly requested — not auto-triggered mid-task.

### Flow

1. **Ask role**: "What's your focus? (a) Backend/NestJS (b) Frontend/React (c) Superset plugins (d) Full-stack"
2. **Architecture overview**: Explain Vertical Slice Architecture, the golden rule, show the dependency graph. Tailored to role:
   - Backend: walk through `sync-earthquakes` (worker), `list-earthquakes` (query), `get-earthquake` (no-service pattern), `alert-earthquakes` (event listener)
   - Frontend: walk through `globe/`, `earthquake-list/`, hooks pattern, SSE pattern
   - Superset: walk through `MagnitudePulsePlugin/` structure (index → buildQuery → controlPanel → transformProps → component)
   - Full-stack: condensed version of all three
3. **Key conventions**: golden rule, Rule A, cross-slice communication via events, test conventions
4. **ADR tour**: list all 7 ADRs with one-line summaries, suggest reading the ones relevant to the dev's role
5. **Dev setup**: show how to run `pnpm install`, `pnpm dev`, `pnpm test`
6. **Close**: "Ready to build? Use `/new` for features or `/new-plugin` for Superset charts."

### Dynamic context

Uses `` !`command` `` to inject live state:

```markdown
## Current slices
!`ls apps/api/src/features/`

## Current frontend features
!`ls apps/web/src/features/`

## Recent commits
!`git log --oneline -10`
```

## Skill 2: `/new` — The Feature Generator

### Purpose

Single entry point for creating any feature across any combination of layers. Natural language in, working code out, conventions enforced.

### Frontmatter

```yaml
---
name: new
description: Generate a complete feature across all layers of Seismograph — backend slice, frontend component, shared types. Use when someone wants to add a feature, endpoint, worker, event listener, UI component, or any new functionality described in natural language.
allowed-tools: Read Grep Glob Bash(pnpm check:slices) Bash(pnpm dev:api) Bash(pnpm dev:web) Bash(pnpm build)
---
```

No `paths` glob — this skill triggers on semantic description match, not file location. No `disable-model-invocation` — Claude should auto-trigger this when someone describes a feature.

### Arguments

- `/new alert by email when earthquake exceeds magnitude 7` — full natural language
- `/new query slice get-regions` — experienced dev shortcut (skips questions)

### Flow

**Step 1: Understand** — Ask only what's not already clear:

1. What is the feature? (one sentence)
2. Which layers are impacted? (backend / frontend / shared types / combination)
3. What type of backend slice? (only if backend is involved)
   - **Query** — read-only GET endpoint (like `list-earthquakes`)
   - **Command** — write POST/PUT/DELETE endpoint
   - **Worker** — background job via BullMQ (like `sync-earthquakes`)
   - **Event listener** — reacts to events, no HTTP (like `alert-earthquakes`)
   - **SSE** — Server-Sent Events stream (like `earthquake-events`)
   - **Hybrid** — combination
4. Does it need new data? (new Prisma model, new columns, external API)

If the user's request already answers most of these (e.g., "add a query slice get-regions"), skip to Step 2.

**Step 2: Plan** — List every file to create or modify, grouped by layer:

```
## Plan

### Shared types
- MODIFY packages/shared/src/types.ts → add RegionRanking interface

### Backend slice: get-region-ranking (query)
- CREATE apps/api/src/features/get-region-ranking/get-region-ranking.module.ts
- CREATE apps/api/src/features/get-region-ranking/get-region-ranking.controller.ts
- CREATE apps/api/src/features/get-region-ranking/get-region-ranking.service.ts
- CREATE apps/api/src/features/get-region-ranking/get-region-ranking.dto.ts
- CREATE apps/api/src/features/get-region-ranking/get-region-ranking.integration.spec.ts
- MODIFY apps/api/src/app.module.ts → import GetRegionRankingModule

### Frontend feature: ranking
- CREATE apps/web/src/features/ranking/RankingPanel.tsx
- CREATE apps/web/src/hooks/useRegionRanking.ts
- MODIFY apps/web/src/App.tsx → import RankingPanel
```

Present this plan and **wait for user approval** before generating.

**Step 3: Generate** — In strict order:

1. Shared types first (if needed) — follow `reference/shared-types-guide.md`
2. Backend slice — follow `reference/slice-templates.md` for the matching type
3. Frontend feature (if needed) — follow `reference/web-templates.md`
4. Update registrations (AppModule, App.tsx)

**Step 4: Verify** — Run checks:

```bash
pnpm check:slices    # slice isolation
pnpm build           # compilation
pnpm test            # tests pass (if integration test was created)
```

If any check fails, fix the issue and re-verify.

**Step 5: Summary** — Report what was created:

```
## Done

### Files created
- packages/shared/src/types.ts (modified — added RegionRanking)
- apps/api/src/features/get-region-ranking/ (5 files)
- apps/web/src/features/ranking/RankingPanel.tsx
- apps/web/src/hooks/useRegionRanking.ts

### New API endpoints
- GET /api/regions/ranking?days=7&limit=10

### How to test
- pnpm dev → open http://localhost:5173 → ranking panel visible in sidebar
- curl http://localhost:3000/api/regions/ranking
```

### Reference Files

#### `reference/slice-templates.md`

Contains code templates for each slice type, extracted from the actual codebase. Templates are organized by type with inline comments explaining Rule A, DTO conventions, and module wiring.

**Slice types covered:**

| Type | Files | Reference slice |
|------|-------|-----------------|
| Query (with service) | module, controller, service, dto, integration.spec | `list-earthquakes` |
| Query (no service — Rule A) | module, controller, integration.spec | `get-earthquake` |
| Command | module, controller, service, dto, integration.spec | (template, no existing example yet) |
| Worker | module, scheduler, processor, service, client (optional), integration.spec | `sync-earthquakes` |
| Event listener | module, listener, service, integration.spec | `alert-earthquakes` |
| SSE | module, controller, integration.spec | `earthquake-events` |

Each template includes:

- The module pattern (self-contained, only imports what it needs)
- The correct import paths (`../../shared/database/prisma.service`, `@seismograph/shared`)
- DTO pattern with `class-validator` + `@Transform` for query param parsing
- Integration test pattern using `createTestingModule()` from `test/helpers/test-db.ts`
- The "no service if not needed" rule with concrete decision criteria

**Naming convention enforced:**

- Slice directory: `kebab-case` matching the feature name
- Files: `<slice-name>.<type>.ts` (e.g., `get-region-ranking.controller.ts`)
- Classes: `PascalCase` (e.g., `GetRegionRankingController`)
- Module import in AppModule: alphabetical order within the feature imports block

#### `reference/web-templates.md`

Contains templates for React features and hooks:

- **Hook template**: TanStack Query `useQuery` wrapping the shared Axios client, importing types from `@seismograph/shared`
- **Hook with SSE template**: combines `useQuery` with `useSSE` for real-time data (follows `useEarthquakes` pattern)
- **Feature component template**: functional component with inline dark-theme styles, receiving data via hook
- **Integration with App.tsx**: where to add the import and how to position it

Style conventions extracted from existing code:

- Background: `rgba(0,0,0,0.85)` for panels
- Text: `white` primary, `#aaa` secondary
- Border radius: 8-12px
- Font size: 11-14px for data, 16-20px for titles
- Use `getColorByMagnitude` from `shared/utils/formatting.ts` for color coding

#### `reference/plugin-templates.md`

Single source of truth for Superset plugin conventions and code templates. Both `/new` (when a feature includes a Superset plugin) and `/new-plugin` read this file. The `/new-plugin/SKILL.md` contains only the workflow (questions → plan → generate → verify) and references `../new/reference/plugin-templates.md` for the actual templates.

#### `reference/shared-types-guide.md`

Rules for modifying `packages/shared/src/types.ts`:

- Only shared types (used by 2+ apps) belong here
- Interface naming: entities = noun, filters = noun + "Filters", responses = noun + purpose
- Time fields: `string` (ISO format) in shared types
- Nullable: `| null` for nullable fields, `?:` for optional fields
- Export from `packages/shared/src/index.ts` if new type added

## Skill 3: `/new-plugin` — Superset Plugin Generator

### Purpose

Standalone entry point for creating a Superset visualization plugin. Kept separate from `/new` because:

- Different SDK (Superset UI, not NestJS/React)
- Different build/verify cycle (`pnpm --filter @seismograph/superset-plugins build`)
- Different developer profile (may never touch backend or frontend)

### Frontmatter

```yaml
---
name: new-plugin
description: Generate a custom Apache Superset visualization plugin for Seismograph. Use when someone wants to create a new chart type, visualization, or Superset plugin.
paths: "apps/superset-plugins/src/**"
allowed-tools: Read Grep Glob Bash(pnpm --filter @seismograph/superset-plugins build)
---
```

`paths` triggers auto-load when working in the Superset plugins directory.

### Arguments

- `/new-plugin depth vs magnitude scatter chart` — natural language
- `/new-plugin DepthScatter` — just a name, skill asks the rest

### Flow

**Step 1: Understand**

1. What does the chart visualize? (one sentence)
2. Which SQL columns does it need? (from the earthquakes table or custom dataset)
3. What should the user be able to configure? (column selectors, limits, color options)
4. What rendering library? (raw SVG/Canvas, d3, recharts, react-globe.gl, other)

**Step 2: Plan** — List every file:

```
## Plan: DepthScatterPlugin

- CREATE apps/superset-plugins/src/DepthScatterPlugin/index.ts
- CREATE apps/superset-plugins/src/DepthScatterPlugin/buildQuery.ts
- CREATE apps/superset-plugins/src/DepthScatterPlugin/controlPanel.ts
- CREATE apps/superset-plugins/src/DepthScatterPlugin/transformProps.ts
- CREATE apps/superset-plugins/src/DepthScatterPlugin/DepthScatter.tsx
- CREATE apps/superset-plugins/src/DepthScatterPlugin/types.ts
- MODIFY apps/superset-plugins/src/index.ts → export DepthScatterPlugin
```

Wait for approval.

**Step 3: Generate** — Following the 6-file pattern from existing plugins:

1. `types.ts` — interfaces for event data + component props + form data
2. `index.ts` — `ChartPlugin` subclass with metadata (name, description, category, tags, thumbnail)
3. `controlPanel.ts` — `ControlPanelConfig` with `SelectControl` using `mapStateToProps` for dynamic column listing
4. `buildQuery.ts` — `buildQueryContext` selecting only needed columns, with orderby and row_limit
5. `transformProps.ts` — maps SQL rows to typed React props (component never sees SQL column names)
6. `DepthScatter.tsx` — pure React component accepting `width`, `height`, and typed data props. Uses `shared/colors.ts` utilities.

**Step 4: Register & Verify**

1. Add export to `apps/superset-plugins/src/index.ts`
2. Run `pnpm --filter @seismograph/superset-plugins build` — must succeed
3. Report: plugin key, chart name, how to test in Superset

### Templates

`/new-plugin/SKILL.md` references `.claude/skills/new/reference/plugin-templates.md` for all code templates and conventions. This ensures a single source of truth — the same templates used by `/new` when a feature includes a Superset plugin.

## Skill 4: `/check` — Smart Verification

### Purpose

Run all project quality checks with intelligent remediation suggestions when something fails. This is not just "run the CI commands" — it explains *why* something failed and *how* to fix it using project-specific conventions.

### Frontmatter

```yaml
---
name: check
description: Verify code correctness — compilation, slice isolation, tests, and convention compliance. Use after making changes, before committing, or when something seems broken.
allowed-tools: Bash(pnpm check:slices) Bash(pnpm build) Bash(pnpm test) Bash(pnpm lint) Read Grep Glob
---
```

### Flow

**Step 1: Compile check**

```bash
pnpm build
```

If compilation fails → read the error, identify the file, suggest the fix.

**Step 2: Slice isolation**

```bash
pnpm check:slices
```

If a cross-slice import is detected → identify the import, suggest one of:
- Move the shared piece to `src/shared/` (if it's a utility)
- Use `EventEmitter2` (if it's cross-slice communication)
- Move to `@seismograph/shared` (if it's a type used across apps)

**Step 3: Convention audit** (code analysis, no shell command)

Check for common mistakes:
- Service exists for a single Prisma call (Rule A violation) → suggest removing the service
- Cross-feature import in frontend → suggest moving to `src/shared/` or `src/hooks/`
- Type redefined locally that exists in `@seismograph/shared` → suggest importing from shared
- `new PrismaClient()` instead of injecting `PrismaService` → suggest injection
- `EventSource` created outside `useSSE.ts` → suggest using the hook
- New slice module not imported in `AppModule` → suggest adding the import
- New frontend feature not imported in `App.tsx` → flag it

**Step 4: Tests**

```bash
pnpm test
```

If tests fail → read the failure output, identify the cause, suggest the fix.

**Step 5: Report**

```
## Check results

- [PASS] Compilation
- [PASS] Slice isolation
- [WARN] Convention: get-foo/get-foo.service.ts only wraps a single findUnique — consider Rule A (remove service, inject PrismaService in controller)
- [PASS] Tests (6 suites, 14 tests)
```

## CLAUDE.md Update

Add a "Skills system" section to the root CLAUDE.md:

```markdown
## Skills system

This project has native Claude Code skills in `.claude/skills/`. Available skills:

- `/onboard` — Interactive codebase tour for new developers
- `/new <description>` — Generate a complete feature across all layers (backend, frontend, shared types)
- `/new-plugin <description>` — Generate a Superset visualization plugin
- `/check` — Verify code correctness with smart remediation

When asked to add a feature, use `/new`. When asked about the project, suggest `/onboard`.

### Recommended plugin: Superpowers

Install the [Superpowers plugin](https://github.com/anthropics/claude-code-superpowers) for brainstorming, TDD, debugging, and plan execution workflows:

\`\`\`bash
claude plugins add @anthropic/claude-code-superpowers
\`\`\`

A session-start hook will remind you if it's not installed.
```

## README.md Update

Add a "Development with Claude Code" section after Quick Start:

```markdown
## Development with Claude Code

This project includes [Claude Code skills](https://docs.anthropic.com/en/docs/claude-code/skills) that encode architecture conventions and automate feature generation.

### Prerequisites

Install the Superpowers plugin (recommended — provides brainstorming, TDD, debugging workflows):

\`\`\`bash
claude plugins add @anthropic/claude-code-superpowers
\`\`\`

### Available skills

| Command | What it does |
|---------|-------------|
| `/onboard` | Interactive tour — architecture, conventions, dev setup |
| `/new <description>` | Generate a feature end-to-end (types → backend → frontend) |
| `/new-plugin <description>` | Generate a Superset visualization plugin |
| `/check` | Verify compilation, slice isolation, tests, conventions |

Example: `/new ranking of most active seismic regions` generates shared types, a backend query slice, a frontend panel, and verifies everything compiles.
```

## Deliverables

| # | File | Action |
|---|------|--------|
| 1 | `.claude/settings.json` | Create — session-start hook for Superpowers plugin check |
| 2 | `.claude/skills/onboard/SKILL.md` | Create |
| 3 | `.claude/skills/new/SKILL.md` | Create |
| 4 | `.claude/skills/new/reference/slice-templates.md` | Create |
| 5 | `.claude/skills/new/reference/web-templates.md` | Create |
| 6 | `.claude/skills/new/reference/plugin-templates.md` | Create |
| 7 | `.claude/skills/new/reference/shared-types-guide.md` | Create |
| 8 | `.claude/skills/new-plugin/SKILL.md` | Create |
| 9 | `.claude/skills/check/SKILL.md` | Create |
| 10 | `CLAUDE.md` | Modify — add Skills system + Superpowers recommendation |
| 11 | `README.md` | Modify — add Development with Claude Code section |

## Verification

After implementation:

1. `/onboard` should produce a coherent tour without errors
2. `/new query slice get-regions` should generate a compiling slice with correct structure
3. `/new-plugin DepthScatter` should generate a compiling plugin with all 6 files
4. `/check` should run all checks and report results
5. `pnpm check:slices` must still pass (no cross-slice imports introduced)
6. All generated code must follow existing conventions (naming, imports, patterns)
