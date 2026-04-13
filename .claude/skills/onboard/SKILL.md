---
name: onboard
description: Interactive codebase tour for new developers. Use when someone is new to the Seismograph project or asks how the project works, what the architecture is, or where to start.
disable-model-invocation: true
---

# Welcome to Seismograph

Interactive onboarding for new developers. This tour adapts to your role and gives you everything you need to start contributing.

## Live repo state

### Backend slices
!`ls apps/api/src/features/`

### Frontend features
!`ls apps/web/src/features/`

### Superset plugins
!`ls apps/superset-plugins/src/ | grep Plugin`

### Recent activity
!`git log --oneline -5`

### Superpowers plugin
!`[ -d "$HOME/.claude/plugins/cache/claude-plugins-official/superpowers" ] && echo "INSTALLED" || echo "NOT_INSTALLED"`

---

## Tour flow

### 1. Check Superpowers plugin

If the dynamic context above shows `NOT_INSTALLED`, start with:

> **Recommended:** Install the Superpowers plugin for brainstorming, TDD, debugging, and plan execution workflows that pair with this project's skills:
>
> ```bash
> claude plugins add @anthropic/claude-code-superpowers
> ```

### 2. Ask the developer's role

> What's your focus on this project?
>
> **(a)** Backend / NestJS
> **(b)** Frontend / React
> **(c)** Superset plugins
> **(d)** Full-stack

### 3. Architecture overview (tailored to role)

Explain Vertical Slice Architecture and the golden rule. Read and reference `CLAUDE.md` for the authoritative conventions.

**For Backend developers:**
- Walk through these reference slices, reading key files:
  - `sync-earthquakes/` — **Worker** pattern: scheduler + processor + service + BullMQ queue
  - `list-earthquakes/` — **Query** pattern: controller + service + DTO with class-validator
  - `get-earthquake/` — **Rule A** pattern: no service, controller injects PrismaService directly
  - `alert-earthquakes/` — **Event listener** pattern: reacts to `earthquakes.synced` via EventEmitter2
  - `earthquake-events/` — **SSE** pattern: manages client connections with RxJS Subject
- Explain shared modules: `src/shared/database/`, `src/shared/events/`, `src/shared/queue/`
- Show test conventions: read `apps/api/test/helpers/test-db.ts`, explain Testcontainers + real DB

**For Frontend developers:**
- Walk through these features, reading key files:
  - `globe/` — main 3D visualization with react-globe.gl
  - `earthquake-list/` — data list consuming `useEarthquakes` hook
  - `statistics/` — dashboard consuming `useStatistics` hook
- Explain the hooks pattern: `src/hooks/useEarthquakes.ts` (TanStack Query + SSE)
- Explain the SSE pattern: `src/hooks/useSSE.ts` (single EventSource consumer)
- Show the API client: `src/api/client.ts`

**For Superset developers:**
- Walk through `MagnitudePulsePlugin/` file by file:
  - `index.ts` → plugin registration with ChartPlugin/ChartMetadata
  - `controlPanel.ts` → dynamic column selection with mapStateToProps
  - `buildQuery.ts` → SQL query construction with buildQueryContext
  - `transformProps.ts` → SQL rows to typed React props (column name mapping)
  - `MagnitudePulse.tsx` → pure React component
  - `types.ts` → TypeScript interfaces
- Show shared utilities: `src/shared/colors.ts`, `src/shared/thumbnail.ts`

**For Full-stack developers:**
- Condensed version: one reference slice (list-earthquakes), one frontend feature (earthquake-list), the hook that connects them, and how SSE provides real-time updates

### 4. Key conventions

Highlight the critical rules (read from CLAUDE.md files):
- **The golden rule**: slices/features never import from each other
- **Rule A**: no service if it's just a single Prisma call
- **Cross-slice communication**: EventEmitter2, never direct imports
- **Tests**: real DB via Testcontainers, never mock PrismaService

### 5. ADR tour

List all Architecture Decision Records with one-line summaries. Read titles from `docs/adr/`:

| ADR | Decision |
|-----|----------|
| 001 | Vertical Slice Architecture over layered |
| 002 | Server-Sent Events over WebSocket |
| 003 | BullMQ over direct cron |
| 004 | pnpm workspaces over Turborepo |
| 005 | USGS feed polling pattern |
| 006 | Testcontainers + OrbStack for integration tests |
| 007 | dependency-cruiser for slice isolation |

Suggest the developer read the ADRs relevant to their role.

### 6. Dev setup

```bash
brew install orbstack graphviz  # prerequisites (tests + graph generation)
pnpm install
pnpm dev                        # starts api + web in parallel
pnpm test                       # runs all tests (requires OrbStack/Docker)
pnpm check:slices               # verifies slice isolation
```

### 7. Close

> You're all set! Here's how to build things:
>
> - **`/new <description>`** — generate a complete feature (backend + frontend + types)
> - **`/new-plugin <description>`** — generate a Superset visualization plugin
> - **`/check`** — verify your code before committing
>
> Example: `/new ranking of most active seismic regions`
