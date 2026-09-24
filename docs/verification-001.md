# Verification 001 — Platform Foundation Exact-Revision Walkthrough

**Date:** 2026-09-24

**Scope and safety:** This is a local-only walkthrough of the working tree present at execution time. `pwd` returned `/Users/sajad/Documents/Tasks/arghavan/my-project`. No Git command was run. No source, test, package, specification, checklist, lockfile, environment file, or database data was edited. The only authored file is this report. Configuration was supplied inline rather than copying example files, because this task was read-only. The supplied `TEST_DATABASE_URL` targeted the stated disposable PostgreSQL 17 database; all exercised application checks were read-only. The cluster was neither stopped nor mutated.

**Runtime wrapper used for every pnpm command:** `TMPDIR=/Users/sajad/.hermes/cache/scratch npm exec --yes --package=node@24.21.0 -- sh -c '<command>'`.

## Command ledger

| #   | Exact command                                                                                                                                                                                                                                                          |                               Raw exit | Raw result                                                                                                                                                                                             |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | `pwd`                                                                                                                                                                                                                                                                  |                                      0 | `/Users/sajad/Documents/Tasks/arghavan/my-project`                                                                                                                                                     |
| 2   | `TMPDIR=/Users/sajad/.hermes/cache/scratch npm exec --yes --package=node@24.21.0 -- sh -c 'node --version && corepack pnpm --version'`                                                                                                                                 |                                      0 | `v24.21.0` / `11.11.0`                                                                                                                                                                                 |
| 3   | `TMPDIR=/Users/sajad/.hermes/cache/scratch npm exec --yes --package=node@24.21.0 -- sh -c 'corepack pnpm install --frozen-lockfile'`                                                                                                                                   |                                      0 | `Scope: all 6 workspace projects`; `Already up to date`; `Done in 203ms using pnpm v11.11.0`                                                                                                           |
| 4   | `TMPDIR=/Users/sajad/.hermes/cache/scratch docker compose --env-file apps/api/.env.example config --quiet`                                                                                                                                                             |                                      0 | _(no stdout/stderr)_                                                                                                                                                                                   |
| 5   | `TMPDIR=/Users/sajad/.hermes/cache/scratch DATABASE_URL='postgresql://compile:***@127.0.0.1:1/foundation_compile?connect_timeout=1' NODE_ENV=development PORT=3001 npm exec --yes --package=node@24.21.0 -- sh -c 'corepack pnpm --filter ./apps/api run build'`       |                                      0 | Prisma Client `7.10.0` generated; OpenAPI export completed. `.env not found. Continuing without it.`                                                                                                   |
| 6   | `TMPDIR=/Users/sajad/.hermes/cache/scratch DATABASE_URL='postgresql://postgres@127.0.0.1:55499/foundation_verify' NODE_ENV=development PORT=3001 npm exec --yes --package=node@24.21.0 -- sh -c 'corepack pnpm --filter ./apps/api run dev'`                           |    running, then intentionally stopped | Raw startup log: `Nest application successfully started`. Stopped with the process manager after HTTP probes.                                                                                          |
| 7   | Development curl sequence in [Development HTTP evidence](#development-http-evidence)                                                                                                                                                                                   |               0 (wrapper); each curl 0 | Raw HTTP statuses: 200, 200, 200, 400, 200, 200.                                                                                                                                                       |
| 8   | `TMPDIR=/Users/sajad/.hermes/cache/scratch DATABASE_URL='postgresql://compile:***@127.0.0.1:1/foundation_compile?connect_timeout=1' NODE_ENV=production PORT=3001 npm exec --yes --package=node@24.21.0 -- sh -c 'corepack pnpm --filter ./apps/api run start'`        |    running, then intentionally stopped | Raw startup log: `Nest application successfully started`. Stopped with the process manager after HTTP probes.                                                                                          |
| 9   | Production curl/artifact sequence in [Production HTTP evidence](#production-http-evidence)                                                                                                                                                                             | 0 (wrapper); each curl and `test -f` 0 | Raw HTTP statuses: live 200; ready 503; docs 404; OpenAPI route 404; artifact test 0.                                                                                                                  |
| 10  | `TMPDIR=/Users/sajad/.hermes/cache/scratch TEST_DATABASE_URL='postgresql://postgres@127.0.0.1:55499/foundation_verify' DATABASE_URL='postgresql://postgres@127.0.0.1:55499/foundation_verify' npm exec --yes --package=node@24.21.0 -- sh -c 'corepack pnpm db:check'` |                           1 (expected) | `No migration found in prisma/migrations`; `The current database is not managed by Prisma Migrate.`                                                                                                    |
| 11  | `TMPDIR=/Users/sajad/.hermes/cache/scratch npm exec --yes --package=node@24.21.0 -- sh -c 'corepack pnpm check:boundaries'`                                                                                                                                            |                                      0 | `$ node scripts/check-boundaries.mjs`                                                                                                                                                                  |
| 12  | `TMPDIR=/Users/sajad/.hermes/cache/scratch npm exec --yes --package=node@24.21.0 -- sh -c 'corepack pnpm typecheck'`                                                                                                                                                   |                                      0 | API generation and all three TypeScript checks completed with no diagnostic.                                                                                                                           |
| 13  | `TMPDIR=/Users/sajad/.hermes/cache/scratch npm exec --yes --package=node@24.21.0 -- sh -c 'corepack pnpm lint'`                                                                                                                                                        |                                      0 | Root, API, and web ESLint commands completed with no diagnostic.                                                                                                                                       |
| 14  | `TMPDIR=/Users/sajad/.hermes/cache/scratch npm exec --yes --package=node@24.21.0 -- sh -c 'corepack pnpm format:check'`                                                                                                                                                |                                      0 | `All matched files use Prettier code style!` (before this evidence report was created).                                                                                                                |
| 15  | `TMPDIR=/Users/sajad/.hermes/cache/scratch TEST_DATABASE_URL='postgresql://postgres@127.0.0.1:55499/foundation_verify' npm exec --yes --package=node@24.21.0 -- sh -c 'corepack pnpm test'`                                                                            |                                      0 | API: `tests 36`, `pass 36`, `fail 0`, `skipped 0`. Web: `tests 31`, `pass 31`, `fail 0`, `skipped 0`. Raw warnings: five `MODULE_TYPELESS_PACKAGE_JSON` warnings for web test files; no test failed.   |
| 16  | `TMPDIR=/Users/sajad/.hermes/cache/scratch npm exec --yes --package=node@24.21.0 -- sh -c 'corepack pnpm test:quality'`                                                                                                                                                |                                      0 | `PASS configuration absent`; `PASS status validation (400 invalid, 200 valid)`; `PASS contract drift`; `PASS migration status (synthetic unreachable URL, exit 1)`; `Quality gate probes passed: 4/4.` |
| 17  | `TMPDIR=/Users/sajad/.hermes/cache/scratch npm exec --yes --package=node@24.21.0 -- sh -c 'corepack pnpm contract:check'`                                                                                                                                              |                                      0 | `OpenAPI generated client is current (16 files).` Temp output was under `/Users/sajad/.hermes/cache/scratch/platform-contract-GvCOZe`.                                                                 |
| 18  | `TMPDIR=/Users/sajad/.hermes/cache/scratch TEST_DATABASE_URL='postgresql://postgres@127.0.0.1:55499/foundation_verify' npm exec --yes --package=node@24.21.0 -- sh -c 'corepack pnpm test:e2e'`                                                                        |                                      0 | Playwright Chromium: `6 passed (4.6s)`. Includes narrow and wide (375px/1440px per test config) baseline plus independent API/web journey, not-found focus recovery, and injected service fallback.    |
| 19  | `TMPDIR=/Users/sajad/.hermes/cache/scratch npm exec --yes --package=node@24.21.0 -- sh -c 'corepack pnpm build'`                                                                                                                                                       |                                      0 | API build and OpenAPI export passed; Next.js `16.3.6` production build passed; routes `/` and `/_not-found` rendered as static.                                                                        |
| 20  | `TMPDIR=/Users/sajad/.hermes/cache/scratch NEXT_PUBLIC_API_ORIGIN='http://localhost:3001' npm exec --yes --package=node@24.21.0 -- sh -c 'corepack pnpm --filter ./apps/web run dev'`                                                                                  |    running, then intentionally stopped | Raw startup: `▲ Next.js 16.3.6 (Turbopack)`; `✓ Ready in 192ms`; local `http://localhost:3000`. Stopped with the process manager after probes.                                                         |
| 21  | Development web curl sequence in [Development web evidence](#development-web-evidence)                                                                                                                                                                                 |               0 (wrapper); each curl 0 | Raw HTTP statuses: `/` 200; `/unknown-route` 404.                                                                                                                                                      |

## Development HTTP evidence

API development used the disposable test database. Each command below returned raw curl exit code `0`.

| Exact command                                                  | Raw HTTP status | Raw response evidence                                                                                                                                                                                            |
| -------------------------------------------------------------- | --------------: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `curl -i http://localhost:3001/health/live`                    |             200 | `X-Request-Id: 4ba62dd5-0dcd-4ab0-8ed4-684efd7e072d`; `{"requestId":"4ba62dd5-0dcd-4ab0-8ed4-684efd7e072d","status":"live"}`                                                                                     |
| `curl -i http://localhost:3001/health/ready`                   |             200 | `X-Request-Id: 9ceacc8f-3f34-44ce-aae6-4286368b0e19`; `{"database":"up","requestId":"9ceacc8f-3f34-44ce-aae6-4286368b0e19","status":"ready"}`                                                                    |
| `curl -i http://localhost:3001/api/v1/status`                  |             200 | `X-Request-Id: e55c239e-4a5d-4312-bfd1-f0fa99885666`; `{"data":{"status":"operational"}}`                                                                                                                        |
| `curl -i 'http://localhost:3001/api/v1/status?format=invalid'` |             400 | `X-Request-Id: 75a7f16c-894b-4716-8b58-461d306a515a`; `{"error":{"category":"validation","code":"VALIDATION_FAILED","message":"Request validation failed."},"requestId":"75a7f16c-894b-4716-8b58-461d306a515a"}` |
| `curl -i http://localhost:3001/api/openapi.json`               |             200 | `X-Request-Id: eac098b5-93c6-45fc-9834-e6d0779b0937`; response begins `{"openapi":"3.0.3","paths":...}`; raw `Content-Length: 5340`                                                                              |
| `curl -i http://localhost:3001/api/docs`                       |             200 | `X-Request-Id: 6dc9cbe9-81d9-45f8-a25-cdf92ca4a4f5`; Swagger UI HTML; raw `Content-Length: 3126`                                                                                                                 |

The development server’s raw structured logs recorded the matching request IDs and statuses (including the invalid query as status 400/category `validation`).

## Production HTTP evidence

API production used the intentionally unreachable synthetic URL. Each curl and `test -f` returned raw exit code `0`.

| Exact command                                    | Raw HTTP status | Raw response evidence                                                                                                                               |
| ------------------------------------------------ | --------------: | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `curl -i http://localhost:3001/health/live`      |             200 | `X-Request-Id: d27751ae-de54-4334-b86a-5fa1ed07e520`; `{"requestId":"d27751ae-de54-4334-b86a-5fa1ed07e520","status":"live"}`                        |
| `curl -i http://localhost:3001/health/ready`     |             503 | `X-Request-Id: fcb444a0-0d75-44c6-8f81-584a97c222c3`; `{"database":"down","requestId":"fcb444a0-0d75-44c6-8f81-584a97c222c3","status":"not_ready"}` |
| `curl -i http://localhost:3001/api/docs`         |             404 | `X-Request-Id: 2f758249-d4ae-4dd1-9a4e-2433a04ef1f8`; body: `Cannot GET /api/docs`                                                                  |
| `curl -i http://localhost:3001/api/openapi.json` |             404 | `X-Request-Id: 660cebed-2040-4552-80ee-be49b567559c`; body: `Cannot GET /api/openapi.json`                                                          |
| `test -f apps/api/dist/openapi.json`             |             n/a | Raw exit code `0`; generated production OpenAPI artifact exists.                                                                                    |

## Development web evidence

Both commands returned raw curl exit code `0`.

| Exact command                                 | Raw HTTP status | Raw evidence                                                                                                                                 |
| --------------------------------------------- | --------------: | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `curl -i http://localhost:3000/`              |             200 | Next.js HTML contains `Platform Foundation`; raw server log: `GET / 200 in 896ms`.                                                           |
| `curl -i http://localhost:3000/unknown-route` |             404 | HTML contains `Not found`, `The requested page could not be found.`, and `Back to start`; raw server log: `GET /unknown-route 404 in 115ms`. |

The dedicated Playwright run is the viewport evidence: raw output reports baseline rendering and independent API/web journey at narrow and wide widths, plus successful not-found focus recovery and service fallback. It completed `6 passed (4.6s)`.

## Database state and safety result

`db:check` is intentionally **not** a passing gate on this empty baseline. Its raw exit was `1`, with Prisma reporting:

```text
No migration found in prisma/migrations
The current database is not managed by Prisma Migrate.
```

The DB-backed test run passed all 36 API tests, including the read-only `SELECT 1`, no-application-tables inspection, readiness-up test, and the expected empty-baseline migration-status test. No migration was applied. Before the first real model, the required path is: review and commit generated migration SQL; apply it only to a disposable developer database with `db:migrate:dev`; use non-destructive `db:deploy` in a target environment; then use read-only `db:check` to confirm synchronized migration history. `prisma db push`, `prisma migrate reset`, and volume deletion were not run.

## Failure and safety scenarios

- Missing configuration: covered by `test:quality` raw result `PASS configuration absent`; no API server was started with missing configuration in this manual pass because startup testing is encapsulated by the gate.
- Database-down readiness: manually demonstrated without touching the provided database by running production API with the synthetic unreachable URL: live 200 and ready 503 above.
- Invalid query: manually demonstrated: status endpoint returned raw HTTP 400 and safe validation body above.
- Malformed request ID, body rejection, redaction, and frontend offline/unexpected fallbacks: exercised by the raw passing API/web suites; individual manual fault injection was not performed against production endpoints.
- No business tables/excluded modules/fake forms: boundary check raw exit 0; DB-backed test verifies the disposable public schema has no application tables.

## Remaining risks, unverified areas, and rollback

1. **Hosted CI is unverified (local-only limitation).** The repository workflow was not executed on GitHub. No Git command, remote operation, deployment, or CI run was performed.
2. **No actual migration exists.** The intentional empty baseline makes `db:check` exit 1. This proves the documented state, not a migration application/rehearsal.
3. **The supplied database was not stopped.** The required ready-down behavior was proven using the documented synthetic unreachable URL to preserve the user’s no-mutation/no-cluster-control constraint; it was not proven by stopping/restoring PostgreSQL.
4. **No production deployment, production credentials, retained data, performance, or external-network verification occurred.** All HTTP/browser/database evidence is local-only.
5. **Web test warnings remain.** Node emitted `MODULE_TYPELESS_PACKAGE_JSON` warnings for five web test files. They did not cause a failure, but resolving them would require a separately approved manifest change.
6. **Rollback:** this verification task changed only `docs/verification-001.md`; remove that report to restore the prior repository content. No migration, data mutation, package, lockfile, source, or configuration rollback is needed. Generated build/runtime outputs are local build artifacts, not authored changes.

## Server cleanup

Every server started by this walkthrough was stopped before report creation:

- API development server: stopped after development HTTP evidence.
- API production server: stopped after production HTTP evidence.
- Web development server: stopped after web HTTP evidence.
- Playwright-managed test server exited with the completed `test:e2e` process.

No server intentionally remains running.
