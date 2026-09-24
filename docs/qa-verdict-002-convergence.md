# QA Verdict 002 — Independent Re-verification of the Converged Revision (T047–T053)

**QA task:** `converge-independent-qa-004.yaml` (QA-002)
**Date:** 2026-09-24
**Scope:** Independent re-verification of the converged revision that changed API allow-origin handling, the unmatched-route error envelope, the frontend state surface and its browser coverage, and the dependency set. Nothing was taken from the delivery reports: every gate and every required probe was re-executed against the exact working-tree revision, and the riskiest claims were actively falsified.
**Safety:** The only repository file written is this report. No source, test, package, spec, checklist, lockfile, or configuration file was edited. No Git operation was performed (the repository has no `.git`). The disposable PostgreSQL cluster at `127.0.0.1:55499/foundation_verify` was only queried read-only. Temporary probe artifacts were created under `/Users/sajad/.hermes/cache/scratch/` and removed afterwards; every process started was stopped and the final listener sweep is empty.
**Runtime wrapper (used for every command):** `TMPDIR=/Users/sajad/.hermes/cache/scratch npm exec --yes --package=node@24.21.0 -- sh -c '<command>'` — Node `v24.21.0`, pnpm `11.11.0` confirmed. `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` with the cached chromium 1243 revision.

---

## 1. Gate re-runs (raw exit codes, executed on this exact revision)

`TEST_DATABASE_URL=postgresql://postgres@127.0.0.1:55499/foundation_verify` supplied for the DB-backed gates.

| #   | Gate               | Raw exit | Raw result                                                                                   |
| --- | ------------------ | -------: | -------------------------------------------------------------------------------------------- |
| 1   | `check:boundaries` |        0 | `node scripts/check-boundaries.mjs` — no violations                                          |
| 2   | `typecheck`        |        0 | API generate + tsc, web tsc, api-client tsc — no diagnostics                                 |
| 3   | `lint`             |        0 | root scripts + api + web ESLint — clean                                                      |
| 4   | `format:check`     |        0 | `All matched files use Prettier code style!`                                                 |
| 5   | `contract:check`   |        0 | `OpenAPI generated client is current (16 files).`                                            |
| 6   | `test`             |        0 | API `tests 41 / pass 41 / fail 0 / skipped 0`; Web `tests 31 / pass 31 / fail 0 / skipped 0` |
| 7   | `test:quality`     |        0 | `Quality gate probes passed: 4/4.`                                                           |
| 8   | `build`            |        0 | API build + OpenAPI export; Next `16.3.6` build; routes `/`, `/_not-found`, `/states` static |
| 9   | `test:e2e`         |        0 | Playwright Chromium `10 passed (6.1s)`                                                       |

The DB-backed API assertions executed with **0 skipped** (not skipped by absent `TEST_DATABASE_URL`). Web tests emit the known `MODULE_TYPELESS_PACKAGE_JSON` warnings; they do not affect outcomes. These numbers match the convergence report's §4 (`41 / 0 skipped`, `31`, `4/4`, `10 passed`) exactly.

---

## 2. Adversarial probes (riskiest claims)

### 2.1 Allow-origin default-deny — VERIFIED

API started with **no `CORS_ORIGIN`** (`NODE_ENV=test`, synthetic unreachable DB, port 3221). A request carrying `Origin: http://example.com` returned `HTTP 200` with `X-Request-Id` but **no `Access-Control-Allow-Origin` header**:

```
HTTP/1.1 200 OK
X-Request-Id: 64199ab5-e63a-436c-8af3-a81b578cfc78
Content-Type: application/json; charset=utf-8
Content-Length: 33
```

Default-deny holds: no origin is granted access implicitly.

### 2.2 Allow-origin allowlist — VERIFIED

API started with `CORS_ORIGIN=http://allowed.example:4000` (port 3222):

- `Origin: http://allowed.example:4000` → `Access-Control-Allow-Origin: http://allowed.example:4000`, plus `Vary: Origin` and `Access-Control-Expose-Headers: X-Request-Id`.
- `Origin: http://evil.example` → **no** `Access-Control-Allow-Origin` header (only `Vary: Origin` and `Access-Control-Expose-Headers`).

The allowlist is exact and exposes `X-Request-Id` as documented.

