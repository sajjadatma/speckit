# Quickstart Verification Guide — 001 Platform Foundation

**Status:** Implemented local setup guide. This repository has application source, a committed lockfile, and implemented workspace scripts. The database baseline remains intentionally empty: there is no Prisma model, application table, migration directory, migration lock file, or `_prisma_migrations` table.

## Prerequisites and preparation

- Node.js `24.21.0` LTS and Corepack-managed pnpm `11.11.0` are required. Verify them with `npm exec --yes --package=node@24.21.0 -- sh -c 'node --version && corepack pnpm --version'`.
- From repository root, run `npm exec --yes --package=node@24.21.0 -- sh -c 'corepack pnpm install --frozen-lockfile'`.
- Copy safe `apps/api/.env.example` and `apps/web/.env.example` into untracked local settings as documented in `README.md`. The examples contain local-only values, not production credentials. `NEXT_PUBLIC_API_ORIGIN` is public and is inlined by Next.js at build time.
- The optional PostgreSQL-only `compose.yaml` uses PostgreSQL `18.6`, binds to loopback, and runs applications on the host. Validate it without starting Docker: `docker compose --env-file apps/api/.env.example config --quiet`.

## Local startup and contract smoke

With valid local configuration, start the two applications independently from the repository root in separate shells:

```sh
corepack pnpm --filter ./apps/api run build
corepack pnpm --filter ./apps/api run dev
corepack pnpm --filter ./apps/web run dev
```

The current foundation has no application models or migrations, so do **not** run `db:migrate:dev` yet. `db:check` is expected to exit `1` until a real migration history exists. When a future feature adds a reviewed model migration, run `corepack pnpm --filter ./apps/api run db:migrate:dev` only against a disposable development database.

Use separate shells for the two servers. Planned defaults: API `http://localhost:3001`, web `http://localhost:3000`. Do not use `prisma db push`, `prisma migrate reset`, or volume deletion.

```sh
curl -i http://localhost:3001/health/live
curl -i http://localhost:3001/health/ready
curl -i http://localhost:3001/api/v1/status
curl -i 'http://localhost:3001/api/v1/status?format=invalid'
curl -i http://localhost:3001/api/openapi.json
curl -i http://localhost:3001/api/docs
```

Expected in development: liveness 200, readiness 200 with database up, status 200 with neutral result, invalid format 400 in the validation error shape, generated OpenAPI document 200, and interactive docs available. Every handled response includes `X-Request-Id`; errors contain a matching ID. Compare Nest export with [contracts/openapi.yaml](contracts/openapi.yaml) and verify `packages/api-client` is generated from it, not imported from backend source.

In a separate production-mode startup, verify **both** `/api/docs` and `/api/openapi.json` are unavailable (404), while the generated OpenAPI **build artifact** exists for release validation/type generation. Open the web app at narrow/wide widths, inspect neutral shell, unknown route, and the states in [contracts/frontend-states.md](contracts/frontend-states.md).

## Failure and safety scenarios

1. Remove a required server setting: startup fails clearly before serving, without printing its secret value.
2. Stop the disposable database after backend startup: `/health/live` remains 200 and `/health/ready` becomes 503; restore DB and verify ready.
3. Send invalid query and malformed request identifier: unsupported query rejects; malformed ID is replaced. Match response ID to structured Pino log fields without leaking credential, body, raw PII, stack, or connection string.
4. Stop backend and invoke frontend API path: network/service state, not success. Exercise unexpected-response/render-error fallbacks with tests, not production fault endpoints.
5. Verify no business tables/excluded modules, no global Zustand server cache, no fake forms; migration baseline applies to a fresh disposable DB without drift.

## Boundary check

Run `npm exec --yes --package=node@24.21.0 -- sh -c 'corepack pnpm check:boundaries'` before adding a module or shared-package source. It executes `scripts/check-boundaries.mjs` and returns nonzero for forbidden API-layer/application imports or excluded business concepts in shared-package source. `docs/architecture.md` defines the current core public exports and future-module checklist; `apps/api/src/modules/index.ts` remains intentionally absent until T024 or T031 introduces a real module.

## Root quality gates

```sh
TMPDIR="${TMPDIR:-/tmp}" npm exec --yes --package=node@24.21.0 -- sh -c 'corepack pnpm typecheck'
TMPDIR="${TMPDIR:-/tmp}" npm exec --yes --package=node@24.21.0 -- sh -c 'corepack pnpm lint'
TMPDIR="${TMPDIR:-/tmp}" npm exec --yes --package=node@24.21.0 -- sh -c 'corepack pnpm format:check'
TMPDIR="${TMPDIR:-/tmp}" npm exec --yes --package=node@24.21.0 -- sh -c 'corepack pnpm test'
TMPDIR="${TMPDIR:-/tmp}" npm exec --yes --package=node@24.21.0 -- sh -c 'corepack pnpm test:quality'
TMPDIR="${TMPDIR:-/tmp}" npm exec --yes --package=node@24.21.0 -- sh -c 'corepack pnpm contract:check'
TMPDIR="${TMPDIR:-/tmp}" npm exec --yes --package=node@24.21.0 -- sh -c 'corepack pnpm test:e2e'
TMPDIR="${TMPDIR:-/tmp}" npm exec --yes --package=node@24.21.0 -- sh -c 'corepack pnpm build'
```

All commands except `db:check` are passing gates and fail loudly on drift or test failures. Root `typecheck` includes `@platform/api-client`; root `format:check` includes `.github` workflow YAML and `docs/**/*.md`. `test:quality` is the root entrypoint for `scripts/test-quality-gates.mjs`, which proves expected negative paths fail. `test:e2e` is implemented Playwright Chromium browser smoke, not a future placeholder.

Stop any manually started `dev` servers before running these gates: `corepack pnpm test` and `corepack pnpm test:e2e` start their own API and web servers, and a second `next dev` will not start while one is already running in the same application directory.

`contract:check` rebuilds `apps/api/dist/openapi.json`, regenerates the client into a `TMPDIR` temporary directory, and compares relative files and bytes with `packages/api-client/src/generated`; it does not use Git or a database command. After an approved OpenAPI change, update the single generated-client owner with `corepack pnpm --filter @platform/api-client run generate`, then rerun the contract gate. Generated payload types must not be copied into the web app.

Without `TEST_DATABASE_URL`, the three DB-backed assertions are skipped and no database command is run. `db:check` is deliberately excluded from a passing gate: against the intentional empty baseline it exits `1` because `_prisma_migrations` is absent. In CI, PostgreSQL 17 is disposable and `TEST_DATABASE_URL` enables the read-only DB-backed cases. CI uses frozen install, pinned Node/pnpm, browser smoke, and independent production builds; it has no deployment job. Production uses only the Prisma 7.10 non-destructive `db:deploy` then `db:check` flow for reviewed, committed migrations; never reset/push retained data. One fresh walkthrough must succeed from final `README.md` alone.

## Evidence and limits

Record the exact `pnpm-lock.yaml` revision, command exit codes and pass/fail/skip counts, HTTP codes/headers in both environments when the optional database is started, correlation samples with redacted fields, migration status, browser checks, production OpenAPI artifact/docs behavior once implemented, independent builds, and CI result. This task validates local setup and offline Compose only; it does not claim database migration, deployed, or performance verification.
