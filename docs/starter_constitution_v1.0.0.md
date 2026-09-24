# Starter Architecture Constitution

**Version:** 1.0.0  
**Status:** Active  
**Scope:** Universal Business Application Foundation

This Constitution defines the non-negotiable architectural principles, system boundaries, and quality gates for all development within this starter and derivative projects.

---

## 1. Domain Separation & Dependency Hierarchy

- **Layer Hierarchy:** The codebase MUST adhere strictly to the following layered model:
  ```text
  Business Domain  -->  Platform Modules  -->  Core Foundation
  ```
- **Unidirectional Flow:** Dependencies MUST flow downward only. Lower layers (Core, Platform Modules) MUST NOT depend on higher-level business domains or contain business-specific concepts (e.g., `Order`, `Product`, `Patient`, `Booking`).
- **Core Stability:** `Core` handles foundational infrastructure (config, database, logging, errors). It MUST remain domain-agnostic and reusable across different applications without code changes.
- **Explicit Boundaries:** Modules MUST communicate via explicit public APIs and contracts, avoiding circular dependencies and direct internal imports.

---

## 2. Mandatory Technology Baseline

- **Language:** TypeScript across the entire repository. `strict` mode is mandatory. Using `any` is strictly prohibited unless isolated, documented, and justified.
- **Backend:** Node.js, NestJS, PostgreSQL, Prisma.
  - MUST initially operate as a **Modular Monolith**.
  - Microservices, distributed message brokers, and complex caching (e.g., Redis) MUST NOT be introduced without explicit, documented architectural justification.
- **Frontend:** Next.js (App Router), Zustand.
  - Feature-oriented directory structure (`features/*`).
  - Prefer React Server Components; keep `'use client'` boundaries as low in the tree as practical.
  - Zustand is reserved strictly for local and workflow UI state—NEVER use it as a global duplicated server-data cache.

---

## 3. Monorepo & Repository Boundaries

- Applications (`apps/api`, `apps/web`) MUST be logically decoupled, independently buildable, and independently deployable.
- Shared packages (`packages/*`) MUST contain only genuinely reusable, domain-agnostic utilities or type definitions.
- Business domain logic MUST NOT be placed inside shared packages merely for convenience.

---

## 4. Contract-First API & Type Safety

- **REST & OpenAPI:** REST is the default architectural style. NestJS is the authority for API behavior and MUST export OpenAPI specifications.
- **Single Source of Truth:** Frontend contracts MUST be derived from OpenAPI specifications or generated types. Frontend code MUST NOT manually redefine backend payload contracts.
- **Runtime Validation:** All trust boundaries (request bodies, query params, headers, env vars, file uploads) MUST enforce runtime schema validation. TypeScript types alone do not suffice.

---

## 5. Security & Authorization Defaults

- **Server-Side Enforcement:** Authorization MUST be evaluated and enforced strictly on the backend. Frontend permission checks are purely for UX toggles.
- **Default Deny:** Access MUST default to deny. Permissions follow explicit resource-action semantics (e.g., `user.read`, `billing.manage`).
- **Secret Hygiene:** Secrets, tokens, unhashed passwords, and raw PII MUST NEVER be committed, logged, or returned via public API responses.
- **Database Integrity:** Foreign keys, non-null constraints, and uniqueness MUST be enforced at the database level. Multi-step mutations MUST use transactions.

---

## 6. Simplicity & YAGNI Principle

- Optimize for clarity, simplicity, and maintainability before premature scalability.
- Do NOT introduce speculative infrastructure (e.g., Kafka, Kubernetes, Elasticsearch, CQRS, Event Sourcing) until measurable requirements demand it.
- PostgreSQL is the initial source of truth for querying and basic search before adopting external search engines.

---

## 7. Spec-Driven Development (Spec Kit Flow)

Every non-trivial capability MUST strictly adhere to the Spec Kit lifecycle:
```text
constitution  -->  specify  -->  clarify  -->  plan  -->  checklist  -->  tasks  -->  analyze  -->  implement  -->  converge
```
- Implementation MUST conform directly to approved specs and plans.
- If edge cases arise during implementation, the specification or plan MUST be updated first rather than introducing undocumented behavioral drift.

---

## 8. Definition of Done (Quality Gates)

A task or feature is complete ONLY when:
1. Acceptance criteria from the spec are verified.
2. TypeScript compiles without errors in `strict` mode.
3. Automated unit and integration tests pass, including negative/failure paths.
4. Critical user journeys have E2E coverage where applicable.
5. Input validation and backend authorization checks are covered.
6. Database changes include valid Prisma migrations without schema drift.
7. API documentation (OpenAPI) accurately reflects changes.
8. No secrets or unnecessary dependencies are introduced.