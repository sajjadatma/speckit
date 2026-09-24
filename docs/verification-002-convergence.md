# Verification 002 — Convergence fixes and fresh-workspace rehearsal

Scope: the Phase 10 convergence work (T047–T053) that closed the findings raised by
`/speckit-converge`, plus the clean-workspace rehearsal required by SC-001 / US1.1. This report
records raw command outcomes only; interpretations and remaining limits are stated explicitly at
the end.

Method: every command below was executed on this machine against the converged revision of
`/Users/sajad/Documents/Tasks/arghavan/my-project`. Node `24.21.0` and pnpm `11.11.0` were used
through the pinned wrapper documented in `README.md`. No Git operations were performed and no
repository history exists to compare against.

## 1. Fresh-workspace rehearsal (SC-001, US1.1)

A clean copy of the repository was created with `rsync`, excluding `node_modules`, `dist`,
`.next`, `.turbo`, `test-results`, `playwright-report`, and `.git`. Nothing was pre-installed and
no environment variable was exported before the documented steps, except the disposable
`TEST_DATABASE_URL` used later by the DB-backed test cases.

| Step (exactly as documented)                   | Raw outcome                                                                |
| ---------------------------------------------- | -------------------------------------------------------------------------- |
| Clean copy of the repository                   | exit 0                                                                     |
| Toolchain versions                             | exit 0                                                                     |
| `corepack pnpm install --frozen-lockfile`      | exit 0 — "Lockfile is up to date"                                          |
| `cp apps/api/.env.example apps/api/.env`       | exit 0                                                                     |
| `cp apps/web/.env.example apps/web/.env.local` | exit 0                                                                     |
| `corepack pnpm --filter ./apps/api run build`  | exit 0                                                                     |
| `corepack pnpm --filter ./apps/api run dev`    | starts with no exported variables: "Nest application successfully started" |
| `corepack pnpm --filter ./apps/web run dev`    | serves the baseline page                                                   |

HTTP probes against the freshly started applications:

| Probe                                                         | Result                                                |
| ------------------------------------------------------------- | ----------------------------------------------------- |
| `GET /health/live` (no reachable database)                    | `200`                                                 |
| `GET /health/ready` (no reachable database)                   | `503`                                                 |
| `GET /api/v1/status` with `Origin: http://localhost:3000`     | `200`                                                 |
| `Access-Control-Allow-Origin` for that allowed origin         | `http://localhost:3000`                               |
| `Access-Control-Allow-Origin` for an unlisted origin          | absent (default-deny)                                 |
| `GET /api/v1/does-not-exist`                                  | `404` with the shared safe envelope and a `requestId` |
| `GET /api/docs` (development environment from `.env.example`) | `200`                                                 |
| `GET /` on the web app                                        | `200`, first heading `Platform Foundation`            |
| `GET /states` on the web app                                  | `200`, 10 distinct `data-foundation-state` values     |

Documented gates in that fresh copy, in the order given by `quickstart.md`:

| Gate               | First pass | Clean re-run (no `dev` servers running) |
| ------------------ | ---------- | --------------------------------------- |
| `typecheck`        | exit 0     | —                                       |
| `lint`             | exit 0     | —                                       |
| `format:check`     | exit 0     | —                                       |
| `check:boundaries` | exit 0     | —                                       |
| `contract:check`   | exit 0     | —                                       |
| `test`             | exit 1     | **exit 0** (11 s)                       |
| `test:quality`     | killed     | **exit 0** (7 s, 4/4 probes)            |
| `build`            | exit 0     | —                                       |
| `test:e2e`         | exit 0     | —                                       |

Both first-pass anomalies were caused by the rehearsal harness, not by the product, and both are
recorded in section 2 rather than hidden.

## 2. Findings surfaced by the rehearsal

### V-1 — `test:quality` could hang indefinitely in a documented workspace (fixed)

The quality-gate probe `configuration absent` asserts that API startup fails without a reachable
configuration. It spawned `apps/api/dist/main.js` from the API directory while removing
`DATABASE_URL` from the child environment. In a workspace where the documented step
`cp apps/api/.env.example apps/api/.env` has been followed, Nest's `ConfigModule` loads that
`.env` from the working directory, so the API legitimately started and listened instead of exiting
— and because the gate's command runner had no timeout, the probe waited forever.

Observed before the fix, in the fresh copy: the probe's child `dist/main.js` was alive after
6 minutes 22 seconds with the gate still running; there are no PASS lines and no failure, only an
unbounded wait. The same gate run in the repository (no `.env` present) completed in seconds.

Fixes applied to `scripts/test-quality-gates.mjs`:

- every externally spawned command is now bounded by a timeout and fails loudly with
  `Command did not exit within …ms` instead of hanging a gate;
- the `configuration absent` probe now runs the built application from a temporary directory that
  contains no `.env` file, so it tests the application's fail-fast validation rather than the
  developer convenience file.

