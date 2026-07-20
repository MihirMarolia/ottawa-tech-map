# Feature: Durable Intelligence Persistence

Status: specified
Date: 2026-07-20

## Objective

Replace the completed government-contract slice's in-memory storage with durable Supabase repositories without changing its domain behaviour:

```text
existing fixture
→ existing application services
→ Supabase repositories
→ persisted Company, Source, Signal, and Review Queue item
→ application restart
→ the same records remain available
```

Ticket 05 establishes the database schema and enforceable persistence contracts. Repository replacement belongs to Ticket 06.

## Identity

- PostgreSQL-generated UUIDs are the only canonical database identifiers.
- Caller-provided Source identifiers are non-canonical correlation metadata only when they identify a real external system.
- The fictional fixture identifier is discarded after canonical Source resolution; Ticket 05 does not add a speculative external-reference table.
- Active Companies have a unique normalized canonical domain. Automated ingestion never creates or mutates canonical Company identity.
- A Source is unique by `(normalized_url, content_hash)`.
- A Signal has a required, versioned SHA-256 fingerprint and a nullable external reference.
- Signal uniqueness is `(signal_fingerprint_version, signal_fingerprint)`.
- Company attribution exists only through temporal `company_signal_links`, not on `signals`.

## Signal fingerprint contract

The application supplies normalized fingerprint components, a domain-specific discriminator, a canonical serialization, a fingerprint version, and a lowercase 64-character SHA-256 digest. PostgreSQL recomputes the digest from the canonical serialization and rejects a mismatch.

The canonical serialization must use UTF-8, deterministic key ordering, no insignificant whitespace, normalized strings, ISO dates, canonical decimal strings, and explicit nulls for identity fields. Shared TypeScript and PostgreSQL fixture vectors are required before Ticket 06 is complete.

An external reference is source-system metadata, not universal Signal identity. When it is absent, the signal schema must provide a deterministic domain-specific discriminator.

## Transaction boundary and concurrency

External I/O, privacy screening, sanitization, enrichment, validation, candidate generation, and fingerprint preparation occur before a database transaction.

Each independently resolvable ingestion item commits one short transaction containing its complete terminal outcome:

- `accepted_created`;
- `accepted_already_processed`;
- `review_required`; or
- `rejected`.

The parent Ingestion Run represents batch lifecycle and is managed across item transactions.

Concurrent identical attempts use PostgreSQL unique constraints and atomic `INSERT ... ON CONFLICT` at `READ COMMITTED`. They converge on one Source, one Signal, and one active Company–Signal link. Signal insertion determines created versus already processed. Advisory locks and application mutexes are out of scope.

The Ticket 06 transaction boundary is a controlled PostgreSQL RPC. Ticket 05 defines its contract but does not implement the complete ingestion repository.

## Company resolution

Automated ingestion continues only when exactly one active Company matches the normalized canonical domain. Missing, ambiguous, conflicting, invalid, inactive, merged, or disputed identity enters the Review Queue with an explicit reason.

Canonical Company creation and identity mutation require an audited reviewed action. Ticket 05 defines the schema boundary; Ticket 08 implements the actions.

## Review Queue and decisions

Review Queue candidates are ranked relational child rows. Each candidate optionally references a canonical Company and stores immutable decision-time name, domain, status, confidence, match basis, and rationale snapshots.

Review Queue items retain only allowlisted, schema-versioned sanitized proposals and privacy-safe resolver metadata. Raw source material, unrestricted model output, request bodies, personal information, credentials, and stack traces are forbidden.

Review decisions are immutable. Reversal appends a superseding decision and compensating state transitions; it never edits the original decision or deletes history. Company–Signal links retain temporal validity and creation/invalidation provenance.

## Audit ledger

`audit_events` is an append-only, privacy-safe ledger of material ingestion and review transitions. Events record actor identity, event type, run/item and canonical entity references, correlation ID, timestamp, and allowlisted metadata.

