# CanadaBuys Review-Only Dry-Run Verification — 2026-08-25

## Purpose and authorization boundary

This record documents the bounded, run-on-demand CanadaBuys award-notice dry run authorized for Proofward's government-record intake pilot. It is **not** a review disposition, an approval record, a Company registry, an Offering catalogue, or a public publication decision.

The sole authorized database target was `hwgneqvtlbqecfroebqz` (`ottawa-tech-map-verification`). The pilot used the official CanadaBuys award-notices resource under the Open Government Licence – Canada with the source attribution retained in durable Source metadata. [1] [2]

## Intake boundary

| Control | Verified implementation |
|---|---|
| Operating mode | Manually run, bounded dry run; no scheduler or background worker |
| Source fetch | Official current CSV only; named client headers; initial 4 MB HTTP range |
| Record cap | 20 records, within the approved 20–50 range |
| Fields admitted to candidate normalization | Official identifiers, amendment context, status, procurement category, supplier-name presence, official publication date, record and dataset URLs, and attribution metadata |
| Fields discarded before candidate persistence | Address, contact, telephone, email, fax, and free-text award description |
| Entity resolution | No supplier-name-to-Company resolution; proposed canonical domain remains null |
| Public exposure | None; `public.public_company_offerings` remained empty |

## Actual durable outcome

The capped source inspection considered 20 official records. Sixteen records met the narrow candidate-routing rules and were persisted as private Review Queue items. Four records were held before persistence because their procurement category did not include the pilot's `SRV` routing marker. The record list, supplier identities, official identifiers, and internal review UUIDs are intentionally omitted from this document.

| Durable measure | Result after initial delivery | Result after one exact-manifest replay |
|---|---:|---:|
| Canonical Review Queue items | 16 | 16 |
| Sources attached to those items | 16 | 16 |
| Ingestion Run Items for review delivery | 16 | 32 |
| `review_required` audit events for delivery | 16 | 32 |
| CanadaBuys Signals | 0 | 0 |
| CanadaBuys Company–Signal links | 0 | 0 |
| Canonical Companies created by CanadaBuys | 0 | 0 |
| Public offering-projection rows | 0 | 0 |

The replay result confirms **review-candidate idempotency** and preserves per-delivery auditability. It does not imply review approval, accepted government-contract evidence, a current commercial relationship, an offering, a location, or any other inference.

## Verification results

| Gate | Result |
|---|---|
| CanadaBuys review-intake pgTAP contract | 15/15 passed |
| Foundational durable-schema pgTAP | 30/30 passed |
| Persistence-adapter pgTAP | 6/6 passed |
| Review Queue lifecycle and public-boundary pgTAP | 19/19 passed |
| Job-posting signal pgTAP regression | 6/6 passed |
| Ticket 07A Offering pgTAP regression | 21/21 passed |
| Fixture-only Ticket 08C pgTAP regression | 8/8 passed |
| Canonical application suite | 72 tests passed; 8 credential-dependent integration tests intentionally skipped by the default command |
| Typecheck, boundary enforcement, and production build | Passed |
| Anonymous access to Review Queue and review-intake RPC | Denied by the targeted database contract |
| Direct public CanadaBuys display | Not implemented; no public projection rows exist |

## Explicit non-results and next human step

No reviewer has approved, rejected, or applied a CanadaBuys candidate. The reviewer invitation remains a separate activation prerequisite. After the invited reviewer accepts access, the next action is a human review of individual candidates with **exact canonical-domain evidence** and, where needed, a separate classification decision. Only then may the pre-existing accepted government-contract path be considered for a candidate.

Until that happens, the 16 private Review Queue items must not be promoted, used to create a Company, surfaced on the website, or treated as product/service evidence.

## References

[1] [CanadaBuys award notices](https://open.canada.ca/data/en/dataset/a1acb126-9ce8-40a9-b889-5da2b1dd20cb)

[2] [Open Government Licence – Canada](https://open.canada.ca/en/open-government-licence-canada)
