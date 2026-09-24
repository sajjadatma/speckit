---
description: "Dependency-ordered implementation tasks for 001 Platform Foundation"
---

# Tasks: 001 Platform Foundation

**Input**: `specs/001-platform-foundation/{spec,plan,research,data-model,quickstart}.md`, `contracts/{openapi.yaml,frontend-states.md}`, Constitution v1.0.0, [ADR-0001](../../docs/adr/0001-foundation-workspace-contract.md).
**Prerequisites**: No application source or Git repository yet. This is a task plan, not completed work. Review the 39 unchecked questions in reviewer-owned `checklists/foundation.md` and 6 unchecked questions in reviewer-owned `checklists/accessibility.md` before implementation; resolve material gaps in spec/plan first, without automatically checking boxes.
**Tests**: Explicitly requested by FR-016 and Constitution; write story-specific failing tests before implementation, then make them pass. Do not add production fault endpoints for tests.
**Ownership**: One writer for each mutable artifact. The task IDs specify execution order within a phase; `[P]` indicates disjoint files and no dependency on an incomplete task. All relative paths below are repository-root relative.

## Format: `[ID] [P?] [Story] Description`

- `[P]`: Safe to run concurrently only after stated predecessor gates; never overlap the listed write-sets.
- `[USn]`: User story number in `spec.md` (US1–US6).
- Every task requires a handoff with changed paths, relevant check exit codes, and remaining risk; it is not automatically done when code is written.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish a reproducible two-app workspace without adding business behavior. Complete sequential root/lockfile ownership before parallel app work.

- [X] T001 Localize the approved foundation requirements, Constitution v1.0.0, actual empty repository state, exact planned versions, scope exclusions and acceptance mapping into `docs/implementation-brief-001.md` **before application code changes**; record the 39-item reviewer checklist gate and no-Git state.
- [X] T002 Create pinned Corepack pnpm `11.11.0` workspace and Node `24.21.0` declarations in `package.json`, `pnpm-workspace.yaml`, `.nvmrc`, and `.gitignore`; define root `dev`, `typecheck`, `lint`, `format:check`, `test`, `test:e2e`, `contract:check`, `db:check`, `build` script interfaces without fake-pass placeholders.
- [X] T003 Create actually consumed strict shared presets in `packages/tsconfig/package.json`, `packages/tsconfig/base.json`, `packages/eslint-config/package.json`, `packages/eslint-config/index.mjs`, plus root `prettier.config.mjs`; forbid `any` absent documented exception. Do not create empty `packages/shared` or `packages/config`.
- [X] T004 Create independent workspace manifests and app build/test script entry points in `apps/api/package.json`, `apps/web/package.json`, `apps/api/tsconfig.json`, `apps/api/tsconfig.build.json`, `apps/web/tsconfig.json`; typecheck test inputs without emitting tests in the production build, pin plan-approved direct versions, and verify real installed peers (Nest 12/Swagger/TS6, Prisma 7.10 adapter, Next 16, Pino, generator) before generating the **single-owner** `pnpm-lock.yaml` with `corepack pnpm install`. Escalate incompatible pins by updating plan/ADR first, never silently upgrade.
- [X] T005 [P] Provide non-secret examples and explicit ignores in `apps/api/.env.example`, `apps/web/.env.example`, `.gitignore`; keep database URL server-only and never put real credentials in examples.

**Checkpoint**: Frozen install works on declared Node/pnpm versions; root and app scripts are real (or fail clearly until their capability is implemented). Shared preset packages have actual consumers.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish module and integration boundaries before story work. No authentication or domain entities.

