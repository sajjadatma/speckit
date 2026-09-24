# Phase 0 Research — 001 Platform Foundation

Date: 2026-09-24. Repository presently contains only Spec Kit material and a constitution; there is no application, lockfile, or Git repository. The latest user brief supersedes the earlier npm-workspaces/no-package planning choice. Versions below are **planned exact pins**, not installed dependencies or verified builds. npm registry metadata was checked on this date; version-matched documentation and installed peer resolution must be checked during implementation.

## Runtime, workspace and package baseline

**Decision:** Pin Node.js `24.21.0` (LTS), pnpm `11.11.0` via Corepack/packageManager, TypeScript `6.0.3` strict, NestJS core/common/platform-express/terminus `12.1.0`, NestJS Swagger `12.0.2`, NestJS config `12.0.1`, Next.js `16.3.6`, React/react-dom `19.3.0`, Zustand `5.0.15`, Prisma CLI/client/adapter-pg `7.10.0`, PostgreSQL server `18.6`. Add pnpm workspace package boundaries `api-client`, `shared`, `config`, `eslint-config`, `tsconfig`, but create a runtime package only with a real domain-neutral consumer; do not ship empty shared/config scaffolds. Pin every selected direct dependency and compatible peers in `pnpm-lock.yaml`. Never mix Prisma CLI/client/adapter versions.

**Rationale:** Constitution fixes technology families, not versions; this user brief expressly selects pnpm and package boundaries. Node 24.21.0 is an LTS release in the official release index. npm registry metadata shows Node 24 meets Prisma 7, NestJS 12, and Next 16 engines; Swagger 12's TypeScript peer accepts 6.x, **not TypeScript 7**. PostgreSQL's official version page lists 18.6. Local pnpm `11.11.0` is available, and a pinned workspace lock avoids implicit dependency drift.

**Alternatives considered:** Node 25 (locally installed but non-LTS); TypeScript 7.0.2 (incompatible with Swagger 12 peer); Prisma 8 RC (pre-release and docs ahead of stable); npm workspaces (replaced by explicit user technical direction); Turborepo (not needed for two apps); empty package shells (no actual reusability).

**Evidence:** https://nodejs.org/dist/index.json ; https://www.postgresql.org/support/versioning/ ; npm registry metadata via `npm view <package>@<version> engines peerDependencies --json` (checked 2026-09-24).

## API, validation, errors, and documentation

**Decision:** NestJS modular monolith with a small core (configuration, database, HTTP validation/errors/correlation/logging), a minimal public status endpoint, and explicit API boundary. Runtime-validate environment variables and all exposed HTTP inputs. Use Nest global validation mechanisms for DTOs, with explicit validation for headers and environment; generate OpenAPI from Nest controllers as a build artifact in every environment, serving `/api/openapi.json` and `/api/docs` only in development. Define error and health wire formats in `contracts/` before implementation. Generate frontend payload types from the exported OpenAPI artifact; do not import backend source or hand-copy DTOs. Use a standard success payload for the baseline application endpoint, while document/health endpoints retain their native formats.

**Rationale:** Meets constitution's Nest authority and contract-first rule with a single actual API definition. A narrowly constrained optional `format=summary` status query exercises input validation without a speculative domain feature. Production public access is limited to status/health; development-only documentation is available locally, while the generated artifact supports release validation. Future application endpoints default denied until authorization is specified.

**Alternatives considered:** Manually maintained frontend interfaces (dual source of truth); independent YAML-first schemas (contradicts Nest API authority); wrapping OpenAPI and health responses in an application envelope (breaks tooling conventions); introducing authentication now (out of scope).

**Evidence:** https://docs.nestjs.com/openapi/introduction ; https://docs.nestjs.com/techniques/validation ; https://docs.nestjs.com/recipes/terminus . Exact NestJS 12 API availability must be checked at implementation against installed packages.

## Database initialization and migration safety

**Decision:** PostgreSQL 18.6 and Prisma 7.10.0 with its PostgreSQL adapter; an empty domain model initially, but a committed initial migration or schema baseline only if the version-matched Prisma migration flow supports an empty migration. Use development migrations only against disposable developer databases, reviewed migration files as the deployment unit, and non-destructive deploy commands for non-development environments. Check migration status/drift separately; never use `db push` or `migrate reset` against retained data. Startup validates configuration; readiness checks a real lightweight database query rather than assuming client construction means connectivity.