Verification after the fix: the gate passes 4/4 in the repository, and in the fresh copy that
still contains `.env` it passes 4/4 in 7 seconds with no hang.

Recorded correction: an earlier hypothesis in this session claimed the API ignored `.env` because
the runtime scripts lacked `--env-file`. That hypothesis was wrong — the rehearsal showed the
documented startup working from `.env` alone — and the speculative script change made on its
basis was reverted, so no redundant environment loading remains.

### V-2 — the gate suite conflicts with manually started `dev` servers (documented)

The first full gate pass recorded `test` exit 1 with:

```
Error: Next dev server exited before serving HTTP; stderr: ⨯ Another next dev server is already running.
```

The web startup test starts its own `next dev`, which refuses to run while the rehearsal's manual
web `dev` server was still running in the same application directory. This is expected Next.js
behaviour and an ordering mistake in the rehearsal script, not a product defect: with the manual
servers stopped, `test` exits 0 in 11 seconds. The constraint is now stated in `README.md` and
`quickstart.md` so the documented flow cannot produce this confusing failure.

## 3. Convergence findings and their closing evidence

| Finding                                                                              | Change                                                                                                                                | Evidence                                                                                                                                                                                                     |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| F1 — shared states not all rendered or browser-exercised; viewport bounds unrecorded | `apps/web/src/app/states/page.tsx` renders every shared state; `contracts/frontend-states.md` records the narrow/wide bounds          | `/states` returns 10 distinct state kinds over HTTP; Playwright exercises the baseline, every shared state, the missing route, the injected fault, and the cross-origin success path at 375×667 and 1440×900 |
| F2 — no allow-origin policy; cross-origin success unproven in a browser              | `CORS_ORIGIN` allowlist with default-deny, `X-Request-Id` exposure, no credentials; Playwright now performs a real cross-origin fetch | Allowed origin receives `Access-Control-Allow-Origin`, unlisted origin receives none, a malformed value fails startup without echoing it; the browser test that performs no request interception passes      |
| F3 — unknown and non-development docs routes bypassed the safe error envelope        | Unmatched routes now return the shared envelope with a request identifier                                                             | `GET /api/v1/does-not-exist` → `404` plus the documented envelope; production docs routes remain `404` with the OpenAPI artifact retained                                                                    |
| F4 — dependencies pinned with zero consumers                                         | `@nestjs/terminus` and `lucide-react` removed; `zustand` retained with a recorded justification                                       | Boundary, contract, and dependency checks pass; no hand-authored import of the removed packages remains                                                                                                      |
| F5 — no clean-workspace rehearsal                                                    | This report                                                                                                                           | Section 1                                                                                                                                                                                                    |
| F6 — `spec.md` claimed "18 acceptance criteria" while enumerating 17                 | `spec.md` corrected                                                                                                                   | Count matches US1.1–US6.2                                                                                                                                                                                    |
| F7 — constitution carried template text                                              | Template comment removed from `.specify/memory/constitution.md`                                                                       | Governing document matches the approved text                                                                                                                                                                 |

## 4. Converged revision gate results (repository)

All nine root gates were executed against the converged revision with the disposable database
available:

| Gate               | Result                                        |
| ------------------ | --------------------------------------------- |
| `format:check`     | exit 0                                        |
| `typecheck`        | exit 0                                        |
| `lint`             | exit 0                                        |
| `check:boundaries` | exit 0                                        |
| `contract:check`   | exit 0                                        |
| `test`             | exit 0 — API 41 pass / 0 skipped, web 31 pass |
| `test:quality`     | exit 0 — 4/4 probes                           |
| `build`            | exit 0                                        |
| `test:e2e`         | exit 0 — 10 passed                            |

## 5. Remaining limits and risks

- There is no Git repository, so no fresh-clone, hosted-CI, or diff-based evidence exists. The
  rehearsal in section 1 is a copy of the working tree, not a clone of a remote revision.
- The GitHub Actions workflow is committed but has never executed on a hosted runner.
- Browser evidence is Chromium only, through the cached revision installed from a mirror.
- `packages/api-client/src/generated` is not `exactOptionalPropertyTypes`-clean; the web
  application keeps a scoped opt-out recorded in its own configuration.
- `loading` and global-error rendering are exercised as catalogued state surfaces and through the
  route-level error boundary; the browser suite does not inject a genuine Next.js global-error
  failure, which remains unexercised end to end.
- `db:check` intentionally exits `1` on the empty baseline and is not a passing gate.
- Module-type warnings from Node's test runner are emitted by the web test files and do not affect
  outcomes.
- The rehearsal ran from the working tree, so its `dist` and `.next` outputs are ignored
  artefacts, not committed build results.
- Profile-switch notifications could not be delivered because no Telegram recipient is
  configured for the connected bot.
