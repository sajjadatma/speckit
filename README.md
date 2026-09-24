# Platform Foundation

## Local setup

Prerequisites: Node.js `24.21.0`, Corepack, pnpm `11.11.0`, and Docker Compose only if you choose to run the optional local PostgreSQL service. The workspace pins pnpm in `package.json`.

From a fresh clone, run:

```sh
npm exec --yes --package=node@24.21.0 -- sh -c 'node --version && corepack enable && corepack pnpm --version'
npm exec --yes --package=node@24.21.0 -- sh -c 'corepack pnpm install --frozen-lockfile'
```

The expected version output is Node `v24.21.0` and pnpm `11.11.0`. Do not use a production database or production credentials for local development.

## Local configuration

Copy the versioned examples to untracked local files, then adjust only local values:

```sh
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
```

`apps/api/.env.example` contains unmistakably local PostgreSQL values, not production credentials. `NEXT_PUBLIC_API_ORIGIN` is browser-visible and Next.js inlines `NEXT_PUBLIC_*` values at build time; never place secrets in it. `CORS_ORIGIN` is an optional explicit comma-separated allowlist of browser origins; omit it to keep CORS disabled by default. The local example permits only `http://localhost:3000`.

## Optional local PostgreSQL

`compose.yaml` contains only PostgreSQL `18.6`. It binds the database to loopback (`127.0.0.1`) and persists its named volume at PostgreSQL 18's `/var/lib/postgresql` volume location. Applications run on the host, not in Compose.

After copying the API example into a local `.env`, you may start the disposable local database yourself:

```sh
docker compose --env-file apps/api/.env up -d db
```

Do not run this against retained or production data. If host port `5432` is occupied, change both `POSTGRES_HOST_PORT` and the port in `DATABASE_URL` together in your local `apps/api/.env`; for example, use `POSTGRES_HOST_PORT=5433` and `@localhost:5433/` in the URL.

Check the Compose definition without starting a container:

```sh
docker compose --env-file apps/api/.env.example config --quiet
```

## Start the applications independently

With the optional local database already healthy and API/web local configuration present, use separate shells:

```sh
corepack pnpm --filter ./apps/api run build
corepack pnpm --filter ./apps/api run dev
corepack pnpm --filter ./apps/web run dev
```

The API default is `http://localhost:3001`; the web default is `http://localhost:3000`.

## Database baseline

This foundation deliberately has no Prisma model, application table, migration directory, migration lock file, or `_prisma_migrations` table. `db:check` is a read-only `prisma migrate status` inspection and returns exit code `1` on this intentional empty baseline. That is not a successful migration history and must not be converted to success.

`db:migrate:dev` is an alias for `db:dev` and is for a future, reviewed migration only on an explicitly disposable development database. Never use `prisma db push`, `prisma migrate reset`, volume deletion, or production credentials.

## Boundary check

Verify the API and application import boundaries with the pinned runtime:

```sh
npm exec --yes --package=node@24.21.0 -- sh -c 'corepack pnpm check:boundaries'
```

This runs `scripts/check-boundaries.mjs`; it returns nonzero for forbidden layer/application imports or excluded terms in hand-authored shared source. The generated API-client subtree is checked against Nest OpenAPI with `contract:check`, not by lexical heuristics. See [docs/architecture.md](docs/architecture.md) for the full boundary policy.

## Commands and quality gates

Run root commands through the pinned runtime, for example:

```sh
TMPDIR="${TMPDIR:-/tmp}" npm exec --yes --package=node@24.21.0 -- sh -c 'corepack pnpm typecheck'
```

| Root command                     | Expected outcome                                                                                                                                                     |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `corepack pnpm dev`              | Starts API and web development servers in parallel; stop with `Ctrl-C`.                                                                                              |
| `corepack pnpm typecheck`        | Typechecks API, web, and generated `@platform/api-client`; exits nonzero on any TypeScript error.                                                                    |
| `corepack pnpm check:boundaries` | Exits nonzero for forbidden layer/app imports or excluded hand-authored shared-source terms.                                                                         |
| `corepack pnpm lint`             | Lints root scripts, API, and web; exits nonzero on lint errors.                                                                                                      |
| `corepack pnpm format:check`     | Checks apps, packages, scripts, `.github` workflow YAML, all `docs/**/*.md`, and the listed root/spec files; exits nonzero for formatting drift.                     |
| `corepack pnpm test`             | Runs API and web unit/integration tests. With `TEST_DATABASE_URL` absent, DB-backed cases skip; with a disposable URL, they execute read-only checks.                |
| `corepack pnpm test:quality`     | Runs `scripts/test-quality-gates.mjs`; intentionally invalid configuration, query, generated-client drift, and empty-baseline migration status must all be detected. |
| `corepack pnpm test:e2e`         | Runs cached/installed Chromium browser smoke while independently starting API and web test servers.                                                                  |
| `corepack pnpm contract:check`   | Builds the API, exports OpenAPI, regenerates the client in `TMPDIR`, and byte-compares it with the committed generated client.                                       |
| `corepack pnpm db:check`         | Read-only Prisma status inspection. It intentionally exits `1` on this empty baseline, so it is not a passing gate.                                                  |
| `corepack pnpm build`            | Independently builds API and web production artifacts; exits nonzero on either build failure.                                                                        |

