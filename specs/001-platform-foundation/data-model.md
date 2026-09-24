# Data Model — 001 Platform Foundation

## Persistent domain entities

**None.** The foundation contains no user, organization, business, platform-domain, or speculative audit entity. PostgreSQL is initialized for future relational models; Prisma schema defines the database connection and generator but no business models. Migration history is infrastructure metadata, not an application entity. If Prisma 7.10 cannot materialize an initial empty migration, document the empty baseline and prove schema status without creating a dummy table.

## Operational data (not persisted as application records)

| Concept | Fields / representation | Validation and privacy | Relationships / transitions |
|---|---|---|---|
| Runtime configuration | Required database connection setting, HTTP listen port and environment; optional public backend origin for frontend | Validate presence/type/range at startup; database URL remains server-only and never logged/returned | Loaded → valid/start, or invalid/abort; not a table |
| Request context | Generated request ID, bounded request method/path, response status, duration | UUID-shaped server-generated identifier; optional supplied ID accepted only after strict bounded check, otherwise replaced; exclude query/body/header secrets | One context per request; included in response header and safe structured log |
| Application success | Stable `data` field for baseline status result | Only neutral status value; no PII | Returned by baseline status operation |
| Application error | `error.code`, `error.category`, `error.message`, optional bounded validation `details`, `requestId` | Stable safe categories; no stack, raw input, SQL/connection data, credentials | Expected validation/application or generic unexpected/service failure |
| Health status | `status`, `requestId`; readiness additionally reports database availability | No connection string or internal database error in public response | Liveness: live/unavailable; readiness: ready/not_ready based on actual database check |

## Validation and integrity rules

- `GET /api/v1/status` accepts no body; optional `format` query permits only `summary`. Any unsupported `format` is a validation error; unknown query fields are rejected, not silently ignored.
- `X-Request-Id` is always returned for handled HTTP responses. Incoming identifiers that fail bounded format validation are discarded and replaced; do not reflect arbitrary client text into logs.
- Frontend discriminates application, validation, network/service, and unexpected errors according to the wire contract and transport outcomes; local UI state remains separate from server data.
- No relational constraints are required until a later feature introduces entities. Subsequent tables must enforce relational integrity and reviewed transactional migrations per Constitution.

See [contracts/openapi.yaml](contracts/openapi.yaml) for exact public wire shapes and [contracts/frontend-states.md](contracts/frontend-states.md) for UI outcomes. The YAML is a design reference; the Nest-exported OpenAPI artifact becomes the runtime authority.
