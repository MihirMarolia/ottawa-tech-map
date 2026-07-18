# Milestone 0001 — Government contract evidence

Released as `v0.1.0-intelligence-slice`.

## Proven capabilities

The repository now proves one coherent intelligence path:

```text
sanitized fictional government-contract fixture
→ Privacy Gateway
→ exact canonical-domain Company resolution
→ Source and government-contract Signal
→ Company Evidence query
→ Company profile presentation
```

The same application path also proves:

- accepted, rejected, and review-required ingestion outcomes remain distinct;
- rejected privacy-verification failures persist no Source, Signal, or Review Queue item;
- conflicting name/domain evidence persists no unresolved Signal and is routed to a minimal Review Queue presentation with its reason and Company candidates;
- every persisted Signal retains Source provenance, observation date, confidence, schema version, and external reference;
- Source identity uses normalized source URL plus a canonical content hash;
- Signal identity remains distinct from Source and Company identity;
- identical replay returns `already_processed` with the stable existing Company, Source, and Signal identifiers;
- later distinct Signals for the same Company remain ingestible;
- the Company profile visibly presents contract type, observed date, confidence, and Source;
- raw source text is not persisted, logged, or rendered.

## Architecture proof

The architecture harness analyzes the production module boundaries with dependency-cruiser. It verifies that the web application cannot import privileged ingestion or database code and that package tests cannot bypass deep-module entry points. Trust-boundary tests prevent raw source text from reaching model-facing interfaces.

The repository check runs strict TypeScript validation, dependency-boundary analysis, the full test suite, and the production build.

## Current limitation

Persistence is intentionally in memory. The milestone proves deterministic application semantics, not durability across application restarts or concurrency-safe production idempotency. Production persistence still requires database-generated canonical identifiers, PostgreSQL uniqueness constraints, atomic upserts, explicit transactions, RLS boundaries, and isolated service-role credentials.

In-memory repositories remain the default for unit tests, fast TDD, deterministic application tests, and domain debugging when durable repositories are added.

## Next design gate

The next milestone replaces storage without changing the proven domain behaviour:

```text
existing fixture
→ existing application services
→ Supabase repositories
→ persisted Company, Source, Signal, and Review Queue item
→ application restart
→ the same records remain available
```

Do not begin Gemini enrichment, scraping, scoring, maps, or broader ingestion until durable persistence, concurrent idempotency, Review Queue workflow, RLS, audit requirements, and migration testing are coherently specified.
