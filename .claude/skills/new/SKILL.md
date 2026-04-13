---
name: new
description: Generate a complete feature across all layers of Seismograph — backend slice, frontend component, shared types. Use when someone wants to add a feature, endpoint, worker, event listener, UI component, or any new functionality described in natural language.
allowed-tools: Read Grep Glob Bash(pnpm check:slices) Bash(pnpm dev:api) Bash(pnpm dev:web) Bash(pnpm build) Bash(pnpm test)
---

# Feature Generator

Generate a complete feature across any combination of layers in the Seismograph project. Conventions are enforced automatically — the generated code follows the same patterns as existing slices and features.

User request: $ARGUMENTS

## Live repo state

### Current backend slices
!`ls apps/api/src/features/`

### Current frontend features
!`ls apps/web/src/features/`

### Current shared types
!`grep "^export interface" packages/shared/src/types.ts`

---

## Process

### Step 1: Understand the requirement

If `$ARGUMENTS` already specifies the feature clearly (e.g., "query slice get-regions"), skip the questions and go directly to the plan. Otherwise, ask only what's not already clear:

1. **What is the feature?** (one sentence)
2. **Which layers?** Backend / Frontend / Shared types / combination
3. **Backend slice type?** (only if backend involved)
   - **Query** — read-only GET endpoint (like `list-earthquakes`)
   - **Command** — write POST/PUT/DELETE endpoint
   - **Worker** — background job via BullMQ (like `sync-earthquakes`)
   - **Event listener** — reacts to events, no HTTP (like `alert-earthquakes`)
   - **SSE** — Server-Sent Events stream (like `earthquake-events`)
   - **Hybrid** — combination
4. **New data needed?** New Prisma model, new columns, external API?

### Step 2: Plan

List every file to create or modify, grouped by layer. Use this format:

```
## Plan

### Shared types (if needed)
- MODIFY packages/shared/src/types.ts → add <Interface> interface

### Backend slice: <name> (<type>)
- CREATE apps/api/src/features/<name>/<name>.module.ts
- CREATE apps/api/src/features/<name>/<name>.controller.ts
- CREATE ... (only the files needed for this slice type)
- MODIFY apps/api/src/app.module.ts → import <Name>Module

### Frontend feature: <name> (if needed)
- CREATE apps/web/src/features/<name>/<Name>.tsx
- CREATE apps/web/src/hooks/use<Name>.ts
- MODIFY apps/web/src/App.tsx → import <Name>
```

**Present the plan and wait for user approval before generating any code.**

### Step 3: Generate code

Follow this strict order:

1. **Shared types first** — see [shared-types-guide.md](reference/shared-types-guide.md)
2. **Backend slice** — see [slice-templates.md](reference/slice-templates.md) for the matching type
3. **Frontend feature** — see [web-templates.md](reference/web-templates.md) if frontend is involved
4. **Superset plugin** — see [plugin-templates.md](reference/plugin-templates.md) if Superset is involved
5. **Update registrations** — AppModule imports, App.tsx imports

### Step 4: Verify

Run in this order, fix any issues before proceeding:

```bash
pnpm check:slices    # slice isolation — no cross-slice imports
pnpm build           # both apps compile
pnpm test            # all tests pass
```

### Step 5: Summary

After all checks pass, report:

```
## Done

### Files created/modified
- (list every file)

### New API endpoints (if any)
- METHOD /api/<route> — description

### How to test
- (manual testing instructions)
```