Application roles may insert and read only where explicitly authorized; they may not update or delete audit events. A defensive trigger rejects mutation. Corrections append a new event. Retention policy is deferred, but normal application deletion is prohibited.

## Access boundaries

- Anonymous clients read only an approved public Company Evidence view.
- Public evidence excludes internal UUIDs, fingerprints, run/item identifiers, audit metadata, Review Queue data, correlation IDs, unrestricted payloads, and private external references.
- Authenticated users are not automatically reviewers. Reviewer access requires an additional authorization check and controlled views or RPCs.
- Browser roles receive no direct writes to canonical tables.
- The ingestion service invokes controlled functions rather than issuing unrestricted writes.
- `SUPABASE_SERVICE_ROLE_KEY` is server-only and must never enter browser code, public environment variables, logs, fixtures, snapshots, or repository files.

## Migration and testing contract

Production migrations are ordered, deterministic, forward-only, and applied once. Failures are corrected through compensating migrations. Destructive changes must be isolated and documented.

Docker plus the Supabase CLI local stack is the supported development and CI path. CI must:

1. start a fresh local database;
2. apply every migration in order;
3. run schema, constraint, RLS, transaction, append-only, and genuine concurrency tests;
4. destroy or reset the database;
5. recreate it and reapply every migration;
6. rerun a migration smoke test.

Ordinary database tests roll back transactions. Concurrency tests use eight committed parallel attempts with unique correlation IDs and prove one created outcome, seven already-processed outcomes, and one canonical Source, Signal, and active link.

## RPC contracts

Ticket 05 implements only the minimal `persist_government_contract_item(...)` proof RPC needed to validate item-level atomicity and concurrent convergence. Ticket 06 may refine that implementation behind the same outcome contract.

The durable ingestion boundary returns one of:

```text
accepted_created(source_id, signal_id)
accepted_already_processed(source_id, signal_id)
review_required(review_queue_item_id)
rejected(rejection_code)
```

Ticket 08 must implement reviewer-authorized transactional RPCs equivalent to:

```text
select_review_candidate(review_queue_item_id, candidate_id, rationale)
reject_review_item(review_queue_item_id, rationale)
create_company_from_review(review_queue_item_id, proposed_identity, rationale)
reopen_review_item(review_queue_item_id, supersedes_decision_id, rationale)
supersede_review_item(review_queue_item_id, replacement_context, rationale)
invalidate_company_signal_link(link_id, supersedes_decision_id, rationale)
```

Those functions must verify reviewer membership in the database, append immutable Review Decisions and Audit Events, and apply compensating temporal state. Browser roles receive no direct mutation grants.

Technical transaction failure is recorded separately through a recovery transaction using an enumerated privacy-safe failure category; it is never represented as a domain rejection.


## Ticket 05 scope

Ticket 05 includes:

- local, project-neutral Supabase configuration;
- Companies, Sources, Signals, Company–Signal links;
- Ingestion Runs and ingestion run items;
- Review Queue items and relational candidates;
- immutable review decisions;
- append-only audit events;
- identity, provenance, confidence, payload, status, and temporal constraints;
- RLS, grants, public evidence and reviewer read contracts;
- documented RPC signatures;
- local migration and database verification;
- architecture enforcement for service-role isolation.

Ticket 05 excludes:

- remote project linkage or migration execution;
- production repository implementations;
- complete ingestion or review RPC behaviour;
- reviewer UI;
- real external Source-reference storage;
- retention jobs;
- additional Signal schemas;
- automated Company creation;
- Gemini, scraping, scoring, maps, or broader ingestion.

## Completion criterion

```text
start local Supabase
→ apply all migrations
→ prove constraints, RLS, append-only behaviour, and concurrent convergence
→ reset the database
→ reapply every migration
→ run the full repository check
```

No remote database is touched by Ticket 05.
