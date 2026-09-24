# Database Commands and Empty Baseline

## Scope and safety

Feature 001 intentionally has no Prisma model, application table, migration directory, or migration lock file. This is an empty baseline, not a successful migration history. Do not add a placeholder model/table merely to make Prisma Migrate report success.

All commands use `prisma:cli`, which runs the installed Prisma `7.10.0` CLI through the API's Node environment-file wrapper. The commands neither call `prisma db push` nor `prisma migrate reset`.

| Command                                  | Prisma command          | Intended use                                                                                                    |
| ---------------------------------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------- |
| `pnpm --filter ./apps/api run db:dev`    | `prisma migrate dev`    | Developer-only migration creation/application against an explicitly disposable database.                        |
| `pnpm --filter ./apps/api run db:deploy` | `prisma migrate deploy` | Non-destructive application of reviewed, committed migrations when a future feature has real migration history. |
| `pnpm --filter ./apps/api run db:check`  | `prisma migrate status` | Read-only migration-state inspection; it does not create, reset, push, or modify the database.                  |

`DATABASE_URL` is resolved by `apps/api/prisma.config.ts`. Supply it only through the normal runtime environment or the API-local `.env`; never copy a retained or production URL into test commands.

## Empty-baseline status semantics

Prisma `migrate status` checks the database migration table. Prisma 7.10 returns exit code `1` when that table does not exist. Therefore, against a disposable empty PostgreSQL database with this repository's intentionally empty schema, `db:check` is expected to exit `1`. This is an explicit, truthful result: no migration history exists yet. It must not be transformed into a passing exit code.

`apps/api/test/database.integration.spec.ts` preserves this behavior when `TEST_DATABASE_URL` is supplied. It runs only `db:check` and asserts exit code `1`; it does not create a database, create a table, apply a migration, reset, or push schema state.

## Disposable-database verification

Set `TEST_DATABASE_URL` only to a database that may safely be inspected. The database integration tests use it for a read-only `SELECT 1`, list the public tables, and run `db:check`. If `TEST_DATABASE_URL` is absent, the DB-backed assertions are skipped and no database command is run.

Before a future feature creates its first real application model, review and commit the generated migration SQL. Then use `corepack pnpm --filter ./apps/api run db:dev` only on a disposable developer database. Apply the reviewed, committed migration with `corepack pnpm --filter ./apps/api run db:deploy` in a target environment, then inspect it with `corepack pnpm --filter ./apps/api run db:check`. With an actual synchronized migration history, Prisma 7.10 `migrate status` exits `0`. Neither flow authorizes `prisma db push`, `prisma migrate reset`, volume deletion, or use of retained/production credentials.