### 2.3 Malformed `CORS_ORIGIN` fails startup safely without echoing the value — VERIFIED

Four malformed values were each passed at startup; every one exited with code **1** and the message `Error: Invalid environment variable: CORS_ORIGIN`, and none echoed the supplied value:

| Malformed value                                           | Exit | Value echoed? |
| --------------------------------------------------------- | ---: | ------------- |
| `http://allowed.example:4000/path` (path)                 |    1 | no            |
| `http://allowed.example:4000?x=1` (query)                 |    1 | no            |
| `http://user:secretpw@allowed.example:4000` (credentials) |    1 | no            |
| `this is not a url at all` (non-URL)                      |    1 | no            |

### 2.4 Falsification: the browser cross-origin test really does fail without CORS — VERIFIED (the strongest claim)

The concern was that `apps/web/tests/foundation.e2e.spec.ts` ("fetches the live API across origins without interception") might pass trivially (e.g. if the fetch were intercepted or same-origin). To falsify it, the API was started on the expected port 3999 **without `CORS_ORIGIN`**, the web dev server on 3100, and the full Playwright suite was run with the unmodified tracked config (its `reuseExistingServer: !CI` reused the pre-started servers — no tracked file was edited).

First, the no-CORS API on 3999 was confirmed to return **no** `Access-Control-Allow-Origin` for `Origin: http://127.0.0.1:3100`. Then the suite ran:

```
  1..6  ✓ (baseline shell ×2, intercepted API/web journey ×2, every shared state ×2)
  7     ✘ fetches the live API across origins without interception at narrow width (5.2s)
  8     ✘ fetches the live API across origins without interception at wide width (5.2s)
  9..10 ✓ (not-found focus recovery, injected service fallback)

  2 failed, 8 passed
```

The two cross-origin tests failed exactly as a genuine browser CORS block would, with the assertion failing because the success heading never appeared (the fetch was blocked, so the error fallback rendered instead of `Platform status`):

```
Error: expect(locator).toBeVisible() failed
Locator: getByRole('heading', { name: 'Platform status' })
Expected: visible — Timeout: 5000ms — element(s) not found
  126 | await expect(page.getByRole('heading', { name: 'Platform status' })).toBeVisible();
```

The 8 other tests passed (they either intercept the request or do not depend on cross-origin fetch). This proves the cross-origin test exercises real browser CORS and is a real, falsifiable check — not a tautology. The scratch servers were stopped and the ports swept clean afterwards.

### 2.5 Unmatched-route envelope + dev/prod docs — VERIFIED

Unknown route in **development** and **production** returns the documented safe envelope with a matching request identifier:

```
GET /api/v1/does-not-exist  →  404  (dev and prod identical)
X-Request-Id: 19e83835-b737-4401-986f-debff8ec71c5
{"error":{"category":"application","code":"APPLICATION_ERROR",
 "message":"The request could not be completed."},
 "requestId":"19e83835-b737-4401-986f-debff8ec71c5"}
```

Docs routes:

| Probe                                 | Development                  | Production                                                  |
| ------------------------------------- | ---------------------------- | ----------------------------------------------------------- |
| `GET /api/docs`                       | **200** (`text/html`)        | **404** (safe JSON envelope, not the old `Cannot GET` text) |
| `GET /api/openapi.json`               | **200** (`application/json`) | **404** (safe JSON envelope)                                |
| `apps/api/dist/openapi.json` artifact | present                      | present — **12871 bytes**                                   |

This also resolves the earlier `qa-verdict-001` finding F-006: production docs routes now return the JSON safe-error envelope rather than the Express default text body, while remaining 404.

### 2.6 Dependency set — VERIFIED (with one cosmetic note)

- **`@nestjs/terminus`**: absent from `apps/api/package.json`, absent from `pnpm-lock.yaml` (0 references), no hand-authored import anywhere in `apps/api/src`/`test`, no symlink in `apps/api/node_modules`.
- **`lucide-react`**: absent from `apps/web/package.json`, absent from `pnpm-lock.yaml` (0 references), no import in `apps/web/src`.
- **`zustand`**: pinned `5.0.15` in `apps/web/package.json`, present in the lockfile, but **no** import and **no** store file (`apps/web/src` has no `ui-store.ts`, no `create(`, no `useStore`).

