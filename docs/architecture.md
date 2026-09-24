# Architecture Boundaries

## Application boundaries

`apps/api` and `apps/web` are independently buildable, startable, and deployable applications. They communicate only through the documented API contract. Neither application may import the other application's source.

The API is a modular monolith. Its approved dependency direction is literal:

```text
domain -> modules -> core
```

Dependencies may only point to the next lower layer. `core` must not import `modules` or `domain`; `modules` must not import `domain`; and circular imports are prohibited. New API code must use the owning layer's public barrel rather than another layer's internal file.

## API ownership and public surfaces

- `apps/api/src/core` owns reusable technical foundations: configuration, database lifecycle, validation, error handling, logging, security policy, and observability. Its public surface is `apps/api/src/core/index.ts`; it exports the configuration/database foundations plus the reusable status-query and safe-error schemas used by the status module.
- `apps/api/src/modules` owns reusable platform capabilities and composes approved core public exports. Its public barrel, `apps/api/src/modules/index.ts`, exports `StatusModule`, the neutral status capability added by T024. Future modules must add only their deliberate public exports.
- `apps/api/src/domain` is reserved for future business capabilities. Feature 001 creates no business modules, entities, workflows, or domain implementation. Future domain code may use module public surfaces, not core internals.
- Each layer exposes only intentional public surfaces. Future work must not reach across layer internals.

Before adding a future module, confirm its platform-versus-business ownership, select its layer, define its public exports, check import direction and circular dependencies, add or update boundary tests, and document any new API contract surface. Do not create a module barrel, registration, business route, or shared runtime package merely as a placeholder.

## Boundary check

Run the root checker with:

```sh
corepack pnpm check:boundaries
```

It executes `node scripts/check-boundaries.mjs`. The checker rejects forbidden `core -> modules/domain`, `modules -> domain`, `apps/web -> apps/api/src`, and `packages/api-client -> apps/api/src` imports, plus excluded business concepts in hand-authored shared-package source. It deliberately skips only `packages/api-client/src/generated` for lexical vocabulary because its generic transport helpers are generator templates; `contract:check` verifies those generated files against Nest OpenAPI. Its API fixture tests exercise compliant, violating, and generated-template cases.

## Package boundaries

Applications may consume selected public shared packages, but never each other's implementation source. `packages/api-client` will be generated from the Nest-exported OpenAPI artifact and consumed as the API boundary; it is not a place for backend DTO imports. `packages/eslint-config` and `packages/tsconfig` are shared policy packages consumed by both applications.

`packages/shared` and `packages/config` are reserved names, not required empty packages. Create either only after a concrete neutral multi-app consumer is approved. Shared packages must not contain domain logic, credentials, or backend implementation details.

Dependencies follow the same rule: a pinned runtime dependency must have a hand-authored consumer, or an explicit recorded justification. Convergence removed `@nestjs/terminus` and `lucide-react` for having no consumer (FR-002, Constitution principle IV). `zustand` remains pinned because the constitution's technology baseline mandates it as the local-state library, and it stays uninstantiated until a real in-scope interaction needs it. Do not reintroduce a dependency without its consumer.

One recorded strictness exception exists: `apps/web/tsconfig.json` disables only `exactOptionalPropertyTypes`, because the machine-owned, drift-gated generated client transport (`packages/api-client/src/generated`) is not clean under that flag and is consumed as source rather than as declarations. Every other shared strict option, including `strict`, `noImplicitAny`, and `noUncheckedIndexedAccess`, stays enabled in both apps, and hand-authored source must still be written as if the flag were on.

## Current foundation scope

The API exposes three real surfaces — `GET /api/v1/status`, `GET /health/live` and `GET /health/ready` — over validated configuration, an intentionally empty Prisma baseline, a shared safe error schema, request-ID correlation and structured, redacted logging. Browser access is closed by default: cross-origin requests are permitted only for the explicit `CORS_ORIGIN` allowlist, and every unmatched route returns the same safe error envelope as any other failure. The web app is a neutral App Router shell whose baseline page renders a client status island that consumes the generated `packages/api-client` through the reusable access layer in `apps/web/src/lib/api`, showing loading, success, or a bounded fallback; the reusable loading, empty, error, not-found, and fallback surfaces are catalogued at `/states`, which renders reference markup only and holds no data. Feature 001 still contains no business modules, entities, business UI, accounts or authentication; later work must add capabilities through the documented boundaries rather than bypassing them.

## Client state

No global client store exists. The only client-owned state is the status island's loading/success/failure state, which lives inside a single component and needs no cross-component sharing or persistence, so the optional Zustand store for this feature (T038) is intentionally deferred and `apps/web/src/features/foundation/ui-store.ts` is deliberately absent. Server responses are never mirrored into client state; add a store only when a real multi-component client-owned interaction exists.