Stop any manually started `dev` servers before running the gate suite: `corepack pnpm test` and `corepack pnpm test:e2e` start their own API and web servers, and a second `next dev` refuses to start while one is already running in the same application directory.

Filtered workspace commands are real and may be run only when their narrower scope is intended:

| Command                                                                                                      | Expected outcome                                                                                                                                                                            |
| ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `corepack pnpm --filter ./apps/api run dev`, `start`, `build`, `typecheck`, `lint`, `test`, `contract:check` | Respectively develop/start the built API, build/export OpenAPI, validate types/lint/tests, or perform API contract drift checking. `start` requires a prior build and valid `DATABASE_URL`. |
| `corepack pnpm --filter ./apps/api run prisma:cli -- <Prisma arguments>`                                     | Runs pinned Prisma `7.10.0` with API-local environment loading; use only reviewed, non-destructive commands.                                                                                |
| `corepack pnpm --filter ./apps/api run generate`                                                             | Regenerates the Prisma client.                                                                                                                                                              |
| `corepack pnpm --filter ./apps/api run export:openapi`                                                       | Writes the OpenAPI artifact after the API build.                                                                                                                                            |
| `corepack pnpm --filter ./apps/api run db:dev` or `db:migrate:dev`                                           | Runs `prisma migrate dev` only against an explicitly disposable developer database when a reviewed migration exists.                                                                        |
| `corepack pnpm --filter ./apps/api run db:deploy`                                                            | Runs Prisma `migrate deploy` to apply reviewed, committed migrations non-destructively; it is not applicable to the empty baseline.                                                         |
| `corepack pnpm --filter ./apps/api run db:check`                                                             | Runs read-only Prisma `migrate status`; expected exit `1` on the intentional empty baseline.                                                                                                |
| `corepack pnpm --filter ./apps/web run dev`, `start`, `build`, `typecheck`, `lint`, `test`, `test:e2e`       | Respectively develop/start the built web app, build, validate types/lint/tests, or run browser smoke. `start` requires a prior build.                                                       |
| `corepack pnpm --filter @platform/api-client run generate`                                                   | Regenerates the client solely from `apps/api/dist/openapi.json` after an approved OpenAPI change.                                                                                           |
| `corepack pnpm --filter @platform/api-client run typecheck`                                                  | Typechecks the generated client; this is included in root `typecheck`.                                                                                                                      |

`contract:check` rebuilds the Nest OpenAPI artifact and regenerates the client into a temporary directory under `TMPDIR`; it compares the generated file set and bytes against `packages/api-client/src/generated` without using Git. Run the API-client `generate` command after an approved OpenAPI change, then rerun `contract:check`. Do not manually duplicate generated payload types.

Without `TEST_DATABASE_URL`, the DB-backed API integration assertions are skipped and no database command is run. Set it only to a disposable database. Do not claim a database migration pass without a disposable database and a present, synchronized migration history.

## Troubleshooting

- `docker compose ... config --quiet` fails: confirm Docker Compose is installed and that the API example's `POSTGRES_*` values and `DATABASE_URL` describe the same local user, password, database, and host port.
- Port `5432` is occupied: update `POSTGRES_HOST_PORT` and `DATABASE_URL` together as described above, then recreate only a disposable local service if you chose to run one.
- `db:check` exits `1`: on the stated empty baseline, this means `_prisma_migrations` is absent. Do not create a placeholder table or run destructive Prisma commands to change that result.
- `corepack pnpm test:e2e` reports that the Chromium executable is missing, or `playwright install` fails with HTTP `403` / "not available in your location": the Playwright download CDN is unreachable from some networks. Install the pinned browser revision from a mirror instead, then rerun the smoke test:
  `PLAYWRIGHT_DOWNLOAD_HOST=https://cdn.npmmirror.com/binaries/playwright corepack pnpm --filter ./apps/web exec playwright install chromium`
- A build uses a stale browser API origin: update the local `NEXT_PUBLIC_API_ORIGIN` before rebuilding because Next.js inlines public values at build time.
