# Verification 003 — Hosted push and first CI runs

Scope: the repository's initial Git history and push to
`https://github.com/sajjadatma/speckit`, plus the two defects that the first hosted
continuous-integration runs exposed and their fixes. This report supersedes the
"hosted CI never executed" and "no Git repository exists" limitations recorded in
`docs/verification-002-convergence.md` §5 and `docs/qa-verdict-002-convergence.md` §5.

## 1. Published revision

| Item              | Value                                            |
| ----------------- | ------------------------------------------------ |
| Remote            | `https://github.com/sajjadatma/speckit` (public) |
| Default branch    | `main`                                           |
| Initial commit    | `2e94b7e` — 144 files, 15,533 insertions         |
| Follow-up commits | `922777a` (CI), `e0007c7` (web typecheck)        |
| Tracked files     | 144                                              |
| Local = remote    | `e0007c7` on both sides                          |

Only `*.env.example` files are tracked. The working `.env` and `.env.local` files, build
output, generated Prisma client, and test artifacts remain ignored, so no credentials or
generated output were published. A scan of the staged revision for credential patterns
(`ghp_`, `gho_`, `github_pat_`, `sk-`, `AKIA`, private keys, `xox[baprs]-`) returned no
matches, and the committed example password is the explicit placeholder
`foundation_local_password_not_for_production`.

The first push attempt was rejected because the CLI token lacked the `workflow` scope
(GitHub refuses OAuth-app pushes that create files under `.github/workflows/`). The scope
was granted, after which the same revision pushed cleanly. Two attempts returned a
transient GitHub `Internal Server Error` before succeeding; a single-file probe push
created and then deleted a scratch branch, confirming the repository itself accepted
pushes and that the errors were transient.

## 2. Defects the first hosted CI run exposed

Both defects were invisible locally because the working tree already contained generated
artifacts that a clean checkout does not have.

### V-3 — `setup-node` with `cache: pnpm` ran before pnpm existed

First hosted run (`36013676334`, 26 seconds) failed during `actions/setup-node@v4` with
`Unable to locate executable file: pnpm.` — the step's pnpm cache lookup runs before the
workflow's later corepack step could enable pnpm.

Fix (`922777a`): Node is installed first without a pnpm cache, then the pinned pnpm
version is enabled through corepack. A comment in the workflow records the ordering
constraint.

### V-4 — a clean checkout could not typecheck the web app

The next hosted run reached the `Typecheck` step and failed with exit code 2:

```
next-env.d.ts(3,8): error TS2882: Cannot find module or type declarations for side-effect import of './.next/dev/types/routes.d.ts'.
next-env.d.ts(4,8): error TS2882: Cannot find module or type declarations for side-effect import of './.next/dev/types/root-params.d.ts'.
```

`apps/web/next-env.d.ts` is machine-generated and rewritten by whichever Next command ran
last: `next dev` references `.next/dev/types/*`, while `next typegen` and `next build`
reference `.next/types/*`. The committed revision held the developer variant, so a clean
checkout had no matching declarations. Locally, and in the earlier clean-workspace
rehearsal, a dev server had already generated them, which is why the gate appeared green.

Reproduced and fixed in an isolated copy of the repository:

| Step                               | Result                                                               |
| ---------------------------------- | -------------------------------------------------------------------- |
| `tsc --noEmit` on a clean checkout | exit 2 — the two `TS2882` errors above                               |
| `next typegen`                     | exit 0, "Types generated successfully", writing `.next/types/*.d.ts` |
| `tsc --noEmit` again               | exit 0                                                               |

Fix (`e0007c7`): the web `typecheck` script runs `next typegen` before `tsc`, so the
documented gate works on a clean checkout instead of depending on a previous dev or build
run.

## 3. Hosted verification result

Run `36014234119` (commit `e0007c7`, branch `main`) completed with **success** — every
step green on GitHub's hosted runner, including the PostgreSQL 17 service container:

| Step                          | Result  |
| ----------------------------- | ------- |
| Checkout, Node, pinned pnpm   | success |
| Install frozen workspace      | success |
| Typecheck                     | success |
| Lint                          | success |
| Check formatting              | success |
| Unit and integration tests    | success |
| Negative-path quality gates   | success |
| Contract drift check          | success |
| Browser smoke (Playwright)    | success |
| Independent production builds | success |

This is the first genuine clean-environment evidence for the project: it proves the
documented gates pass on a fresh Linux checkout with a real PostgreSQL service, which no
local rehearsal could establish.

## 4. Remaining notes

- The workflow annotates that `actions/checkout@v4` and `actions/setup-node@v4` target
  Node.js 20 and are forced onto Node.js 24. This is informational and does not affect
  results; it should be revisited when those actions publish newer majors.
- No branch protection or required status check is configured on `main`.
- The workflow has no deployment job, by design.
- Five failed runs remain in the run history: the scratch-branch probe, the two
  pre-fix `main` pushes, and the two intermediate fixes. They are retained as an honest
  record rather than deleted.