- [X] T006 Document one-way `domain → modules → core`, public exports, allowed shared-package consumers, independent app deployment, and no business modules in `docs/architecture.md`; document reserved `packages/shared`/`packages/config` rather than materializing empty packages.
- [X] T007 [P] Establish Nest module/bootstrap skeleton and independent startup entry in `apps/api/src/app.module.ts`, `apps/api/src/main.ts` with core/module boundaries and no domain imports; defer story behavior to US1/US3/US4.
- [X] T008 [P] Establish Next App Router root entry and strict server-first skeleton in `apps/web/src/app/layout.tsx`, `apps/web/src/app/page.tsx`; no business navigation, remote cache, or unneeded client boundary.
- [X] T009 Reconcile `specs/001-platform-foundation/contracts/openapi.yaml` with the approved design and document the single Nest-exported OpenAPI → generated `packages/api-client` pipeline in `docs/api-contract.md`; assign one owner for exported/generated artifacts, and freeze wire shape before US3 implementation.

**Checkpoint**: US1–US6 can start against stable scope, boundaries, package pins, and design contracts; no shared code contract may be independently redefined by story owners.

---

## Phase 3: User Story 1 — Start a New Project (Priority: P1) 🎯 MVP

**Goal**: A fresh checkout can configure a disposable database and start API and web separately; missing configuration fails before serving; migration workflow is reproducible with no business tables.
**Independent Test**: Follow `README.md` on a clean environment; validate separate app starts, absent-setting failure, database connectivity and migration status without needing US2–US6 features.

### Tests for User Story 1 (write failing tests first)

- [X] T010 [P] [US1] Add missing/invalid mandatory API environment and safe error-text tests in `apps/api/test/config.spec.ts`, plus public API-origin parser tests in `apps/web/tests/config.spec.ts`; assert database URL is never echoed, valid port/environment inputs pass, and `NEXT_PUBLIC_API_ORIGIN` accepts only absolute HTTP(S) origins without credentials, path, query, or fragment.
- [X] T011 [P] [US1] Add disposable-database connectivity, lifecycle, and empty-schema/migration status tests in `apps/api/test/database.integration.spec.ts`; assert no business table is invented and connection failure is detected.
- [X] T012 [P] [US1] Add independent web boot/build baseline smoke assertion in `apps/web/tests/startup.spec.ts`; require a neutral page with no business metrics/navigation.

### Implementation for User Story 1

- [X] T013 [US1] Implement typed runtime environment validation and register it at API startup through `apps/api/src/core/config/env.ts`, `apps/api/src/core/config/config.module.ts`, `apps/api/src/app.module.ts`, plus safe public backend-origin config in `apps/web/src/core/config.ts`: required database connection, valid HTTP port/environment, safe public API origin; fail clearly without exposing values. Use schema validation, not TypeScript types alone.
- [X] T014 [US1] Add empty-domain Prisma generator/datasource and version-matched PostgreSQL adapter/client lifecycle in `apps/api/prisma/schema.prisma`, `apps/api/prisma.config.ts`, `apps/api/src/core/database/prisma.service.ts`, `apps/api/package.json`, and `.gitignore`; generate the client before API build/typecheck, ignore generated output in Git, Prettier, and ESLint, confirm `7.10.0` syntax and close on shutdown without a database probe during app startup; preserve liveness while PostgreSQL is unavailable, with readiness owning connection checks; no speculative model.
- [X] T015 [US1] Define reviewed development/deploy/status database scripts in `apps/api/package.json`; verify the empty baseline only on a disposable `TEST_DATABASE_URL`. If Prisma 7.10 does not support a clean empty migration baseline, document its explicit status behavior in `docs/database.md` and update `apps/api/test/database.integration.spec.ts` to assert the expected status without mutation; never create a dummy table or reset/push retained data.
- [X] T016 [US1] Implement the independent neutral web baseline in `apps/web/src/app/page.tsx` and minimal server startup behavior in `apps/api/src/main.ts`; add `apps/api/test/startup.integration.spec.ts` for independent API listener startup; keep apps separately startable/buildable with no frontend import of backend source.
- [X] T017 [US1] Write executable fresh-clone setup, safe environment provisioning, PostgreSQL-only `compose.yaml`, migration steps, and independent app commands in `README.md`, `compose.yaml`, both app `.env.example` files, and `apps/api/package.json`, root `package.json`, and `specs/001-platform-foundation/quickstart.md`; preserve its `db:migrate:dev` interface and command semantics; verify Compose configuration and startup/negative-config/database tests without touching retained data.

