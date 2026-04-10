# ADR 001 — Vertical Slice Architecture over Layered Architecture

- Status: accepted
- Date: 2026-04-10
- Deciders: Jérémy Moyson

## Context

A Layered Architecture (controllers/services/repositories folders) centralises concerns horizontally. As a project grows, shared services become God Services, and the coupling between unrelated features becomes implicit via shared folders. A developer removing a feature has to edit files scattered across five horizontal layers.

## Decision

Organize the backend by feature: each use case lives in its own folder under `apps/api/src/features/<slice>/`, self-contained, with its own module, controller (if any), service (if any), DTOs, and tests. Slices MUST NOT import from each other — cross-slice communication goes through events or shared infrastructure modules.

## Consequences

**Positive:**
- Complexity scales with the feature, not with the codebase as a whole
- Removing a feature is deleting one folder
- A new developer can understand a single slice without reading the whole backend
- Isolation is testable: each slice has an integration test that mounts only its own module

**Negative:**
- Small duplication is acceptable and expected (YAGNI on premature abstractions)
- Developers used to layered architectures will initially look for a non-existent `services/` folder

**Revisit if:**
- The number of slices exceeds ~30 AND genuine cross-slice duplication starts accumulating. At that point, evaluate extracting domain primitives into `shared/` or splitting into bounded contexts.
