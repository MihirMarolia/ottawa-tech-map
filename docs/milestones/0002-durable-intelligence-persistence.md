# Milestone 0002 — Durable intelligence persistence

Released as `v0.2.0-durable-persistence`.

## Proven capabilities

The repository now provides a reproducible Supabase/PostgreSQL persistence model for the intelligence slice:

```text
independently resolvable ingestion item
→ canonical Source resolution
→ exact existing Company resolution
→ canonical Signal upsert
→ temporal Company–Signal attribution
→ terminal ingestion outcome and Audit Event
```

The database contract proves:

- forward-only schema reproduction from an empty local database;
- canonical Source identity enforced by normalized URL and content hash;
- deterministic Signal fingerprints with nullable external references;
- atomic conflict handling that makes concurrent identical ingestion converge on one Source, Signal, and active Company–Signal link;
- one transaction per ingestion item, with accepted, review-required, and rejected terminal outcomes kept distinct;
- exact active canonical-domain Company resolution without automated Company creation;
- temporal Company–Signal attribution rather than destructive reassignment;
- relational, ranked Review Queue candidates with immutable decision-time snapshots;
- immutable review decisions that support append-only supersession;
- an append-only, privacy-safe Audit Event ledger;
- row-level security, restricted grants, reviewer-specific access, and public evidence views that do not expose privileged fields;
- fixed `search_path` and explicit authorization on security-definer functions;
- database validation of fingerprint inputs, structured payload shape, observation date, confidence, and schema version.

## Concurrency and verification proof

The local database verification workflow resets and reapplies the migration, runs pgTAP contract tests, executes independent concurrent PostgreSQL sessions, and repeats the clean migration test. Eight simultaneous identical attempts produce exactly one `accepted_created` result and seven `accepted_already_processed` results while sharing the same canonical Source and Signal identities.

The repository check additionally runs strict TypeScript validation, dependency-boundary analysis, the full application test suite, and the production build. Service-role credentials remain isolated from the web boundary.

## Operational boundary

This milestone changes no remote Supabase project and adds no runtime dependency. External fetching, sanitization, enrichment, and validation remain outside database transactions. Administrative deployment, reviewer interfaces, and retention operations are intentionally deferred.

The existing in-memory repositories remain available for fast unit and application tests. The application accepted path has not yet been switched to Supabase, so this milestone proves the durable database contract independently of adapter integration.

## Next design gate

Ticket 06 will add Supabase-backed persistence adapters and ingestion RPC integration while preserving the existing domain interfaces and outcomes:

```text
existing application ingestion path
→ Supabase adapter
→ atomic ingestion RPC
→ database outcome mapping
→ durable Company evidence query
```

Ticket 06 must retain in-memory adapters for fast tests, keep external I/O outside database transactions, and add local-Supabase integration coverage. It must not add reviewer actions, remote deployment, or new Signal types.