**Checkpoint**: US1 passes alone on a disposable DB, both apps start/build independently, and no domain table exists. No claim of the full platform yet.

---

## Phase 4: User Story 2 — Extend Without Crossing Boundaries (Priority: P1)

**Goal**: Developers can place future platform and business modules without core depending upward or shared packages containing domain logic.
**Independent Test**: Inspect documented module placement and run automated dependency-boundary checks on the US1 skeleton; no actual future module is implemented.

### Tests for User Story 2 (write failing checks first)

- [X] T018 [US2] Add architecture boundary tests for forbidden `core → modules/domain`, `modules → domain`, `apps/web → apps/api/src`, and `packages/api-client → apps/api/src`, plus excluded terms in hand-authored shared/config/API-client source; exempt only generated API-client transport templates, which are governed by OpenAPI drift checks; do not create production sample domain modules.

### Implementation for User Story 2

- [X] T019 [US2] Expose the current core public surface through `apps/api/src/core/index.ts` and consume it from `apps/api/src/app.module.ts`; keep `apps/api/src/domain/README.md` documentation-only. Do not create an empty `modules/index.ts`; defer its barrel until T024/T031 add real modules (T020 documents this deferral).
- [X] T020 [US2] Document platform/business placement, public exports, the deferred modules barrel, and the future-module checklist in `docs/architecture.md`; add root `check:boundaries`, lint the boundary script, and include scripts/app docs in root lint/format via `package.json` and scoped `packages/eslint-config/index.mjs`; expose the command in `README.md` and `specs/001-platform-foundation/quickstart.md`; verify no unnecessary `packages/shared` or `packages/config` implementation exists.

**Checkpoint**: The boundary test detects a deliberately introduced forbidden import; no domain feature ships.

---

## Phase 5: User Story 3 — Consume a Defined API (Priority: P1)

**Goal**: Nest is the sole contract authority; a generated client and reusable frontend access layer handle neutral success and categorized failures without backend-source imports. Dev docs are available; production docs routes are absent but artifact remains.
**Independent Test**: Export the Nest contract, compare design/behavior, regenerate client with zero drift, exercise status success/invalid input and four frontend error categories; production docs routes are 404 while build artifact exists.

### Tests for User Story 3 (write failing tests first)

- [X] T021 [P] [US3] Add contract tests for `GET /api/v1/status` with default/`format=summary` → `{data:{status:"operational"}}`, unsupported/unknown query or a GET body → 400 `VALIDATION_FAILED`, and safe 500 shape in `apps/api/test/status.contract.spec.ts`; assert documented 200/400/500, `X-Request-Id`, and use the shared `apps/api/test/helpers/api-server.ts` fixture.
- [X] T022 [P] [US3] Add client success, validation, expected application, offline/service, and unparseable/unexpected classification tests in `apps/web/tests/api-client.spec.ts`; assert no hand-maintained backend payload types.
- [X] T023 [P] [US3] Add dev/prod documentation exposure and generated-build-artifact checks in `apps/api/test/openapi.integration.spec.ts`; require `/api/docs` and `/api/openapi.json` 404 in production and accessible in development.

### Implementation for User Story 3

