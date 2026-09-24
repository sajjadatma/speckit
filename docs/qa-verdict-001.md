# QA Verdict 001 — Independent Adversarial Verification of Platform Foundation

**QA task:** `foundation-independent-qa-032.yaml` (QA-001)
**Date:** 2026-09-24
**Scope:** Read-only independent verification of the exact working-tree revision. No source, test, package, spec, checklist, or lockfile was edited; no Git command was run; the disposable PostgreSQL cluster at `127.0.0.1:55499` was only queried read-only and was left running. Temporary probe artifacts were created under `/Users/sajad/.hermes/cache/scratch/` and removed after use.
**Runtime wrapper:** every command used `TMPDIR=/Users/sajad/.hermes/cache/scratch npm exec --yes --package=node@24.21.0 -- sh -c '<command>'` (Node `v24.21.0`, pnpm `11.11.0` confirmed).

---

## 1. Gate re-runs (all executed on this revision, raw exit codes)

| #   | Gate                                                                                           | Raw exit | Result                                                                                 |
| --- | ---------------------------------------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------- |
| 1   | `corepack pnpm check:boundaries`                                                               | 0        | `$ node scripts/check-boundaries.mjs` — no violations                                  |
| 2   | `corepack pnpm typecheck`                                                                      | 0        | API generate + tsc, web tsc, api-client tsc — no diagnostics                           |
| 3   | `corepack pnpm lint`                                                                           | 0        | root scripts + api + web ESLint — clean                                                |
| 4   | `corepack pnpm format:check`                                                                   | 0        | `All matched files use Prettier code style!`                                           |
| 5   | `TEST_DATABASE_URL=postgresql://postgres@127.0.0.1:55499/foundation_verify corepack pnpm test` | 0        | API `36 pass / 0 fail / 0 skipped`; Web `31 pass / 0 fail / 0 skipped`                 |
| 6   | `corepack pnpm contract:check`                                                                 | 0        | `OpenAPI generated client is current (16 files).`                                      |
| 7   | `node scripts/test-quality-gates.mjs`                                                          | 0        | `Quality gate probes passed: 4/4.`                                                     |
| 8   | `TEST_DATABASE_URL=… corepack pnpm test:e2e`                                                   | 0        | Playwright Chromium `6 passed (4.6s)`                                                  |
| 9   | `NEXT_PUBLIC_API_ORIGIN=http://localhost:3001 corepack pnpm build`                             | 0        | API build+OpenAPI export; Next `16.3.6` production build; `/` and `/_not-found` static |

Note: the DB-backed API assertions ran (not skipped) because `TEST_DATABASE_URL` was supplied. This directly supersedes `docs/review-001.md` finding F-003 (see §4).

---

## 2. Adversarial probes (riskiest claims)

### 2.1 Boundary checker rejects a real violation — VERIFIED

Injected `import { StatusService } from '../modules/status/status.service.js';` into a temporary copy (`apps/api/src/core/bad.ts`), then ran the checker with `--root <tmp>`:

```
$ node scripts/check-boundaries.mjs --root /Users/sajad/.hermes/cache/scratch/qa-boundary-probe
Boundary violations:
- apps/api/src/core/bad.ts must not import apps/api/src/modules/status/status.service.ts
exit 1
```

The forbidden `core → modules` import is rejected. Probe copy removed afterwards.

### 2.2 Contract drift detects a one-byte tamper — VERIFIED

Copied `packages/api-client/src/generated` to a temp dir, flipped `export` → `expot` in `index.ts`, ran the drift checker against the mutated copy:

```
Error: OpenAPI generated client drift detected (changed: index.ts)
exit 1
```

The same checker returns `exit 0` with `current (16 files)` on the unmodified committed client, so the client is byte-identical to a fresh regeneration and any mutation is caught.

### 2.3 Production docs routes 404 while artifact exists — VERIFIED

Live production API (`NODE_ENV=production`, synthetic unreachable DB, port 3211):

- `GET /api/docs` → **404** (body `Cannot GET /api/docs`; `X-Request-Id` header present)
- `GET /api/openapi.json` → **404** (body `Cannot GET /api/openapi.json`)
- `GET /health/live` → **200**
- `GET /health/ready` → **503** `{"database":"down","status":"not_ready",...}`
- `GET /api/v1/status` → **200** `{"data":{"status":"operational"}}`
- `test -f apps/api/dist/openapi.json` → present, 12871 bytes

### 2.4 Generated client matches the exported artifact — VERIFIED

