# Implementation Plan: 001 Platform Foundation

**Branch**: No Git repository is initialized | **Date**: 2026-09-24 | **Spec**: [spec.md](spec.md)
**Status**: Reconciled to the delivered local system by T044. T046's exact-revision walkthrough and independent QA are still required before technical completion.

## Delivered Summary

The repository is a domain-neutral pnpm workspace with separately runnable NestJS API and Next.js App Router applications. It delivers validated API configuration, a deliberately empty PostgreSQL/Prisma baseline, neutral status and health endpoints, request correlation and redacted structured logging, safe errors, a Nest-exported OpenAPI build artifact, a drift-gated generated TypeScript client, and a responsive neutral web shell. No authentication, business entities, business UI, or deployment infrastructure is delivered.

The build artifact `apps/api/dist/openapi.json` is the runtime OpenAPI authority. `specs/001-platform-foundation/contracts/openapi.yaml` is a reviewed design reference reconciled to the exported surface; `packages/api-client/src/generated/` is generated from the exported artifact and has one owner. Interactive `/api/docs` and HTTP `/api/openapi.json` routes are development-only; production retains the build artifact but exposes neither route.

## Technical Context

| Area | Delivered baseline |
| --- | --- |
| Runtime/workspace | Node.js `24.21.0`, pnpm `11.11.0` through Corepack, TypeScript `6.0.3` strict |
| API | NestJS `12.1.0`, Swagger `12.0.2`, config `12.0.1`, Zod `4.6.5`, Pino `10.3.1`/nestjs-pino `5.2.0` |
| Database | PostgreSQL-compatible Prisma `7.10.0` with `@prisma/adapter-pg` `7.10.0`; no Prisma model, migration directory, migration lock, or application table |
| Web | Next.js `16.3.6`, React `19.3.0`, Tailwind `4.3.3`, Zustand `5.0.15` retained as the constitution-mandated local-state library but deliberately not instantiated (no in-scope interaction needs it) |
| Contract client | `@hey-api/openapi-ts` `0.99.0`, generated from `apps/api/dist/openapi.json` |
| Verification | Node tests, Playwright `1.63.0` smoke, boundary/contract/format/type/lint/build gates, and a CI workflow configured but not executed on GitHub |

Exact resolved versions are frozen in `pnpm-lock.yaml`; this plan does not authorize a dependency or lockfile change.

## Delivered Architecture and Boundaries

```text
domain -> modules -> core
```

- `apps/api` and `apps/web` are independently buildable/startable applications and must not import each other's source.
- API `core` owns configuration, Prisma lifecycle/readiness, validation, safe errors, logging, request IDs, and OpenAPI setup. `modules` currently owns only neutral `status` and `health`. `domain` is documentation-only and contains no feature implementation.
- The real public HTTP surface is `GET /api/v1/status`, `GET /health/live`, and `GET /health/ready`. The status endpoint rejects unknown query parameters and GET bodies; health liveness is database-independent; readiness performs a bounded database query and returns 503 with `not_ready`/`down` when unavailable.
- Request IDs are UUIDs in the `X-Request-Id` response header. The safe error body contains `error.code`, `error.category`, `error.message`, optional bounded `details`, and `requestId`; raw input, stack traces, database URLs, credentials, and PII are excluded.
- `packages/api-client` is a machine-owned, drift-gated generated client. The recorded strictness exception is limited to `apps/web/tsconfig.json` disabling `exactOptionalPropertyTypes`, because generated client transport source is consumed directly; shared strict checks otherwise remain enabled.
- `packages/eslint-config` and `packages/tsconfig` have real consumers. `packages/shared` and `packages/config` are deliberately absent until an approved neutral consumer exists.

`docs/architecture.md` is the operative module-placement and public-surface guide. The root `check:boundaries` gate rejects prohibited API-layer and cross-application imports and forbidden business vocabulary in hand-authored shared source.

## Database Baseline and Safety

Feature 001 intentionally has an empty Prisma schema. `db:check` runs read-only `prisma migrate status` and is expected to exit 1 on an empty disposable database because `_prisma_migrations` does not exist. This is not a passing migration history and must not be hidden with a placeholder table.

Future migrations require reviewed SQL, a disposable development database for `db:dev`, and the non-destructive `db:deploy` followed by `db:check`. `prisma db push`, `prisma migrate reset`, and use of retained/production credentials are prohibited. See `docs/database.md` for exact semantics.

## Quality and Delivery State

Root scripts provide `typecheck`, `check:boundaries`, `lint`, `format:check`, `test`, `test:quality`, `contract:check`, `db:check`, `test:e2e`, and `build`. API scripts default `DATABASE_URL` to a synthetic unreachable value during self-checking build/test gates; a real database is not contacted unless `TEST_DATABASE_URL` is supplied. Root typecheck includes `packages/api-client`; root format checks `.github` YAML and `docs/**/*.md`. `docs/starter_constitution_v1.0.0.md` is deliberately excluded in `.prettierignore` as an upstream byte-preserved artifact.

`.github/workflows/ci.yml` declares frozen installation, PostgreSQL service, quality/negative-path/contract/browser/build jobs. Its YAML is locally parse-validated, but no GitHub execution evidence exists. The acceptance-criteria mapping in [spec.md](spec.md) identifies every delivered evidence path and the remaining unproven scenarios.

## Reconciliation Decisions and Risks

1. The design contract's explicit `/health/live` 500 response was removed because the actual exported OpenAPI artifact declares only its implemented 200 response. The shared runtime safe-error mechanism is not a separately exported liveness response.
2. The exported artifact uses inline schemas and tags rather than reusable component references; this is representational generator output, not a different wire behaviour. The design reference preserves equivalent reviewed wire shapes.
3. The allow-origin question is resolved by an explicit, validated `CORS_ORIGIN` allowlist with default-deny (T048): when the variable is set the API enables CORS for exactly those origins, exposes `X-Request-Id`, and never enables credentials; when it is unset CORS stays disabled, so no cross-origin browser access is granted implicitly.
4. Passing local/unit evidence does not demonstrate a fresh checkout, live disposable PostgreSQL readiness-up or migration inspection, all frontend state visuals at two viewports, a production HTTP probe, or a GitHub CI run. These are T046/QA evidence obligations.
5. Convergence (T050) removed `@nestjs/terminus` and `lucide-react` because no hand-authored consumer existed for either, which conflicted with FR-002 and Constitution principle IV (Simplicity & YAGNI). `zustand` is retained as the constitution-mandated local-state library, deliberately uninstantiated until a real in-scope interaction needs it. This is the only dependency change in the feature.

## Rollback

This reconciliation changes only documentation and design metadata. Revert the documentation revision if necessary; it has no runtime, database, dependency, or deployment effect. Future schema changes require their own reviewed forward-migration and recovery plan.