- [X] T024 [US3] Implement a real status Nest module with thin controller/service, strict optional `format=summary` Zod query validation (reject unknown queries and request bodies), and Swagger metadata matching `specs/001-platform-foundation/contracts/openapi.yaml` in `apps/api/src/modules/status/{status.module.ts,status.controller.ts,status.service.ts}`, `apps/api/src/core/validation/status-query.dto.ts`, `apps/api/src/core/errors/api-error.schema.ts`, `apps/api/src/core/index.ts`, `apps/api/src/modules/index.ts`, `apps/api/src/app.module.ts`, and `docs/architecture.md`; use the shared error schema for Swagger and T025 filtering, and document the now-real status module barrel.
- [X] T025 [US3] Implement centralized safe response/error handling and request-ID header plumbing in `apps/api/src/core/errors/http-exception.filter.ts`, `apps/api/src/core/logging/request-id.middleware.ts`, `apps/api/src/main.ts`; consume T024's `api-error.schema.ts`; `error` requires `code`, `category`, `message`, optional bounded `details` (max 20 field/code entries), plus UUID `requestId`; never return stack/raw values. Replace malformed incoming IDs.
- [X] T026 [US3] Export actual Nest OpenAPI to `apps/api/dist/openapi.json` as a build artifact and mount `/api/docs` and `/api/openapi.json` only in development via `apps/api/src/core/observability/openapi.ts`, `apps/api/scripts/export-openapi.ts`, and `apps/api/src/main.ts`; wire export into `apps/api/package.json` build and typecheck/lint the script through `apps/api/tsconfig.json`/lint; preserve the artifact without a public production route.
- [X] T027 [US3] Create `packages/api-client` with a public `src/index.ts` entrypoint and generate `src/generated/` from `apps/api/dist/openapi.json` using `@hey-api/openapi-ts@0.99.0` and its TypeScript 6 peer; add deterministic scripts, Node-compatible generated import extensions, replace `apps/api` `contract:check` with the Git-independent drift check in `scripts/check-contract.mjs`, update `pnpm-lock.yaml`, and activate/document the root contract gate in `README.md` and `specs/001-platform-foundation/quickstart.md`; generated files have one owner and no manually duplicated payload interfaces.
- [X] T028 [US3] Implement environment-aware reusable frontend access/error layer in `apps/web/src/lib/api/client.ts`, `apps/web/src/lib/api/errors.ts` consuming only `packages/api-client`, with bounded network failure handling and no server data mirrored into Zustand.

**Checkpoint**: Status API, exported contract, generated client, and independent frontend access tests pass; production docs gate and build artifact pass. US3 depends on US1 and frozen API boundary, but its contract checks run independently.

---

## Phase 6: User Story 4 — Operate and Diagnose the Backend (Priority: P2)

**Goal**: Operational liveness/readiness and safe request diagnostics; the frontend distinguishes and presents service errors.
**Independent Test**: Check live/ready with DB up/down, inspect matched response/log ID for expected/unexpected failures, and verify no sensitive diagnostics are public.

### Tests for User Story 4 (write failing tests first)

- [X] T029 [P] [US4] Add health contract/integration tests for `/health/live` 200 independent of DB, `/health/ready` 200 with `status=ready,database=up` and 503 with `status=not_ready,database=down`, both with UUID `requestId`, in `apps/api/test/health.integration.spec.ts`.
- [X] T030 [P] [US4] Add structured-log/correlation and redaction tests for absent/malformed client ID, safe validation/internal failures and no credentials, raw PII, bodies, queries or connection URL in `apps/api/test/diagnostics.spec.ts`.

### Implementation for User Story 4

- [X] T031 [US4] Implement bounded real database readiness query and DB-independent liveness in `apps/api/src/modules/health/health.controller.ts`, `apps/api/src/modules/health/health.service.ts`; return 503 without connection details on DB failure, matching `contracts/openapi.yaml`.
- [X] T032 [US4] Configure Pino-compatible structured logging, redaction and request-ID propagation in `apps/api/src/core/logging/logger.module.ts`, `apps/api/src/core/logging/request-id.middleware.ts`, `apps/api/src/core/errors/http-exception.filter.ts`; log timestamp, level, ID, method, route template, status, duration and bounded category without secret-bearing raw fields.
- [X] T033 [US4] Connect service/network and unexpected categories to reusable frontend safe fallback in `apps/web/src/lib/api/errors.ts` and `apps/web/src/features/foundation/service-error.tsx`, keeping backend stack traces out of UI.

