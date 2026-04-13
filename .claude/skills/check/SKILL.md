---
name: check
description: Verify code correctness — compilation, slice isolation, tests, and convention compliance. Use after making changes, before committing, or when something seems broken.
allowed-tools: Bash(pnpm check:slices) Bash(pnpm build) Bash(pnpm test) Bash(pnpm lint) Read Grep Glob
---

# Smart Verification

Run all quality checks with intelligent remediation. Not just pass/fail — explains WHY something failed and HOW to fix it using this project's conventions.

## Step 1: Compile check

```bash
pnpm build
```

If compilation fails:
- Read the error message
- Identify the file and line
- Suggest the specific fix (missing import, type mismatch, etc.)

## Step 2: Slice isolation

```bash
pnpm check:slices
```

If a cross-slice import is detected, suggest one of:
- **Move to `src/shared/`** if it's a utility used by multiple slices
- **Use `EventEmitter2`** if it's cross-slice communication (see `alert-earthquakes` for the pattern)
- **Move to `@seismograph/shared`** if it's a type used across apps (api + web)

## Step 3: Convention audit

Scan recently changed files for common mistakes. Check each of these:

### Backend conventions
- **Rule A violation**: service exists but only wraps a single Prisma call → suggest removing the service and injecting `PrismaService` directly in the controller
- **Cross-slice import**: any file in `features/<slice>/` importing from `features/<other-slice>/` → violation of the golden rule
- **Direct PrismaClient**: `new PrismaClient()` anywhere → must use `PrismaService` injection
- **Missing module registration**: new slice module not imported in `apps/api/src/app.module.ts`
- **Missing integration test**: slice directory has no `*.integration.spec.ts` file

### Frontend conventions
- **Cross-feature import**: any file in `features/<feature>/` importing from `features/<other>/` → move to `shared/` or `hooks/`
- **Type redefinition**: interface that duplicates one from `@seismograph/shared` → import from shared
- **Direct EventSource**: `new EventSource()` outside `hooks/useSSE.ts` → use the hook
- **Direct axios**: `axios.create()` or `axios.get()` outside `api/client.ts` → use `apiClient`
- **Missing App.tsx import**: new feature component not imported in App.tsx

### Superset conventions
- **Missing export**: plugin not exported from `apps/superset-plugins/src/index.ts`
- **Missing behaviors**: ChartMetadata without `behaviors: [Behavior.InteractiveChart]`
- **Missing thumbnail**: ChartMetadata without `thumbnail` property

## Step 4: Tests

```bash
pnpm test
```

If tests fail:
- Read the failure output
- Identify the failing test and the root cause
- Suggest the specific fix

## Step 5: Report

Format results as:

```
## Check results

- [PASS] Compilation
- [PASS] Slice isolation
- [PASS] Conventions (or list specific warnings)
- [PASS] Tests (N suites, M tests)
```

Use `[WARN]` for convention issues that aren't errors but should be fixed. Use `[FAIL]` for hard failures.
