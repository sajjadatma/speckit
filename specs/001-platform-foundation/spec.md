# Feature Specification: 001 Platform Foundation

**Feature Branch**: Not created (repository is not initialized as Git)
**Created**: 2026-09-24
**Status**: Reconciled against the delivered local system; final integrated walkthrough and independent QA remain pending.
**Input**: User's “001 Platform Foundation” brief; governed by `.specify/memory/constitution.md` v1.0.0.

## Clarifications

### Session 2026-09-24

- Q: Should the interactive API documentation page be available in production, or only in development? → A: Development-only interactive page; generate an API specification for production builds.
- Q: Should the neutral frontend shell and its shared states be usable with a keyboard, including visible focus and keyboard-operable controls? → A: Require keyboard access, visible focus, and keyboard-operable controls.
- Q: Should the foundation merely establish the rule that future local UI state must not duplicate server data, without adding a stateful UI example until an in-scope interaction needs one? → A: Local UI state is used only when a real in-scope interaction needs it; do not invent a stateful example or store for the foundation.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Start a New Project (Priority: P1)

As a developer, I want to prepare a fresh clone and run the backend and frontend separately so I can start product work without rebuilding infrastructure.

**Why this priority**: A usable starter must start predictably before extensions can be built.

**Independent Test**: Follow only the documented prerequisites and setup in a fresh environment, start each application independently, and verify baseline behavior.

**Acceptance Scenarios**:

1. **Given** a fresh checkout and documented prerequisites, **when** a developer follows local setup instructions with safe example configuration, **then** both applications start separately without undocumented steps.
2. **Given** a missing or invalid mandatory setting, **when** the backend starts, **then** startup fails with a clear, non-sensitive explanation.
3. **Given** valid database configuration, **when** the developer follows documented initialization, **then** connectivity can be verified and schema changes applied reproducibly without business tables.

---

### User Story 2 - Extend Without Crossing Boundaries (Priority: P1)

As a developer, I want clear core, platform, and business-domain boundaries so future capabilities can be added without restructuring or contaminating the reusable core.

**Why this priority**: Reuse across unrelated business applications is the primary purpose.

**Independent Test**: Inspect the repository and developer guide; identify where a future platform capability and a future business feature belong and verify the intended dependency direction.

**Acceptance Scenarios**:

1. **Given** a future platform capability, **when** a developer identifies its placement, **then** it can reuse core capabilities without duplicating them or depending on a business domain.
2. **Given** a future business capability, **when** a developer identifies its placement, **then** its code stays separate from reusable platform and core concerns.
3. **Given** the initial foundation, **when** its behavior and data definitions are reviewed, **then** no business-specific entities, metrics, navigation, or workflows exist.

---

### User Story 3 - Consume a Defined API (Priority: P1)

As a frontend developer, I want a documented API boundary and reusable communication behavior so the frontend does not rely on backend internals.

**Why this priority**: Independent applications require a verifiable integration contract.

**Independent Test**: Retrieve the backend's published contract and exercise successful and failing requests through the frontend access layer; verify contract-derived payload definitions.

**Acceptance Scenarios**:

1. **Given** a development backend, **when** a developer opens interactive API documentation, **then** it reflects available baseline capabilities; **given** a production build, **when** its generated API specification is inspected, **then** it is available as a build artifact while the interactive documentation page is unavailable.
2. **Given** a successful or failed backend response, **when** the frontend receives it, **then** its access layer yields predictable success or categorized error behavior without importing backend implementation code.
3. **Given** invalid input at an exposed request boundary, **when** a request is made, **then** validation rejects it using the standard error convention.

---

### User Story 4 - Operate and Diagnose the Backend (Priority: P2)

As an operator or developer, I want health information, correlated requests, and safe diagnostics so I can detect unavailability and investigate failures.

**Why this priority**: An independently operated backend must be observable before feature traffic is added.

**Independent Test**: Check readiness with and without database connectivity, provoke expected and unexpected failures, and correlate responses with structured logs without leaking secrets.

**Acceptance Scenarios**:

1. **Given** an operational backend and essential dependencies, **when** readiness is checked, **then** it reports ready; **when** required database connectivity fails, **then** it does not report ready.
2. **Given** a failing request, **when** its response and logs are inspected, **then** a request identifier correlates them and no sensitive internal details appear in the public response.
3. **Given** network/service, validation, expected application, and unexpected failures, **when** the frontend handles each, **then** it distinguishes their categories and shows a reusable error state.