`contract:check` regenerates from `apps/api/dist/openapi.json` into `TMPDIR` and byte-compares all 16 files. `apps/api/dist/openapi.json` declares exactly the three paths (`/health/live`, `/health/ready`, `/api/v1/status`) matching `contracts/openapi.yaml`. The generated `packages/api-client/src/index.ts` re-exports only `getFoundationStatus` + its types; the web access layer consumes it, not backend source.

### 2.5 DB-backed readiness-up against disposable PostgreSQL — VERIFIED

Test run with `TEST_DATABASE_URL` executed (0 skipped), including `GET /health/ready reports ready only when TEST_DATABASE_URL is supplied`. Live development API (`NODE_ENV=development`, disposable DB, port 3212):

- `GET /health/ready` → **200** `{"database":"up","status":"ready",...}`
- `GET /api/docs` → **200** (interactive docs in dev)
- `GET /api/openapi.json` → **200**
- `GET /api/v1/status?format=invalid` → **400** `VALIDATION_FAILED`
- `GET /api/v1/status?unknown=x` → **400** (strict unknown-query rejection)

### 2.6 Additional safety probes — VERIFIED

- Missing `DATABASE_URL` startup → `exit 1`, message `Error: Invalid environment variable: DATABASE_URL`, no secret echoed.
- Malformed `X-Request-Id: not-a-uuid` → replaced with a fresh UUID in the response.
- Disposable cluster left untouched: `SELECT 1` = 1; `public` tables = 0; `_prisma_migrations` = 0 (read-only queries only).

---

## 3. Acceptance-criteria mapping (headline claims)

| Claim                                                    | Verdict            | Evidence                                                                                                                                                                                                             |
| -------------------------------------------------------- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR-001/FR-017 layer boundaries + one-way deps            | verified           | `check:boundaries` exit 0; §2.1 probe rejects violation; `docs/architecture.md` documents `domain → modules → core`                                                                                                  |
| FR-002 no business entities/UI                           | verified           | Prisma schema has no model; `public` schema empty; business-term scan of hand-authored `apps/api/src` and `apps/web/src` returns zero matches (only Prisma generator boilerplate comments in `src/generated/prisma`) |
| FR-003 independent apps                                  | verified           | both build/start independently; boundary check rejects `apps/web → apps/api/src`; `build` exit 0                                                                                                                     |
| FR-004/FR-005 config validation + safe examples          | verified           | `test:quality` "configuration absent" PASS; §2.6 missing-DATABASE_URL exit 1; `.env.example` uses `***`                                                                                                              |
| FR-006 empty DB baseline + reproducible workflow         | verified           | `db:check` exit 1 by documented design (no `_prisma_migrations`); no table created                                                                                                                                   |
| FR-007/FR-008 centralized validation + safe errors       | verified           | live 400 `VALIDATION_FAILED`; safe 500 shape in tests; redaction tests pass                                                                                                                                          |
| FR-009 structured, correlated, redacted logs             | verified           | `X-Request-Id` on all responses incl. 404; diagnostics/redaction tests pass; malformed-ID replacement live-probed                                                                                                    |
| FR-010 readiness reflects DB availability                | verified           | live 200 (DB up) / 503 (DB down); DB-backed test executed                                                                                                                                                            |
| FR-011 dev docs vs prod artifact                         | verified           | §2.3 (prod 404 + artifact) and §2.5 (dev 200)                                                                                                                                                                        |
| FR-012 keyboard + visible focus + 5 states               | partially verified | e2e covers narrow/wide baseline, not-found focus recovery, service fallback; loading/empty/error states are logic-tested (31 web tests), not all browser-exercised                                                   |
| FR-013 four error categories                             | verified           | `apps/web/src/lib/api/errors.ts` classifies application/validation/service/unexpected; `api-client.spec.ts` + `service-error.spec.ts` pass                                                                           |
| FR-014 no server-data mirror / no invented store         | verified           | `ui-store.ts` deliberately absent; no Zustand usage (see F-001)                                                                                                                                                      |
| FR-015/FR-016 docs + quality gates                       | verified           | all 9 gates re-run clean; `README.md`/`quickstart.md` commands match                                                                                                                                                 |
| SC-001 fresh-environment walkthrough                     | partially verified | in-place walkthrough (`verification-001.md`) works, but no Git repo exists so a true fresh clone was not possible                                                                                                    |
| SC-003 status matches spec + prod docs absent + artifact | verified           | §2.3/§2.4                                                                                                                                                                                                            |
| SC-004 missing config / DB-down never ready              | verified           | §2.6 + §2.3                                                                                                                                                                                                          |
| SC-005 failure ID + zero secrets                         | verified           | §2.6 + redaction tests                                                                                                                                                                                               |
| SC-006 baseline + states at two widths + keyboard        | partially verified | e2e narrow/wide + keyboard focus; some states logic-only                                                                                                                                                             |
| SC-007 documented pass/fail commands                     | verified           | §1 gates                                                                                                                                                                                                             |