**Checkpoint**: Database outage produces live 200/ready 503, response IDs match redacted logs, and frontend service fallback is non-success. US4 reuses US3 error/ID contracts; do not edit them in parallel.

---

## Phase 7: User Story 5 — Use a Neutral Frontend Shell (Priority: P2)

**Goal**: Responsive and accessible neutral shell with loading, empty, error, not-found and unexpected-render-failure fallback states.
**Independent Test**: View baseline and states at narrow/wide widths, inspect keyboard-operable recovery/focus, unknown route and route/global error fallbacks; no business metrics, form or authentication.

### Tests for User Story 5 (write failing tests first)

- [X] T034 [P] [US5] Add logic-level state tests for all state patterns in `apps/web/tests/foundation-states.spec.ts` using `contracts/frontend-states.md`; Node cannot execute `.tsx`, so keyboard-operable control and visible-focus behaviour moves to the T035 browser smoke while these tests cover the shared state descriptors in `apps/web/src/features/foundation/foundation-states.ts`.
- [X] T035 [P] [US5] Add Playwright browser smoke for baseline, narrow/wide shell, keyboard-operable controls with visible focus, missing route and safe error fallback in `apps/web/tests/foundation.e2e.spec.ts` plus `apps/web/playwright.config.ts`; use test fixtures/injected failures, not production fault routes, and the already-cached browsers.

### Implementation for User Story 5

- [X] T036 [US5] Implement root shell and responsive Tailwind foundation in `apps/web/src/app/layout.tsx`, `apps/web/src/app/page.tsx`, `apps/web/src/styles/globals.css`; use only needed shadcn-generated primitive/Lucide icon, no business-specific content and Server Components by default.
- [X] T037 [US5] Implement reusable loading/empty/error states and route/global boundaries in `apps/web/src/components/foundation-states.tsx`, `apps/web/src/app/loading.tsx`, `apps/web/src/app/error.tsx`, `apps/web/src/app/global-error.tsx`, `apps/web/src/app/not-found.tsx`; accessible state text, focus and keyboard recovery, low client boundary.
- [X] T038 [US5] Add a Zustand local UI/workflow store **only if the neutral shell has a real client-owned interaction** in `apps/web/src/features/foundation/ui-store.ts`; otherwise document intentional deferral in `docs/architecture.md` and do not create an empty store. Do not add React Hook Form/TanStack Query solely for this story or cache status globally.

**Checkpoint**: The five states and neutral layout are independently inspectable and tested at both viewport widths; no speculative business UI or fake interaction.

---

## Phase 8: User Story 6 — Run Quality Checks (Priority: P2)

**Goal**: A developer can run repeatable root and independent workspace checks, including negative paths, migrations, contract export and production builds.
**Independent Test**: On a fresh configured environment run every command in `quickstart.md`; deliberate invalid config/input/schema is detected, rather than yielding false success.

### Tests for User Story 6 (write failing checks first)

- [X] T039 [P] [US6] Add script-gate negative-path tests (missing config, invalid query, contract drift, migration drift) to `scripts/test-quality-gates.mjs`, using isolated disposable fixtures/DB and no changes to production env.
- [X] T040 [P] [US6] Add end-to-end root CI smoke assertions to `apps/web/tests/foundation.e2e.spec.ts` only after T035 ownership releases that file; ensure backend/frontend independent startup and health/API journey are covered without overlapping writers.

### Implementation for User Story 6

- [X] T041 [US6] Wire real root `typecheck`, `lint`, `format:check`, `test`, `test:e2e`, `contract:check`, `db:check`, `build` commands in `package.json`, `apps/api/package.json`, `apps/web/package.json`; no no-op success, check generated artifact/client drift and schema state.
- [X] T042 [US6] Add minimal `.github/workflows/ci.yml` with pinned Node/pnpm, disposable PostgreSQL, frozen install, type/lint/format, negative-path unit/integration, contract/migration, browser smoke and independent production builds; no deploy credentials or deployment job.
- [X] T043 [US6] Document every root/filtered command, expected outcome and troubleshooting for a fresh checkout in `README.md`, `docs/database.md` and reconcile `specs/001-platform-foundation/quickstart.md`; record version-matched Prisma deploy/status commands, never reset/push retained data.

