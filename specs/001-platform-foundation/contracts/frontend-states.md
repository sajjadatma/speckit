# Frontend Foundation State Contract

**Scope:** Neutral App Router baseline; no business navigation, metrics, user accounts, or auth. The frontend references generated types/client in `packages/api-client` from the Nest-exported OpenAPI artifact, not backend source. See [openapi.yaml](openapi.yaml) for the design wire target.

| Trigger                                            | Observable state                                                                      | Recovery                                       |
| -------------------------------------------------- | ------------------------------------------------------------------------------------- | ---------------------------------------------- |
| Initial request or route transition pending        | Accessible loading indication within stable global layout                             | Automatically resolves to content or an error  |
| Successful baseline status response                | Neutral ready/status content only                                                     | None required                                  |
| No content in a future page                        | Reusable empty state with neutral explanation                                         | Host page supplies action only when meaningful |
| HTTP validation error (400 shape)                  | Validation category; field identifiers/codes can be shown without raw rejected values | Correct input and retry                        |
| Expected application error                         | Application category; safe message                                                    | Retry/action appropriate to host feature       |
| Transport offline, timeout, or service unavailable | Network/service category; no misleading success                                       | Retry when service returns                     |
| Invalid/unparseable response or unexpected failure | Unexpected category; safe fallback, no stack trace                                    | Retry/reload                                   |
| Unknown route                                      | Not-found page                                                                        | Navigate back to application start             |
| Unexpected route render failure                    | Route-level error fallback; global error fallback if root layout fails                | Retry/reload                                   |

Use semantic state text, keyboard-operable retry/navigation affordances, and visible focus. Layout must work at narrow and wide viewport widths. Zustand stores only local UI/workflow state, never mirrored status/API responses as a global server-data cache. Do not assume or display domain-specific datasets.

## Developer-facing state surface and viewport bounds

`/states` is the neutral developer-facing reference route for browser verification. It has no business content, navigation, form, client store, or duplicate server data. It renders every state through `FoundationStateSurface` and the existing `foundation-states` descriptors; descriptor copy and the ten state kinds remain authoritative.

| State kind     | Browser-visible surface                                                                                                        |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `loading`      | `/states` → `FoundationStateSurface` loading descriptor                                                                        |
| `ready`        | `/states` → `FoundationStateSurface` ready descriptor                                                                          |
| `empty`        | `/states` → `FoundationStateSurface` empty descriptor                                                                          |
| `validation`   | `/states` → `FoundationStateSurface` validation descriptor                                                                     |
| `application`  | `/states` → `FoundationStateSurface` application descriptor                                                                    |
| `service`      | `/states` → `FoundationStateSurface` service descriptor                                                                        |
| `unexpected`   | `/states` → `FoundationStateSurface` unexpected descriptor                                                                     |
| `not-found`    | `/states` → `FoundationStateSurface` not-found descriptor; unmatched-route smoke retains the actual root `not-found.tsx` check |
| `route-error`  | `/states` → `FoundationStateSurface` route-error descriptor                                                                    |
| `global-error` | `/states` → `FoundationStateSurface` global-error descriptor                                                                   |

| Viewport name | Width × height (CSS px) | Browser coverage                                                                                                                            |
| ------------- | ----------------------: | ------------------------------------------------------------------------------------------------------------------------------------------- |
| narrow        |               375 × 667 | baseline, independent API/web journey, and every `/states` surface; no horizontal overflow; all recovery links focusable with visible focus |
| wide          |              1440 × 900 | baseline, independent API/web journey, and every `/states` surface; no horizontal overflow; all recovery links focusable with visible focus |

**Verification:** exercise all states in frontend tests; in browser smoke, open the baseline shell, the `/states` reference, the missing route, the injected fault fallback and the real cross-origin success path at both widths. Test access-layer parsing against actual contract-derived types and failure fixtures without pretending fixtures are live API responses.
