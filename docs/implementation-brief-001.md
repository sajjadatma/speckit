# Implementation Brief — 001 Platform Foundation

## Objective and authority

Implement the approved Platform Foundation in this repository according to `specs/001-platform-foundation/spec.md`, `plan.md`, `tasks.md`, the design contracts, ADR-0001, and `.specify/memory/constitution.md` v1.0.0. Product behavior and exclusions in the spec control; technical decisions and exact candidate versions in the plan control unless installed peer/version verification proves a blocker. Escalate incompatible or ambiguous contracts rather than inventing behavior.

## Repository state at handoff

The project root is `/Users/sajad/Documents/Tasks/arghavan/my-project`. It presently contains Spec Kit artifacts and documentation only: no application code, workspace manifest, lockfile, database, or Git repository. Do not claim or create a Git branch. Host versions observed: Node `v25.9.0`, Corepack `0.34.6`, pnpm `11.11.0`, Docker `29.6.1`. Registry lookups confirmed published versions for TypeScript `6.0.3`, NestJS Core `12.1.0`, Next.js `16.3.6`, Prisma `7.10.0`, and `@hey-api/openapi-ts` `0.99.0`. Required Node pin is `24.21.0`; do not silently replace it with host Node 25.9.0.

## Scope

Build independent `apps/api` (NestJS modular monolith, Prisma/PostgreSQL) and `apps/web` (Next.js App Router) in a pinned pnpm workspace. Implement only the neutral foundation: validated config, safe examples, DB initialization/migrations with no domain tables, status/health API, OpenAPI artifact and generated API client, safe errors/correlation/redacted structured logs, neutral accessible responsive frontend shell/states, documented quality commands and minimal CI. Treat local UI state as conditional on an actual in-scope interaction; do not invent a stateful interaction or duplicate server data. Keyboard-operable controls and visible focus are required. Interactive docs and OpenAPI HTTP route are development-only; generated production artifact remains.

## Out of scope

No authentication, users, roles, organizations/tenancy, business entities/workflows/UI, fake forms, speculative queues/Redis/microservices, deployment infrastructure, credentials, or push/commit. Do not create empty `packages/shared` or `packages/config`. Do not use destructive DB commands against retained data. The DB should be disposable/local/CI only.

## Dependencies, ownership, and sequencing

Follow the exact dependency graph and per-task write-sets in `tasks.md`, one active writer per artifact. T001 is completed before application code. Root manifests and `pnpm-lock.yaml` have a single owner. Freeze the OpenAPI/API-client contract before downstream frontend work. Preserve all custom reviewer checklists unchanged. In particular, do not mark their checkbox items complete. The user explicitly authorized proceeding despite unchecked reviewer-owned checklists.

## Verification and evidence

Use test-first ordering where the task specifies tests. Verify installed direct/transitive peer compatibility and version-matched Nest/Prisma commands before locking them. If pins cannot resolve on Node 24/pnpm 11 or official version-matched docs conflict, stop and report a blocker; do not upgrade silently. Run applicable lint/typecheck/unit/integration/database/build/browser gates and capture exit codes/counts. Probe API success/validation/readiness, docs dev/prod exposure, generated OpenAPI artifact/client drift, no domain tables, safe logs, accessibility focus/keyboard, separate app startup/build, and fresh quickstart. Mark a task `[X]` only after its work and required verification have evidence. No declaration of technical completion until exact-revision acceptance, tests/build, runtime, security, migration and QA evidence are reviewed.

## Key references

- `specs/001-platform-foundation/spec.md`
- `specs/001-platform-foundation/plan.md`
- `specs/001-platform-foundation/tasks.md`
- `specs/001-platform-foundation/research.md`
- `specs/001-platform-foundation/data-model.md`
- `specs/001-platform-foundation/contracts/openapi.yaml`
- `specs/001-platform-foundation/contracts/frontend-states.md`
- `specs/001-platform-foundation/quickstart.md`
- `specs/001-platform-foundation/checklists/foundation.md` (reviewer-owned; do not edit)
- `specs/001-platform-foundation/checklists/accessibility.md` (reviewer-owned; do not edit)
- `.specify/memory/constitution.md`
