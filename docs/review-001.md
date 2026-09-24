# Review 001 — Hygiene, Dependencies, Generated Artifacts, and Migration Safety (T045)

**Scope:** Evidence-only review of versioned repository artifacts. This review does not inspect untracked local settings, does not change application/package/test source, lockfiles, checklists, or workflow files, and does not make a Git claim.

## Evidence examined

| Area                           | Evidence                                                                                                 | Result                                                                                                                                                                                                                                                                                                                                                                                    |
| ------------------------------ | -------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Secret hygiene                 | `.gitignore:16-18`, `apps/api/.env.example:1-9`, `apps/web/.env.example:1-3`, diagnostics tests          | Pass with follow-up note. Environment files are ignored while `.env.example` remains versioned. Examples label themselves local-only; the API URL uses `***`, and browser configuration contains only a public local origin. Tests explicitly assert that connection URLs, credentials, PII, request bodies, and stack text are not returned/logged.                                      |
| Versioned secret scan          | Repository text scan for password/token/secret/API-key assignments                                       | No committed credential was identified in reviewed hand-authored configuration. Matches were generated transport/auth template symbols and deliberately sentinel test strings. The API example's `POSTGRES_PASSWORD=foundation_local_password_not_for_production` is an obvious local Compose bootstrap value, not a production credential; retain only if this convention is acceptable. |
| Lockfile and declared versions | `package.json`, app/package manifests, `pnpm-lock.yaml` resolved entries                                 | Pass for frozen, pinned direct versions: Node/pnpm and declared API/web/client packages agree with lockfile resolution evidence. No dependency or lockfile change was made.                                                                                                                                                                                                               |
| Used package boundaries        | package manifests; imports under `apps/`; `packages/` inventory                                          | `@platform/api-client`, Zod, Prisma adapter/client, and nestjs-pino have concrete consumers. `@platform/eslint-config` and `@platform/tsconfig` are real policy packages; no `packages/shared` or `packages/config` directory exists.                                                                                                                                                     |
| Generated artifact ownership   | `apps/api/dist/openapi.json`, `packages/api-client/src/generated/`, `scripts/check-contract.mjs`         | Pass. Nest export is built before generation; `contract:check` regenerates to a `TMPDIR` directory and byte-compares the complete generated file set. `apps/api/src/generated/prisma/` is ignored.                                                                                                                                                                                        |
| Migration safety               | `apps/api/prisma/schema.prisma`, `apps/api/package.json`, `docs/database.md`, database integration tests | Pass with evidence limitation. Schema has only generator/datasource, no models/migrations. `db:check` is read-only and expected to exit 1 on an empty baseline; prohibited destructive flows are documented. No live disposable database was supplied for this review.                                                                                                                    |
| CI workflow                    | `.github/workflows/ci.yml`                                                                               | YAML defines read-only contents permission, pinned Node/pnpm, disposable PostgreSQL, frozen install, quality/contract/browser/build jobs, and no deploy job or secret reference. It was locally YAML-parse-validated by prior delivery evidence but has no GitHub-run evidence.                                                                                                           |

## Findings

### F-001 — Unused/speculative direct runtime dependencies need an owner decision (medium)

Evidence: no hand-authored application import was found for `@nestjs/terminus`, `zustand`, or `lucide-react`; the delivered architecture explicitly says the Zustand store is intentionally deferred. `@nestjs/terminus` is not used by the hand-authored health implementation, which uses the local health service/controller. `lucide-react` also has no observed import. The packages are pinned in `apps/api/package.json` and `apps/web/package.json` and resolved in `pnpm-lock.yaml`.

Impact: this is contrary to the YAGNI requirement if the packages have no concrete delivered consumer. It is not changed here because removal would require an approved manifest/lockfile change.

Follow-up decision: either identify their concrete approved use or schedule a dependency-removal task that owns both manifests and the lockfile, then rerun the full quality gates.

### F-002 — Example Compose password is deliberately non-secret but should remain unmistakably disposable (low)

Evidence: `apps/api/.env.example:5` supplies a predictable local-only PostgreSQL password while `.gitignore` protects real `.env` files. This supports an immediately runnable disposable Compose database, but it must never be copied into deployed settings.

Impact: no exposed production secret was found. The residual risk is human misuse of a familiar example value.

Follow-up: retain the existing local-only label and review it whenever deployment configuration is introduced; do not reuse this value outside disposable local development.

### F-003 — Migration/readiness-up evidence is not available in this environment (medium) — SUPERSEDED

Superseded by `docs/qa-verdict-001.md` §2.5/§1: an independent run with `TEST_DATABASE_URL` against the disposable PostgreSQL cluster executed the DB-backed assertions (API `36 pass / 0 fail / 0 skipped`, including readiness-up and the empty-schema inspection). The limitation below applied only to this review's own run, which had no `TEST_DATABASE_URL` supplied.

Evidence (this review's run): the API suite passed with `TEST_DATABASE_URL` absent and skipped the DB-backed assertions, including readiness-up and empty-schema inspection. `docs/database.md` correctly records the empty-baseline `db:check` exit-1 semantics.

Impact: migration safety is specified and offline behaviour is tested, but a live disposable PostgreSQL proof is still unproven.

Follow-up: T046 must run the documented DB-backed checks only against a disposable database and record raw results; it must not manufacture a placeholder model or migration.

### F-004 — CI configuration is not CI execution evidence (low)

Evidence: `.github/workflows/ci.yml` is syntactically present and scoped without deployment credentials, but no GitHub run exists in this non-Git local environment.

Follow-up: execute the workflow on the intended hosted revision before claiming CI verification.

## Command evidence from this review

```text
TMPDIR=/Users/sajad/.hermes/cache/scratch npm exec --yes --package=node@24.21.0 -- sh -c "corepack pnpm --filter ./apps/api run test"
exit 0
Node test summary: 36 tests; 32 pass; 0 fail; 4 skipped (all DB-backed/readiness-up checks gated by absent TEST_DATABASE_URL).
```

```text
TMPDIR=/Users/sajad/.hermes/cache/scratch npm exec --yes --package=node@24.21.0 -- sh -c "corepack pnpm contract:check"
exit 0
API artifact rebuilt; temporary regenerated client matched all 16 owned generated files.

TMPDIR=/Users/sajad/.hermes/cache/scratch npm exec --yes --package=node@24.21.0 -- sh -c "corepack pnpm format:check"
exit 0
All files in the configured format scope passed.
```

The API test is required because T044 changed the hand-authored OpenAPI design contract.

## Review conclusion

No committed production credential, speculative Prisma entity, package-shared business implementation, destructive migration command, deployment credential, or generated-artifact ownership breach was identified in the reviewed scope. The unused direct dependencies and the absent live database/hosted-CI evidence are release-review findings, not silently waived conditions.
