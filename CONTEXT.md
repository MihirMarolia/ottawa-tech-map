# CONTEXT.md

Index for the layered documentation under `docs/`. Read this first, then follow the link most relevant to your task.

## Vision
- [Product thesis](docs/vision/product-thesis.md) — what we are and why.

## Domain
- [Ubiquitous language](docs/domain/ubiquitous-language.md) — shared vocabulary. Use these terms exactly.
- [Company intelligence](docs/domain/company-intelligence.md) — what we capture about a Company.
- [Signal provenance](docs/domain/signal-provenance.md) — every field traces back to a signal.
- [Entity resolution](docs/domain/entity-resolution.md) — how we merge and split Entities.
- [Privacy boundary](docs/domain/privacy-boundary.md) — what we don't collect and how we redact.
- [Scoring](docs/domain/scoring.md) — confidence from signal to proposal to approval.

## Architecture
- [System context](docs/architecture/system-context.md) — the high-level shape.
- [Ingestion pipeline](docs/architecture/ingestion-pipeline.md) — collectors → validators → enrichers → agent actions → approval → apply.
- [Deep modules](docs/architecture/deep-modules.md) — Privacy Gateway, Entity Resolver, Signal Ingestion, Intelligence Scoring, Institutional CSV Import.
- [Frontend boundary](docs/architecture/frontend-boundary.md) — what the web app may and may not do.
- [Decisions](docs/architecture/decisions/) — ADRs.

## Features
- [Durable intelligence persistence](docs/features/durable-intelligence-persistence.md) — Supabase schema, identity, transaction, concurrency, RLS, review, and audit contracts.
- [Government contract fixture → Company evidence](docs/features/government-contract-fixture-to-company-evidence.md) — first tracer-bullet feature, completed in milestone 0001.
- [Completed feature specs](docs/features/) — written when a feature ships.

## Milestones
- [Government contract evidence](docs/milestones/0001-government-contract-evidence.md) — proven ingestion, idempotency, evidence, review outcomes, and current persistence limitation.
- [Durable intelligence persistence](docs/milestones/0002-durable-intelligence-persistence.md) — reproducible PostgreSQL persistence, atomic concurrent idempotency, review history, audit, and access boundaries.

## Agents
- [Agent skills config](docs/agents/) — issue tracker, triage labels, domain-doc rules.

## Out of scope
- [Rejected ideas](docs/out-of-scope/rejected-ideas.md) — what we won't build and why.

## Engineering constitution
- [ENGINEERING.md](docs/ENGINEERING.md) — the seven principles every change is reviewed against.

## Engineering workflows
- [Local Supabase verification](docs/engineering/local-supabase.md) — reproducible migration, constraint, access-boundary, and concurrency testing.
