# ADR-0001: Foundation workspace, package boundaries and API contract

**Status:** Proposed for 001 implementation review
**Date:** 2026-09-24
**Scope:** `specs/001-platform-foundation/plan.md`

## Context

The Constitution requires a TypeScript modular monolith plus independent Next/Nest applications, downward domain dependencies, OpenAPI-derived frontend contracts, and no speculative infrastructure. The user's later technical brief directs a pnpm monorepo with five named package boundaries and an expanded frontend/tooling list. An earlier plan used npm workspaces and no packages. The approved spec still excludes business features, authentication, forms, and client-owned server workflows. Clarification requires interactive docs to be development-only and the specification artifact to exist in production builds.

## Decision

Use pnpm `11.11.0` workspaces with exact package pins and frozen lockfile. Build two independent apps (`apps/api`, `apps/web`). Introduce `packages/api-client` from Nest-exported OpenAPI and consumed by web; `packages/eslint-config` and `packages/tsconfig` if both apps actually consume them. Reserve `packages/shared` and `packages/config` as named boundaries; do not publish empty runtime packages. Use Tailwind, minimal shadcn-generated primitives and Lucide only where the neutral shell needs them. Prefer Pino structured logging and Zod for suitable runtime schemas, while keeping Nest HTTP validation reflected in Swagger. React Hook Form and TanStack Query are approved for future actual form/client async workflows but are not installed to manufacture scope. Docs page and HTTP OpenAPI route exist only in development; production builds retain a generated artifact without serving it publicly.

## Alternatives considered

- npm workspaces: simpler existing plan, but superseded by explicit user technical direction.
- Materialize all five packages immediately: matches literal tree but yields empty or contrived runtime packages, violating YAGNI/genuine reuse.
- Add a demo form or client async status polling to exercise React Hook Form/Query: adds behavior not approved by spec.
- Manually maintained shared response DTO package: risks divergence from Nest/OpenAPI authority.
- Public production docs: conflicts with accepted security clarification.

## Rationale

This preserves the user's architectural package map while allowing the Constitution and spec to constrain actual production code. Generated contracts keep apps decoupled, shared lint/TS presets reduce duplicated policy, and postponed runtime packages avoid unjustified abstraction. Explicit documentation exposure minimizes security risk before authentication exists.

## Consequences and risks

- Replaces npm commands/lockfile with pnpm/`pnpm-lock.yaml` in plan and quickstart; implementers must not mix managers.
- Generator `@hey-api/openapi-ts@0.99.0` is preferred because `openapi-typescript@7.13.0` peers TypeScript 5; installed compatibility remains a gate.
- Prisma 7 empty-schema migration behavior and exact CLI flow remain implementation checks, not excuses to add domain tables.
- Consumers expecting all five packages on day one must be told `shared` and `config` are reserved, not implemented. If the brief intended mandatory functional content for either, product/technical authority must define a genuine consumer before tasking.
- No hosted deployment, auth or public production docs are introduced.

## Migration and rollback

No application or data exists yet, so migration from the previous plan means replacing planning commands and future workspace setup only. If pnpm or package constraints fail during implementation, stop and revise the plan/ADR before dependency changes. Reverting this ADR/plan restores the earlier npm design but invalidates subsequent pnpm lockfile and scripts; do not mix artifacts. Database rollout/rollback must use reviewed migrations and backups once real data exists.