---

### User Story 5 - Use a Neutral Frontend Shell (Priority: P2)

As a developer, I want a responsive, neutral application shell and shared page states so future screens can use them consistently.

**Why this priority**: Consistent baseline behavior avoids recreating page foundations.

**Independent Test**: Open the baseline at narrow and wide widths and exercise loading, empty, error, not-found, and unexpected-rendering-failure states.

**Acceptance Scenarios**:

1. **Given** the independently running frontend, **when** the baseline page opens at narrow and wide widths, **then** its neutral layout is usable without business-specific UI.
2. **Given** a page is loading, empty, unavailable, or missing, **when** that condition occurs, **then** the corresponding reusable state is shown.
3. **Given** an unexpected rendering failure, **when** the page renders, **then** an error boundary provides a safe fallback.

---

### User Story 6 - Run Quality Checks (Priority: P2)

As a developer, I want documented repeatable checks so changes can be validated before adding new modules.

**Why this priority**: Future work must inherit explicit quality expectations.

**Independent Test**: Follow repository instructions to run type, code-quality, tests, schema-consistency, contract-availability, startup, and production-build checks.

**Acceptance Scenarios**:

1. **Given** a configured fresh project, **when** the documented checks run, **then** they report explicit outcomes for both applications and the database/API boundary.
2. **Given** deliberately invalid configuration, validation input, or schema changes, **when** the relevant checks run, **then** they detect the failure.

### Edge Cases

- Missing or malformed mandatory settings prevent startup without printing secret values.
- Unavailable essential database connectivity does not report ready or pass schema verification.
- Invalid request input yields a consistent validation error; unexpected failures hide internal details.
- Offline backend or unreadable response is not mistaken by the frontend for success.
- Missing frontend routes show not-found; failed rendering shows a safe fallback.
- Requests without a supplied identifier receive a usable correlation identifier; diagnostics exclude credentials and raw personal information.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The repository MUST separate independent backend and frontend applications, reusable core concerns, future platform modules, and future business-domain modules; dependencies MUST flow from business domain to platform to core, never in reverse.
- **FR-002**: The foundation MUST remain domain-neutral, with no business-specific entities, features, navigation, widgets, or speculative service infrastructure.
- **FR-003**: The backend and frontend MUST each start, build, and operate independently; they MUST communicate only across the documented API boundary.
- **FR-004**: Backend startup MUST load and validate required environment-specific configuration, fail clearly on missing/invalid mandatory values, and avoid exposing secrets.
- **FR-005**: The repository MUST provide safe example configuration and documentation for local/environment-specific values without committing credentials.
- **FR-006**: The backend MUST establish and verify database connectivity and provide a documented, repeatable initialization and migration workflow without speculative domain tables.
- **FR-007**: The backend MUST apply centralized validation to exposed request inputs and provide consistent successful responses and safe, consistent errors, including distinguishable validation errors.
- **FR-008**: Unexpected backend failures MUST not reveal secrets, credentials, raw personal information, or internal details in public responses.
- **FR-009**: Backend logs MUST be structured, correlate requests through an identifier available in failure responses, and omit secrets, credentials, and raw personal information.
- **FR-010**: The backend MUST expose operational status and readiness; readiness MUST reflect essential database availability.
- **FR-011**: The backend MUST generate its current API specification as a build artifact and provide an interactive documentation page in development only; the interactive page MUST be unavailable in production. The generated specification MUST be the single source for frontend payload definitions rather than manually duplicated request/response types.
- **FR-012**: The frontend MUST provide reusable, responsive global layout and styling, neutral page structure, and loading, empty, error, not-found, and unexpected-failure fallback behavior. Interactive controls MUST be keyboard-operable and keyboard focus MUST be visibly indicated.
- **FR-013**: The frontend MUST have environment-aware API communication that handles success and distinguishes expected application, validation, network/service, and unexpected errors.
- **FR-014**: The frontend MUST keep any client-owned local/workflow UI state separate from backend data and MUST NOT duplicate backend data in a global cache. A stateful UI example or state store is required only when a real in-scope interaction needs it; the foundation MUST NOT invent an interaction solely to demonstrate state management.
- **FR-015**: Documentation MUST cover module placement, configuration, database changes, independent startup, API contract usage, and quality checks.
- **FR-016**: Documented checks MUST cover type correctness, code quality, unit/integration tests including failure paths, independent startup, schema consistency, contract availability, and production builds; critical end-to-end journeys MUST be covered where applicable.
- **FR-017**: Future modules MUST reuse configuration, validation, error, logging, API-contract, and database foundations without changing core boundaries.

