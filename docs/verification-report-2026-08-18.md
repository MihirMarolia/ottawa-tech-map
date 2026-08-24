# Ottawa Tech Map Verification Report — 2026-08-18

## Final combined canonical-baseline addendum

The sole authorized verification environment is **`ottawa-tech-map-verification`** (`hwgneqvtlbqecfroebqz`, `us-west-2`). The final rebuild used the supported linked-project reset path with `--no-seed`; it replayed the local migration chain successfully. No legacy Supabase project was used, no Base44 application code or data was imported, and no Ticket 08B corpus company or offering was promoted into durable canonical data.

During remote-main integration, ten later timestamped wrapper migrations were removed because they replayed migrations already present in the canonical chain. A final additive reconciliation migration preserves the full combined contract: government-contract, job-posting, and offering payload validation; Review Queue and offering audit event types; and projection-only anonymous company reads. It also revokes direct anonymous/authenticated access to `public.companies`, leaving approved projections and the public profile RPC as the read interface.

| Gate | Final canonical result | Status |
|---|---:|---|
| Ordered clean migration replay | 20 migrations; reconciliation migration last | **PASS** |
| Duplicate replay wrapper migrations | 10 wrappers absent from canonical history | **PASS** |
| Durable-schema pgTAP | 30/30 | **PASS** |
| Persistence-adapter pgTAP | 6/6 | **PASS** |
| Review Queue action pgTAP | 19/19 | **PASS** |
| Job-posting signal-contract pgTAP | 6/6 | **PASS** |
| Ticket 07A offerings pgTAP | 21/21 | **PASS** |
| Fixture-only Ticket 08C pgTAP | 8/8 | **PASS** |
| Combined database assertions | 90/90 | **PASS** |
| Durable hosted Supabase integration | 6/6 | **PASS** |
| Typecheck, dependency boundaries, ordinary tests, and build | 67 passed; 8 credential-dependent tests intentionally skipped in the ordinary run | **PASS** |
| Direct anonymous `companies` and `offerings` reads | Denied | **PASS** |
| Direct anonymous proposal and audit reads | Denied | **PASS** |
| Approved public company, offering, and evidence projections | Readable | **PASS** |
| Internal identifiers and unrestricted payloads in public projections | None | **PASS** |
| Anonymous privileged apply and persistence RPC execution | Denied | **PASS** |
| `git diff --check` | Passed | **PASS** |

The credentialed six-scenario integration suite used separated clients through the canonical hosted API boundary. The public client used an anonymous key for public reads; the controlled ingestion client used a service-role key only in process memory. The suite passed accepted ingestion, replay/idempotency, evidence retrieval, eight-way concurrency convergence, cross-source-ID deduplication, and invalid-input rejection. No secret value was written to repository files, generated artifacts, or commit content.

The Ticket 08C boundary remains intact. Its approved 08B research input is represented only by sanitized test fixtures; the runtime contains no YAML parser or direct durable corpus insertion path. The fixture flow continues to exercise the governed Ticket 07A proposal → approval → apply lifecycle, source/signal provenance, idempotency, Review Queue routing, and privacy-safe public projections.

> The combined baseline is ready for the authorized reconciliation commit and push. Base44 remains outside the architecture: only controlled research-derived fixture artifacts are represented, never Base44 application code or a second source of truth.

## Historical verification context

Earlier verification records are retained as context only. They refer to pre-canonical environments and migration states that are no longer authorized for operations. The final combined canonical-baseline result above supersedes those historical gates for release and commit decisions.

### Durable Supabase integration — six scenarios

| # | Scenario | Verified behavior |
|---:|---|---|
| 1 | Accepted ingestion | Controlled RPC ingestion returns an accepted/created outcome and persists source-backed evidence through the governed path. |
| 2 | Replay/idempotency | Repeating an identical submission returns an already-processed outcome without duplicate public evidence. |
| 3 | Evidence retrieval | The public projection retains source-backed evidence provenance. |
| 4 | Concurrency convergence | Eight parallel submissions converge to a single canonical record. |
| 5 | Cross-source-ID deduplication | A replay with a different supplied source ID resolves by fingerprint rather than duplicating the canonical signal. |
| 6 | Invalid-input rejection | An invalid source document is rejected without evidence persistence. |

### Final architecture conclusion

The canonical migration chain, durable schema, Review Queue workflow, job-posting and offering signal contracts, append-only audit behavior, idempotency, concurrency, privacy-safe public reads, and separated-client HTTP integration have been verified together. Public consumers are restricted to approved projections and controlled profile RPCs; governed writes remain service-role-only. The repository migration chain is the canonical schema source.