Is retaining `zustand` justified by the constitution? **Yes, with a recorded tension.** The Constitution's _Mandatory Technology Baseline_ names Zustand as the frontend local-state library, and FR-014 forbids inventing a store until a real in-scope interaction needs one — so "pin it, do not instantiate it" is the only reading that satisfies both. This is consistent with plan.md decision 5. A stricter YAGNI (Constitution IV) reading would drop it until a consumer exists, but the explicit baseline is the higher-specificity rule.

**Cosmetic note (not a dependency-set defect):** `node_modules/.pnpm` still physically contains orphaned directories `@nestjs+terminus@12.1.0_…` and `lucide-react@1.47.0_…` from a pre-convergence install. They are not in the lockfile, not symlinked into any app, and not importable; `corepack pnpm install --frozen-lockfile` reports "Already up to date" and does not prune them. A fresh clone (or `pnpm prune`) would not contain them. This is local residue only and does not affect the frozen dependency set.

### 2.7 Frontend state surface — VERIFIED

Live `GET /states` (`next dev`, port 3241) returned `HTTP 200` with exactly **10 distinct** `data-foundation-state` values, each once — `application, empty, global-error, loading, not-found, ready, route-error, service, unexpected, validation` — matching `contracts/frontend-states.md` and `FOUNDATION_STATE_KINDS` exactly. The page contains **0 `<nav>`** and **0 `<form>`** elements. The `/states` page is a Server Component (no `'use client'`), renders only static neutral descriptors (no business vocabulary, no client store, no duplicated server data). The recorded viewport bounds (`narrow 375×667`, `wide 1440×900`) match the `page.setViewportSize` calls in `foundation.e2e.spec.ts` and the `contracts/frontend-states.md` table.

### 2.8 SC-001 / US1.1 fresh-workspace rehearsal — VERIFIED (compact re-run)

A clean copy (rsync excluding `node_modules`/`dist`/`.next`/`.turbo`/`test-results`/`playwright-report`) installed, built, and started both apps from the documented commands alone:

| Step (documented)                                                                         | Raw exit | Result                                       |
| ----------------------------------------------------------------------------------------- | -------: | -------------------------------------------- |
| `corepack pnpm install --frozen-lockfile`                                                 |        0 | `Done in 2.8s using pnpm v11.11.0`           |
| `cp apps/api/.env.example apps/api/.env` + `cp apps/web/.env.example apps/web/.env.local` |        0 | —                                            |
| `--filter ./apps/api run build`                                                           |        0 | —                                            |
| `--filter ./apps/web run build`                                                           |        0 | —                                            |
| API `dev` → `/health/live`, `/health/ready`, `/api/v1/status`                             |        — | **200 / 503 / 200**                          |
| Web `dev` → `/`                                                                           |        — | **200**, first heading `Platform Foundation` |

The 503 on readiness is correct (the example `.env` points at an unreachable local DB, and readiness must reflect database availability).

### 2.9 Disposable cluster untouched (read-only)

`SELECT 1` → `1`; `public` tables = **0**; `_prisma_migrations` = **0**. No mutation, no table created.

---

## 3. Per-claim verdict

| Claim (convergence report)                                                       | Verdict      | Evidence                                                                                                        |
| -------------------------------------------------------------------------------- | ------------ | --------------------------------------------------------------------------------------------------------------- |
| F1 — all ten states rendered + browser-exercised; viewport bounds recorded       | **verified** | §2.7 (10 distinct surfaces, no nav/form) + §1 `test:e2e` 10 passed; bounds match                                |
| F2 — `CORS_ORIGIN` allowlist, default-deny, cross-origin browser success is real | **verified** | §2.1–§2.4 (default-deny, allowlist, malformed fail, and the no-CORS falsification producing exactly 2 failures) |
| F3 — unmatched routes use the safe envelope; prod docs 404 + artifact            | **verified** | §2.5 (404 envelope with requestId; dev 200/prod 404; artifact 12871 bytes)                                      |
| F4 — `@nestjs/terminus` and `lucide-react` removed; `zustand` justified          | **verified** | §2.6 (no import, not in lockfile/manifest; zustand retained under the explicit baseline)                        |
| F5 — clean-workspace rehearsal                                                   | **verified** | §2.8 (fresh copy installs/builds/starts both apps from documented commands)                                     |
| F6 — "18" reconciled to "17"                                                     | **verified** | spec enumerates 17 acceptance scenarios and 17 reconciliation rows                                              |
| F7 — constitution template comment removed                                       | **verified** | grep finds no `Sync Impact` / `remove before committing` in `.specify/memory/constitution.md`                   |