**Checkpoint**: All documented gates have explicit pass/fail, CI runs on the exact revision, and independent builds/startups are evidenced. US6 depends on completed capability scripts but its CI/doc ownership is separate.

---

## Phase 9: Polish & Cross-Cutting Review

**Purpose**: Exact-revision integration and release-risk review, not adding features.

- [X] T044 Reconcile `specs/001-platform-foundation/spec.md`, `specs/001-platform-foundation/plan.md`, `specs/001-platform-foundation/contracts/openapi.yaml` with actual Nest export and all 18 acceptance criteria; if behavior diverges, update approved artifacts first rather than silently changing code. Preserve Constitution and dev-only docs rule.
- [X] T045 [P] Review `.gitignore`, `pnpm-lock.yaml`, `apps/api/.env.example`, `apps/web/.env.example`, `apps/api/prisma/`, and `packages/` for secret hygiene, extra dependencies, speculative entities/packages, and migration safety; write findings/evidence in `docs/review-001.md` without changing another active owner's files.
- [X] T046 Run the complete `specs/001-platform-foundation/quickstart.md` walkthrough against the exact integrated revision and record commands, exit codes, HTTP 200/400/503/404, independent builds, Playwright viewport evidence, contract/client drift, DB status, remaining risks and rollback notes in `docs/verification-001.md`; request independent QA verdict before declaring done.

**Checkpoint**: Only Orchestrator may declare technical completion after reviewing exact-revision QA, runtime, build, tests, contracts, migrations and remaining risks. An unchecked custom requirements-quality checklist is not implementation completion evidence.

---

## Dependencies & Execution Order

### Phase dependencies

- **Setup** T001 → T002 → T003/T005 (disjoint paths after T002) → T004 lockfile ownership. T001 must precede code edits.
- **Foundational** T006–T009 depend on setup; T007 and T008 are parallel after manifests. T009 freezes shared API design. No story work before foundational gate.
- **US1** T010–T012 tests can proceed in parallel after foundation; T013–T017 establish actual app/database startup. **MVP checkpoint** requires US1 pass.
- **US2** after foundational; T018–T020 may overlap US1 only if US1 does not edit `apps/api/src/core/index.ts`, `apps/api/src/modules/index.ts` or `docs/architecture.md`. Otherwise serialize. Its boundary checks use US1 skeleton.
- **US3** after US1 and T009. T021–T023 test files are disjoint; T024 → T025 → T026 → T027 → T028 serializes API export, generated client and frontend adapter. Do not generate client before Nest contract is stable.
- **US4** after US1 and US3's error/ID contract (T025). T029/T030 tests are disjoint; T031/T032 share API core with US3 and must be serialized; T033 follows T028.
- **US5** after independent Next skeleton; T034/T035 disjoint tests, but T036 must follow US1 baseline page ownership release, and T037 shares UX integration with T033. T038 depends on demonstrated real local-state need.
- **US6** after US1/US3/US4/US5 gates; T040 is serialized after T035 on the same E2E file. Root scripts and CI depend on the actual capability commands.
- **Polish** T044–T046 after all required stories; T045 evidence-only can overlap T044 if no shared edits. T046 after all artifacts frozen.

### Parallel examples (safe write-sets only)

