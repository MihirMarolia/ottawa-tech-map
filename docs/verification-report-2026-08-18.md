# Ottawa Tech Map — Verification Record

## Historical 07A verification record

The sections below preserve the original 07A and public-read verification findings recorded for the previously used isolated environment. Those historical references are evidence only; they are **not** authorized targets for future operations.

## Canonical-project addendum

The user-controlled canonical environment is now **`ottawa-tech-map-verification`** (`hwgneqvtlbqecfroebqz`, `us-west-2`). It was reset with the supported linked-project reset path and rebuilt from the repository migration chain without seed loading or approved 08B corpus-company imports.

| Gate | Canonical result | Status |
|---|---:|---|
| Ordered clean migration replay | 16 reviewed migrations | **PASS** |
| Durable-schema pgTAP | 30/30 | **PASS** |
| Ticket 07A offerings pgTAP | 21/21 | **PASS** |
| Fixture-only Ticket 08C pgTAP | 8/8 | **PASS** |
| Durable Supabase integration | 6/6 | **PASS** |
| Typecheck, boundary enforcement, ordinary tests, and build | Passed; 42 ordinary tests passed | **PASS** |
| Anonymous `companies` SELECT | Denied | **PASS** |
| Anonymous `offerings` SELECT | Denied | **PASS** |
| Public company and offering projections | Readable | **PASS** |
| Internal IDs in public Company Profile projection | None | **PASS** |
| `git diff --check` | Passed | **PASS** |

The credentialed six-scenario integration suite used genuinely separated clients through the canonical hosted API boundary. The public client used the anonymous key for public reads; the controlled ingestion client used the service-role key only in process memory. No secret value was printed, written to repository files, or committed.

The 08C corpus boundary remains intact. The approved 08B corpus is represented only as sanitized test fixtures, and no approved company domains were found in durable canonical data after the clean reset. The offering observation adapter reuses the existing Ticket 07A proposal → approval → apply lifecycle, provenance, idempotency, and privacy-safe public projections without creating a parallel persistence path.

> The verified baseline is ready for commit. Base44 remains outside the repository architecture: its approved research contribution is represented only through the controlled 08B research and 08C fixture artifacts, not imported application code or a second source of truth.

## Historical detailed findings

The following historical sections document the earlier verification context and remain useful as a record of the remediation path.

### Verification environments

The earlier production Supabase project was not accessed or modified. An earlier isolated non-production project was used to establish the initial schema and security evidence. It is now non-canonical and not authorized for future work.

### Durable Supabase integration — six scenarios

| # | Scenario | Verified behavior |
|---:|---|---|
| 1 | Accepted ingestion | Controlled RPC ingestion returns an accepted/created outcome and persists source-backed evidence through the governed path. |
| 2 | Replay/idempotency | Repeating an identical submission returns an already-processed outcome without duplicate public evidence. |
| 3 | Evidence retrieval | The public projection retains source-backed evidence provenance. |
| 4 | Concurrency convergence | Eight parallel submissions converge to a single canonical record. |
| 5 | Cross-source-ID deduplication | A replay with a different supplied source ID resolves by fingerprint rather than duplicating the canonical signal. |
| 6 | Invalid-input rejection | An invalid source document is rejected without evidence persistence. |

### Architecture conclusions

The durable schema, public-read, offering, audit, idempotency, concurrency, and durable HTTP integration boundaries are verified. Public consumers remain restricted to approved privacy-safe projections; controlled writes remain service-role-only; and the repository migration chain is the canonical schema source.