### Scope Boundaries

This feature establishes the foundation only. Login, registration, authentication, users, roles/permissions, sessions, organizations, teams, tenancy, billing/payments, notifications or delivery, files, audit logging, settings UI, real-time features, queues, Redis, dedicated search, business dashboards, and ecommerce/CRM/ERP/booking/warehouse or other business-domain models are excluded. Later capabilities (002 Authentication through 010 Application Settings) must be possible without fundamental restructuring but are not implemented here.

### Key Entities

No business or platform-domain entities are introduced. Configuration, request identifiers, health status, and error categories are foundational operational concepts; their representations belong in planning/contracts.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: In one fresh-environment walkthrough, a developer completes documented setup and starts both applications independently without undocumented manual steps.
- **SC-002**: All 17 acceptance criteria enumerated in _User Scenarios & Testing_ (US1.1–US6.2) have a demonstrable verification path and are mapped in _Delivered-System Reconciliation (T044)_; the earlier "18 acceptance criteria in the feature brief" wording is reconciled to that enumerated set because no artifact enumerates an eighteenth criterion. Zero excluded capabilities or business-domain entities appear in the foundation.
- **SC-003**: Every exercised baseline API interaction matches the generated build specification; frontend verification classifies all four specified error categories and a successful result. In a production-mode check, the interactive documentation page is unavailable, while the generated specification exists as a build artifact.
- **SC-004**: In all exercised scenarios, missing mandatory configuration prevents startup and loss of essential database connectivity never reports ready.
- **SC-005**: Every exercised backend failure response has an identifier matching structured diagnostics and exposes zero secrets, credentials, raw personal information, or internal details.
- **SC-006**: The baseline page and five shared states (loading, empty, error, not-found, unexpected failure) are usable at narrow and wide viewport sizes; interactive controls are keyboard-operable with visible focus; zero business-specific elements appear.
- **SC-007**: A developer can locate and run documented commands for every required quality check to explicit pass/fail outcomes in one baseline walkthrough.

## Delivered-System Reconciliation (T044)

This mapping distinguishes implemented-and-locally-tested behaviour from evidence that still requires the Phase 9 integrated walkthrough. File references identify the concrete evidence; command results for this reconciliation are recorded in `docs/review-001.md`.