---

## 4. Does the converged revision satisfy spec.md and the constitution?

**Yes — the converged revision satisfies the approved foundation scope and the Constitution v1.0.0, with the same bounded, already-documented limitations that applied at QA-001.**

All nine quality gates pass on this exact revision with raw exit 0 (typecheck, lint, format:check, boundary, contract, quality, e2e, build; the DB-backed suite passes 41/41 with zero skips). Every risky convergence claim was re-verified and the riskiest one (the browser cross-origin test) was successfully falsified and shown to be a genuine, non-tautological check. The previously open QA-001 gaps that the convergence work targeted are now closed: CORS default-deny/allowlist (was "explicitly deferred"), the unmatched-route safe envelope (was "Express default body"), the ten-state browser surface (was "logic-only for loading/empty/route/global error"), the orphaned dependencies (removed), the acceptance-criteria count (reconciled), and the constitution template comment (removed). FR-007, FR-012, FR-013, FR-002, and SC-001/SC-002/SC-006 are now demonstrably satisfied.

## 5. Remaining risks (unchanged or narrowed)

1. **Hosted CI is still unverified.** `.github/workflows/ci.yml` exists and is parse-valid, but has never run on a GitHub runner (the repository is not Git-initialized). All evidence is local-only.
2. **No real Prisma migration exists by design.** `db:check` exits `1` on the empty baseline (`No migration found … not managed by Prisma Migrate`); this is correct and must not be treated as a passing gate.
3. **No true `git clone` is possible** (no `.git`); the fresh-workspace rehearsal (§2.8) is a copy of the working tree, not a clone of a remote revision.
4. **`global-error` has no genuine browser-injected render-failure evidence.** It is covered as a catalogued `/states` surface and by the route-level boundary; a real Next.js global-error fault is not injected end-to-end. The spec reconciliation labels US5.3 "partially demonstrated", which remains accurate.
5. **Orphaned `node_modules/.pnpm` residue** for the two removed packages (§2.6) is a local-only cosmetic leftover; a fresh clone would not carry it.
6. **Web test `MODULE_TYPELESS_PACKAGE_JSON` warnings** remain (5 files) and are harmless; resolving them would need a separately approved manifest change.
7. **404 category semantics:** the API's unmatched-route and not-found responses use the generic `application` category (`APPLICATION_ERROR`) rather than a dedicated `not-found` category. This is consistent with the documented four-category taxonomy and the safe-error envelope, but is worth recording so future work does not assume a distinct not-found category exists.

## 6. Did the delivery reports overstate anything?

**No material overstatement found.** The convergence report's gate counts (`41/0`, `31`, `4/4`, `10 passed`), its CORS/default-deny/allowlist and cross-origin claims, its unmatched-route envelope claim, its dependency-removal claim, and its fresh-workspace rehearsal were each independently reproduced or falsified-checked here. The two findings worth flagging are cosmetic/minor, not overstatements:

- The reports say the removed dependencies are gone; strictly, orphaned physical copies still sit in the local `node_modules/.pnpm` store (§2.6) though they are not in the lockfile and not resolvable. This is environmental residue, not a contradiction of the dependency-set claim.
- The reports correctly _do not_ claim genuine end-to-end global-error injection; that limitation is still honestly labelled (§5.4). No report claims a passing migration, a hosted CI run, or a real Git clone.

---

## 7. Final statement

**Yes — the converged revision satisfies `spec.md` and the Constitution v1.0.0.** All required gates pass on this exact revision with raw exit codes recorded above; every risky new claim held under adversarial re-verification, including a successful falsification of the browser cross-origin test (it genuinely fails when CORS is disabled). The remaining limitations are the same bounded, honestly-labelled ones documented at QA-001 (hosted CI never executed, no real migration, no true git clone, global-error not browser-injected) plus one cosmetic local dependency residue. These are limitations of the non-Git local environment, not silent overclaims or spec violations.

Process cleanup: all probe servers were stopped and the final listener sweep across ports 3000/3001/3100/3999/3221–3227/3231/3232/3241 is empty; all scratch probe artifacts were removed.