| Gate | Parallel tasks | Disjoint write-sets and boundary |
|---|---|---|
| Setup after T002 | T003 + T005 | `packages/{tsconfig,eslint-config}`/prettier versus app env examples/ignore; serialize `.gitignore` edits with T002 first. |
| Foundation after manifests | T007 + T008 | API skeleton versus web skeleton. |
| US1 after foundation | T010 + T011 + T012 | Three separate test files in API config/API DB/web startup. |
| US3 after T009/US1 | T021 + T022 + T023 | API status test, web client test, API documentation test. |
| US4 after contract freeze | T029 + T030 | Health versus diagnostics tests; core implementation remains serialized with US3. |
| US5 after Next baseline | T034 + T035 | Component states versus browser E2E files; T040 cannot touch E2E until T035 hands off. |
| US6 after capabilities | T039 + T040 | Script-gate test versus E2E file (only after T035); CI/root scripts stay one writer. |

Do **not** run multiple agents against root `package.json`/`pnpm-lock.yaml`, Prisma migrations, shared contract, `apps/api/src/main.ts`, request-ID/error files, generated client, `README.md`, or the same E2E file concurrently. Serialized handoffs are more important than maximum concurrency.

## Implementation Strategy

1. **MVP first:** complete Setup + Foundational + US1 (T001–T017); validate independent starts, negative config and DB migration. This is an independently useful fresh-start slice, not completion of the full feature.
2. Add boundary assurance (US2), then contract-first API/client (US3), operational diagnostics (US4), neutral frontend states (US5), and root quality/CI (US6). Recheck each story independently at its checkpoint.
3. Perform exact-revision cross-cutting verification and independent QA. Do not deploy merely because tests pass. No Git branch currently exists; create version-control context before integration if required by the delivery process.

## Notes

- `[P]` means disjoint files and no outstanding prerequisite—not a blanket permission to parallelize whole story phases.
- Tests are explicitly required by the spec; write failure-path tests first, observe failure, then implement and rerun. Retain raw exit-code evidence.
- Source files/paths above are planned write-sets; the repository currently has no applications. A task encountering incompatible version-specific behavior must escalate for plan/ADR correction rather than invent a workaround.
- No user/role/auth, business table, fake form, queue, Redis, billing, notifications, file upload, audit, tenancy, WebSocket, search, microservice, Kubernetes, CQRS or Event Sourcing task is authorized.

---

## Phase 10: Convergence

**Purpose**: Close the gaps found by `/speckit-converge` between the delivered revision and `spec.md`, `plan.md`, and the constitution. Appended after T001–T046 and independent QA; ordered CRITICAL/HIGH first. No existing task was modified or renumbered.

- [X] T047 Close the FR-012/SC-006 gap: surface the `empty` and `unexpected` shared states (currently descriptors with no rendered surface), extend `apps/web/tests/foundation.e2e.spec.ts` to exercise every shared state at the narrow and wide viewports, and record the chosen viewport bounds in `specs/001-platform-foundation/contracts/frontend-states.md`, per FR-012/SC-006 (partial).
- [X] T048 Close the FR-013/US3.2 gap: resolve the deferred allow-origin decision (implement an approved explicit origin policy or record an approved deferral in `plan.md`) and add a browser test that proves the frontend success path across the real web→API origins instead of fulfilling the request inside the test, per FR-013/plan decision 3 (partial).
- [X] T049 Close the FR-007 gap: route unmatched requests through the standard safe-error envelope so unknown routes return the documented error shape instead of the framework default body, with tests, per FR-007 (partial).
- [X] T050 Close the FR-002/Constitution IV gap: remove or explicitly justify every pinned dependency that has no consumer (`@nestjs/terminus`, `zustand`, `lucide-react`) and rerun all gates, per FR-002/Constitution IV (contradicts).
- [X] T051 Close the SC-001/US1.1 gap: rehearse the documented setup and independent startup in a fresh workspace copy (no Git required) and record the raw evidence, per SC-001/US1.1 (partial).
- [X] T052 Close the SC-002 gap: reconcile the "18 acceptance criteria" count with the 17 enumerated and mapped acceptance scenarios in `spec.md`, or add the missing criterion with its verification path, per SC-002/CHK020 (partial).
- [X] T053 Remove the leftover template "Sync Impact Report … remove before committing" comment from `.specify/memory/constitution.md`, per constitution governance hygiene (contradicts).