**Rationale:** Enables future relational modules without inventing tables. Prisma's live docs have moved toward a newer major than the selected stable CLI (the current applying-a-migration page describes Prisma 8 replacing `migrate deploy`), so **do not transfer that current command uncritically to Prisma 7**. Confirm commands with `prisma@7.10.0 --help` and the corresponding versioned Prisma documentation during implementation.

**Alternatives considered:** `db push` (no reviewed migration history), speculative core tables (out of scope), a custom migration runner (unnecessary), a database-optional readiness success (misleading).

**Evidence:** https://www.prisma.io/docs/orm/migrations/applying-a-migration.md (current docs; version mismatch warning) ; https://www.prisma.io/docs/orm/overview/databases/postgresql ; npm registry `prisma@7.10.0` metadata.

## Frontend and verification

**Decision:** Next.js App Router server-first neutral shell, Tailwind CSS `4.3.3`, shadcn/ui generated components (CLI `4.21.0` only when choosing a needed primitive), Lucide `1.47.0`, and a small Zustand `5.0.15` store only for actual local/workflow UI state. Zod `4.6.5` supports typed/runtime configuration and future reusable schemas; do not create a form merely to install React Hook Form `7.88.0`. TanStack Query `5.103.2` is reserved for genuine client-owned async server interactions, not a duplicate of server-rendered baseline data. React Hook Form and Query are **approved future dependencies**, but not installed or activated in 001 without an actual form/client async flow. Route server-side baseline API calls through `packages/api-client` generated from the Nest OpenAPI artifact; generator `@hey-api/openapi-ts` `0.99.0` accepts TypeScript 6 (registry peer). Keep public browser configuration non-secret. Use framework-compatible unit/integration tests and Playwright `1.63.0` for a minimal browser E2E smoke scenario. No additional server-state framework.

**Rationale:** The requested frontend direction is respected without violating the Constitution's YAGNI and Zustand restrictions: design for named tools, instantiate only what the foundation uses. shadcn/ui is generated source, not a central runtime SDK. No form or browser-driven remote query is in the approved specification. `openapi-typescript@7.13.0` has a TypeScript `^5.x` peer conflict, so `@hey-api/openapi-ts` is preferred pending installed peer validation.

**Alternatives considered:** Client-only shell (unnecessary client boundary); Zustand as remote cache (prohibited); adding sample login/forms or client polling to justify packages (scope violation); unversioned UI generator (unreproducible).

**Evidence:** https://nextjs.org/docs/app/getting-started/installation ; https://nextjs.org/docs/app/api-reference/file-conventions/error ; https://ui.shadcn.com/docs/installation/next ; https://tanstack.com/query/latest/docs/framework/react/overview ; npm registry peer metadata for @hey-api/openapi-ts, openapi-typescript, React Hook Form, TanStack Query, Lucide, Zod, Tailwind, shadcn, and Playwright (checked 2026-09-24).

## Operational choices and open implementation checks

**Decision:** Use Pino-compatible JSON logging with `nestjs-pino@5.2.0` and `pino@10.3.1` (their registry peers accept Nest 12 / Pino 10), using a version-verified compatible `pino-http` peer. Record timestamp, level, method, route template (not raw query), status, duration, bounded error category, and request ID; redact credentials, bodies, tokens, raw PII, and database URL. Generate server-side UUID request identifiers; accept a client-provided identifier only after bounded format validation or replace it safely. Return `X-Request-Id` on all handled responses. Liveness must not depend on the database; readiness must check it. Provide explicit CORS/origin policy for independent frontend/backend deployments. Shared packages may contain only genuine generated contract types and neutral utilities; do not ship unused empty runtime packages. Local Docker Compose can run PostgreSQL only, with no containerization of applications. Minimal CI runs frozen install, type/lint/test/build plus migration and contract checks with a disposable database; no deployment infrastructure.

**Rationale:** Meets traceability and secret hygiene using the user's preferred Pino-compatible format without adding a separate observability service. pnpm shared lint/tsconfig packages consolidate configuration; they are not runtime application code.

**Alternatives considered:** Plain console strings (hard to correlate), logging entire request/response bodies (privacy risk), telemetry collector/queue/Redis (speculative), full application Compose stack (unneeded for local development), heavyweight CI orchestration.

**Implementation checks (not unresolved product clarifications):** Confirm exact Prisma 7.10 migration/generator/adapter commands and empty-schema behavior; NestJS 12 Swagger/Pino peer and exported-document API; Next 16 App Router conventions; package compatibility and frozen pnpm lockfile; CI and Playwright browser availability. If exact chosen versions cannot satisfy the Constitution, stop and revise this plan before implementation rather than silently upgrade.
