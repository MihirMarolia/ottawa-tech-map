# Feature: Government Contract Fixture to Company Evidence

Status: specified
Date: 2026-07-18

## Problem Statement

Operators and users need to trust that a government contract notice becomes durable, privacy-safe **Evidence** on a **Company** profile — with provenance intact — before the system scales to live sources.

## Solution

A fictional government contract notice is ingested through `SignalIngestionService.ingest`, sanitized by the **Privacy Gateway**, resolved to an existing **Company** by canonical domain, persisted as a government-contract **Signal**, and displayed on the Company profile with full provenance.

## User Stories

1. As an operator, I want a sanitized fictional contract fixture to be accepted through ingestion, so that I can verify the pipeline before connecting live sources.
2. As an operator, I want an exact canonical-domain match to resolve to an existing Company, so that entity resolution works without manual review for unambiguous cases.
3. As a user, I want to see a government-contract Signal on a Company profile with contract type, observation date, confidence, and Source, so that I can trust the evidence chain.
4. As an operator, I want reprocessing the same fixture to create no duplicate Signal, so that ingestion is idempotent.
5. As an operator, I want ingestion to report accepted, rejected, or review-required outcomes, so that failures and ambiguity are visible without silent drops.
6. As a privacy reviewer, I want no raw fixture text in logs, fixtures, snapshots, or UI, so that the privacy boundary is enforced from day one.

## Implementation Decisions

### Primary seam

`SignalIngestionService.ingest(command)` — see `docs/architecture/deep-modules.md`.

### Vertical path

```
fixture
→ Privacy Gateway
→ structured government-contract Signal
→ Entity Resolver
→ repositories
→ Company profile
→ provenance display
```

### Modules built or extended

- **PrivacyGateway** — sanitize fictional fixture; fail closed on unsafe content.
- **EntityResolver** — exact canonical-domain match only in the first tracer bullet; fuzzy matching deferred until a failing test requires it.
- **SignalIngestionService** — orchestrates deduplication, sanitization, extraction, validation, resolution, persistence, audit events.
- Persistence — `sources`, `signals`, `companies` (minimal schema for this feature).
- Operator surface — Company profile evidence section (read-only).
- **CompanyIntelligenceScorer** and **InstitutionalImportService** — out of scope for this feature.

### Entity resolution (first slice)

Only `resolutionMethod: "canonical_domain"` with confidence `1` for exact domain match. Conflicting name/domain evidence returns `review_required` in a later ticket.

### Privacy

Per ADR-0003: no raw source text in persistent storage, logs, or UI. Provenance stores source metadata and content hash.

### Signal shape

Government-contract Signal carries a schema version. Observation date, contract type, confidence, and Source reference are stored and displayed.

### Ingestion outcome

`IngestionOutcome` reports `accepted`, `rejected`, or `review_required` with a reason code.

## Testing Decisions

- Interface-first TDD through public module entry points only.
- Architecture tests: no raw source types past the Privacy Gateway seam; signals require `source_id`; frontend cannot import service-role paths.
- Behaviour tests, not implementation-detail tests — assert `EntityResolutionResult` and `IngestionOutcome` shapes.
- Fixtures are synthetic and pre-sanitized; tests never embed raw personal contact content.

## Out of Scope

- Live government feed connectors.
- Fuzzy entity matching and merge proposals.
- CEGI Score calculation and Government Intent components (separate tracer bullets).
- Institutional CSV import.
- Enricher proposals and approval/apply for Company Facts beyond displaying the Signal itself.

## Acceptance Criteria

- [ ] A sanitized fictional contract fixture is accepted.
- [ ] An exact canonical-domain match resolves to an existing Company.
- [ ] A government-contract Signal is stored once.
- [ ] Reprocessing the fixture creates no duplicate.
- [ ] The Company profile displays contract type, observation date, confidence, and Source.
- [ ] No raw fixture text is displayed or logged.
- [ ] The Signal has a schema version.
- [ ] The ingestion outcome reports accepted, rejected, or review-required.

## Further Notes

Development loop for this feature: spec → tracer-bullet tickets → one ticket per fresh agent context → review → merge only when Definition of Done passes. See `docs/agents/implementation-brief.md`.
