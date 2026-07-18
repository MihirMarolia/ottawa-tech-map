# 02 — Ingest contract fixture to Company profile evidence

**What to build:** A sanitized fictional government contract fixture is ingested through `SignalIngestionService.ingest`, resolves by exact canonical domain to an existing Company, persists one government-contract Signal, and displays contract type, observation date, confidence, and Source on the Company profile. Ingestion reports `accepted`.

**Blocked by:** 01 — Scaffold deep modules and TypeScript project

**Status:** ready-for-agent

**Feature spec:** `docs/features/government-contract-fixture-to-company-evidence.md`

**Implementation note:** Use fixture-backed or in-memory persistence unless persistent infrastructure already exists. Include only the minimum schema needed for the vertical path — do not pre-build the full production schema.

- [ ] Sanitized fictional contract fixture is accepted through ingestion
- [ ] Exact canonical-domain match resolves to an existing Company with `resolutionMethod: "canonical_domain"` and confidence `1`
- [ ] One government-contract Signal is stored with a schema version and required provenance (`source_id` not null)
- [ ] Company profile displays contract type, observation date, confidence, and Source
- [ ] No raw fixture text appears in logs, fixtures, snapshots, or UI
- [ ] Ingestion outcome is `accepted`
- [ ] Interface-first tests cover Privacy Gateway, Entity Resolver, and Signal Ingestion through public entry points only