| Brief acceptance criterion                                                    | Delivered evidence                                                                                                                                                         | Reconciliation status                                                                                                                                                |
| ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| US1.1 Separate fresh-checkout startup                                         | `README.md` local setup and independent commands; `apps/api/test/startup.integration.spec.ts`; `apps/web/tests/startup.spec.ts`; `docs/verification-002-convergence.md` §1 | Demonstrated: a clean copy of the workspace installs, builds, and starts both applications independently from the documented commands alone, with raw HTTP evidence. |
| US1.2 Invalid/missing backend configuration fails safely                      | `apps/api/test/config.spec.ts`; `apps/api/src/core/config/env.ts`                                                                                                          | Demonstrated by automated negative-path coverage.                                                                                                                    |
| US1.3 Reproducible DB initialization without business tables                  | `apps/api/prisma/schema.prisma`; `docs/database.md`; `apps/api/test/database.integration.spec.ts`; `docs/qa-verdict-001.md` §2.5                                           | Demonstrated: the empty baseline, the read-only `db:check` exit-1 semantics, and a live disposable-PostgreSQL run (API 41 pass / 0 skipped) are all evidenced.       |
| US2.1 Future platform placement reuses core without domain dependency         | `docs/architecture.md`; `scripts/check-boundaries.mjs`; its tests                                                                                                          | Demonstrated by documented placement and automated forbidden-import checks.                                                                                          |
| US2.2 Future business placement stays separate                                | `docs/architecture.md`; `scripts/check-boundaries.mjs`; its tests                                                                                                          | Demonstrated by documented placement and automated forbidden-import checks.                                                                                          |
| US2.3 No business entities, metrics, navigation, or workflows                 | `apps/api/prisma/schema.prisma`; `docs/architecture.md`; boundary checks                                                                                                   | Demonstrated by reviewed schema/source boundaries; no live exhaustive UI audit is claimed.                                                                           |
| US3.1 Development docs; production artifact with docs routes absent           | `apps/api/dist/openapi.json`; `apps/api/test/openapi.integration.spec.ts`; `apps/api/src/main.ts`                                                                          | Demonstrated by automated development/production route tests and retained artifact.                                                                                  |
| US3.2 Generated-client success and categorized errors without backend imports | `packages/api-client/src/generated/`; `apps/web/src/lib/api/`; `apps/web/tests/api-client.spec.ts`; `apps/web/tests/foundation.e2e.spec.ts`; `scripts/check-contract.mjs`  | Demonstrated: client/error tests, generated-client drift check, and browser tests that fetch the live API across origins without interception.                       |
| US3.3 Invalid exposed input uses standard validation error                    | `apps/api/test/status.contract.spec.ts`; `apps/api/src/core/errors/http-exception.filter.ts`                                                                               | Demonstrated by status unknown-query/body tests.                                                                                                                     |
| US4.1 Readiness reflects database availability                                | `apps/api/test/health.integration.spec.ts`; `apps/api/src/modules/health/health.service.ts`; `docs/qa-verdict-001.md` §2.5                                                 | Demonstrated: synthetic-down 503 and a live database-up 200 both executed (API 41 pass / 0 skipped with `TEST_DATABASE_URL`).                                        |
| US4.2 Correlated, safe failure response and diagnostics                       | `apps/api/test/diagnostics.spec.ts`; request-ID middleware and exception filter                                                                                            | Demonstrated by structured-log correlation/redaction tests.                                                                                                          |
| US4.3 Frontend distinguishes four failure categories with reusable state      | `apps/web/tests/api-client.spec.ts`; `apps/web/tests/service-error.spec.ts`; `apps/web/src/features/foundation/service-error.tsx`                                          | Demonstrated at access-layer/component level.                                                                                                                        |
| US5.1 Neutral shell works at narrow and wide widths                           | `apps/web/tests/foundation.e2e.spec.ts`                                                                                                                                    | Demonstrated: the baseline shell, the cross-origin journey, and every shared state are exercised in a browser at 375×667 and 1440×900 (10 passing Playwright tests). |
| US5.2 Reusable loading, empty, error, and not-found states                    | `apps/web/tests/foundation-states.spec.ts`; `apps/web/tests/foundation.e2e.spec.ts`; `apps/web/src/components/foundation-states.tsx`; `apps/web/src/app/states/page.tsx`   | Demonstrated: logic coverage plus browser coverage of all ten shared state surfaces at both viewports, including focus indication and no horizontal overflow.        |
| US5.3 Unexpected-rendering-failure fallback                                   | `apps/web/src/app/error.tsx`; `apps/web/src/app/global-error.tsx`; `apps/web/tests/foundation-states.spec.ts`                                                              | Partially demonstrated: state descriptors/implementation are covered, but no final browser-injected render-failure evidence is recorded.                             |
| US6.1 Documented checks report explicit outcomes                              | `README.md`; `specs/001-platform-foundation/quickstart.md`; root scripts in `package.json`; `docs/verification-001.md`; `docs/verification-002-convergence.md`             | Demonstrated: every documented command was executed against the integrated revision with raw exit codes recorded, plus a fresh-workspace rehearsal.                  |
| US6.2 Negative configuration, input, and schema changes are detected          | `scripts/test-quality-gates.mjs`; `apps/api/test/config.spec.ts`; `apps/api/test/status.contract.spec.ts`; `apps/api/test/database.integration.spec.ts`                    | Demonstrated by negative-path test coverage (DB-backed assertions skip without a disposable URL).                                                                    |

## Assumptions

- This is an initial foundation, not an existing deployed product or a request to implement future numbered features.
- Developers can provide their own local database and non-secret settings according to documented prerequisites; no hosted service is assumed.
- Exact status formats, numeric performance targets, and UI copy not specified in the brief will be resolved during planning/contracts without adding product features.
- The Constitution v1.0.0 governs architectural constraints; exact technology versions and implementation contracts are deferred to planning.
- No existing business records need retention or migration.