---

## 4. Defects / findings (severity)

- **F-001 (open, medium — unchanged from review-001):** `@nestjs/terminus`, `zustand`, and `lucide-react` are pinned but have zero imports in hand-authored source. Re-confirmed by source scan (0 matches each). The hand-written health service does not use Terminus; no Zustand store exists (intentional); `lucide-react` is unused. Violates YAGNI; requires an owner decision to remove.
- **F-002 (open, low):** `apps/api/.env.example` carries a predictable local Compose password (`foundation_local_password_not_for_production`). Non-secret by design, `.gitignore` protects real `.env`, but must stay local-only.
- **F-003 (stale/refuted):** `review-001.md` claimed DB-backed/readiness-up checks were skipped with no live database. Independent re-run with `TEST_DATABASE_URL` proves all 36 API tests pass with **0 skipped**, including readiness-up and empty-schema inspection. This finding no longer holds.
- **F-004 (open, low):** CI workflow exists (`.github/workflows/ci.yml`, valid YAML, no secrets) but has no GitHub execution evidence because the repo is not initialized as Git.
- **F-005 (low, informational):** `.specify/memory/constitution.md` retains its "Sync Impact Report" HTML comment marked "temporary review material; remove before committing".
- **F-006 (low, informational):** production `/api/docs` and `/api/openapi.json` 404 bodies are Express default text/HTML (`Cannot GET …`), not the JSON safe-error envelope. `X-Request-Id` is still present. Acceptable under FR-011 (page unavailable) but the 404 path bypasses the standard error convention.
- **F-007 (low, process):** `tasks.md` still shows T046 as `[ ]` unchecked although `docs/verification-001.md` documents that walkthrough. Checklist-state inconsistency only.

## 5. What the reports overstate (none material)

- `docs/verification-001.md` ledger is accurate and re-verified; its "remaining risks" (§1–§6) are honest and still apply (hosted CI unverified, no real migration, DB cluster not stopped, no production/perf/network verification, web test `MODULE_TYPELESS_PACKAGE_JSON` warnings).
- `docs/review-001.md` F-003 is the only claim now overtaken by evidence (superseded, not fabricated).
- No report claims a passing migration, a GitHub CI run, a fresh Git clone, or full browser coverage of every state — those are correctly labelled "partially demonstrated"/"unverified".

---

## 6. Remaining risks

1. Hosted CI never executed (no Git remote / runner). Local-only evidence.
2. No real Prisma migration exists by design; `db:check` exits 1 on the empty baseline and must not be treated as passing.
3. No true fresh clone was possible (repo has no `.git`); the walkthrough ran in-place.
4. The "loading", "empty", and route-error/global-error states are logic-tested but not all browser-exercised at runtime.
5. Unused dependencies (F-001) remain in the manifest until an owner removes them.
6. No CORS allow-origin policy (explicitly deferred in plan, not delivered).

---

## 7. Final statement

**Yes — the revision satisfies the approved foundation scope, with conditions.** All 9 required quality gates pass on this exact revision (raw exit 0 for typecheck, lint, format:check, boundary, contract, quality, e2e, and build; the DB-backed test suite passes 36/36 with zero skips against the disposable PostgreSQL). Every risky claim probed adversarially held: the boundary checker rejects a real `core → modules` import, the contract drift checker detects a one-byte tamper, the generated client is byte-identical to a fresh regeneration, production docs routes 404 while the artifact exists, and readiness reports ready only against a live database. No business entity, business UI, committed secret, or forbidden dependency exists in hand-authored source.

Conditions attached to completion: (a) hosted CI and a true fresh-clone walkthrough remain unproven because the repository is not Git-initialized; (b) the database baseline is intentionally empty with no migration, so `db:check` exiting 1 is expected and correct; (c) three shared frontend states (loading, empty, route/global error) are logic-tested rather than browser-exercised; (d) the unused dependencies in F-001 require an owner decision. These are documented limitations, not silent overclaims.
