# API Contract Pipeline

## Authority and ownership

NestJS is the sole runtime OpenAPI authority. The design YAML at `specs/001-platform-foundation/contracts/openapi.yaml` is a target for reconciliation, not a second runtime source of truth.

The API owner exports the current Nest OpenAPI artifact during the build or contract-check workflow. That artifact is the sole input to generation of `packages/api-client`. The generated client and generated artifacts have one owner; consumers must use them rather than manually duplicating request or response payload types. Contract generation must include a drift check so the exported artifact and generated client cannot silently diverge.

## Exposure policy

The generated OpenAPI artifact is retained for production builds. Interactive documentation at `/api/docs` and the HTTP OpenAPI route at `/api/openapi.json` are development-only and must return HTTP 404 in production. They are not application operations in the contract.

## Browser allow-origin policy

`CORS_ORIGIN` is an optional comma-separated allowlist of exact HTTP(S) browser origins. When it is configured, the API enables CORS only for those origins, exposes `X-Request-Id`, accepts only `GET` requests with `Content-Type` and `X-Request-Id` request headers, and does not enable credentials. When `CORS_ORIGIN` is unset, CORS is disabled (default-deny). Invalid values fail API startup with a safe `CORS_ORIGIN` configuration error that does not expose the supplied value.

## Design-target reconciliation

T044 compared `specs/001-platform-foundation/contracts/openapi.yaml` with `apps/api/dist/openapi.json` and `packages/api-client/src/generated/sdk.gen.ts`.

- The three delivered operations and their operation IDs agree: `GET /api/v1/status` (`getFoundationStatus`), `GET /health/live` (`getLiveness`), and `GET /health/ready` (`getReadiness`). The generated client exports matching functions for all three.
- The status 200/400/500 responses, request-ID headers, strict `format=summary` query, safe error shape, and readiness 200/503 body agree in wire semantics.
- The design YAML previously declared a liveness 500 response. The actual Nest export declares only its implemented 200 response, so T044 removed that unexported response from the design target. The global safe-error mechanism remains implemented but is not an explicit liveness operation response in the exported contract.
- The Nest/Swagger export inlines response schemas, emits tags, and leaves `components.schemas` empty; the design YAML uses reusable component references and explanatory descriptions. This is representational generator output, not a wire-behaviour divergence.

`contract:check` rebuilds the export and byte-compares a fresh temporary generated client with the owned `packages/api-client/src/generated/` files. It verifies export-to-client drift; it does not make the hand-authored design YAML a second runtime authority.

## Unresolved risk

The approved plan requires an explicit allowed-origin policy for independent deployments, but it does not define the allowed-origin values or a final policy. No CORS allowlist or behavior is introduced here. Resolve that decision in the later configuration/security work before cross-origin browser access is enabled.
