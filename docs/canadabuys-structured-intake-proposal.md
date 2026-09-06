# CanadaBuys Structured Intake Proposal

**Status:** implemented and dry-run verified on 2026-08-25. A bounded, review-only pilot persisted candidates to the private Review Queue. No CanadaBuys candidate has been human-reviewed, approved, applied, made public, or used to create a canonical Company, Signal, Company–Signal link, or Offering.

## Decision

Proofward can use CanadaBuys award notices as an **official government-record signal source**. The feed must extend the existing `government_contract_awarded` proof path rather than create a parallel Company, Source, Signal, or audit model.

The public CanadaBuys award-notices dataset is the authoritative system of record for the federal notices it covers and is licensed under the Open Government Licence – Canada. Its 2022-onward resource is refreshed daily and records can be active, cancelled, or expired. [1] [2] This does not mean that every record establishes a current business relationship, a Company identity, a product capability, or a public offering.

## Non-negotiable boundaries

| Boundary | Required behavior |
|---|---|
| Company identity | Never create a Company from a CanadaBuys supplier name. Existing architecture resolves only by exact canonical domain; CanadaBuys does not reliably provide that proof. Every missing or conflicting identity goes to a persisted Review Queue item. |
| Claim scope | An award notice supports only the fact that a particular official award notice was published with its own status and date. It does not prove current revenue, performance, product availability, location, or a broader customer relationship. |
| Contract classification | Do not automatically equate CanadaBuys `services` procurement categories with the existing `professional_services` contract type. A reviewer must classify the subset eligible for the current v1 contract before persistence. |
| Amendments and status | Keep award status and amendment context in intake review. The existing v1 signal fingerprint is based on a stable external reference and does not represent amendment history or cancellation as a separate lifecycle. Therefore the initial feed must not automatically persist amended, cancelled, or expired notices. |
| Public data | No raw CSV, supplier contact information, review notes, ingestion metadata, internal identifiers, or service-role access enters the web client. The existing public offering projection remains unchanged. |
| Attribution | Preserve publisher, dataset URL, licence, official-record URL where available, official identifier, publication date, retrieval timestamp, and the required Open Government Licence attribution. |

## Initial bounded intake contract

The intake adapter would read only a small, versioned subset of the CanadaBuys award-notices resource. It would normalize the following review-only fields after checking the official data dictionary:

| Field family | Review-only use | Durable v1 mapping when approved |
|---|---|---|
| Official award identifier | Stable external reference and idempotency anchor | `externalReference` and signal discriminator, after field-format validation |
| Publication date | Date the official award notice was published | `observedAt` |
| Award status and amendment context | Eligibility gate; supports hold/review decisions | Not persisted in current v1 unless the contract is extended explicitly |
| Supplier name | Candidate entity evidence only | Never sufficient for Company resolution |
| Award description and category | Reviewer classification support | Never copied to the current allowlisted signal payload |
| Official record and dataset URL | Provenance and reproducibility | Source URL / normalized URL |
| Licence and attribution | Reuse compliance | Source metadata and published attribution policy |

The current official CSV headers confirm that the adapter can read `referenceNumber-numeroReference`, `contractNumber-numeroContrat`, `amendmentNumber-numeroModification`, `publicationDate-datePublication`, `awardStatus-attributionStatut-eng`, `procurementCategory-categorieApprovisionnement`, and `supplierLegalName-nomLegalFournisseur-eng`. The current resource contains notices with no contract number, zero-padded original amendment values such as `000`, and multi-line categories such as `*SRV` plus `*GD`; the normalizer therefore uses the stable notice-plus-amendment reference and accepts a record for review when it includes `SRV`, not only when it equals an invented single-category value. The resource also includes supplier and contact address, email, phone, fax, and free-text award-description fields. Those contact, address, and free-text fields are **out of scope** for the initial adapter and must not be copied into a review proposal, raw source store, Signal payload, audit metadata, or public projection.

The canonical intake item identity is derived from the **official award identifier plus a content hash of the selected, normalized official fields**. This is intentionally separate from the existing accepted-signal fingerprint: the item identity tracks source delivery; the accepted signal identity tracks the approved v1 external reference. Replays with unchanged source content must converge to one review item or one accepted signal, not duplicate either.

## Proposed lifecycle

```text
CanadaBuys official award notice
        ↓
Validation + licence attribution + official date check
        ↓
Review candidate (not a Company and not a public signal)
        ↓
Exact canonical-domain evidence supplied by reviewer?
   ├── no / conflicting → persisted Review Queue item
   └── yes
        ↓
Professional-services classification approved by reviewer?
   ├── no / unresolved → held or rejected Review Queue item
   └── yes
        ↓
Existing government-contract persistence RPC (service role)
        ↓
Append-only audit + durable source/signal/link
        ↓
Separate future public-projection decision; no automatic website exposure
```

## Implemented additive work

The existing durable government-contract adapter accepts an already-resolved `company_id`; its TypeScript review outcome is in-memory and did not provide persisted unresolved government-contract review handling. The implemented feed therefore adds a narrow, additive database function and tests to persist unresolved government-contract review items idempotently. It uses the existing Review Queue, append-only audit, reviewer guards, and service-role-only ingestion boundary.

The implementation adds two service-role-only, `SECURITY DEFINER` functions with an empty fixed `search_path`: one durable persistence entry point and one application-facing adapter. They create only a Source, Ingestion Run/Item, Review Queue item, and Audit Event. Both leave the proposed canonical domain null and cannot create a Company, Signal, Company–Signal link, Offering, approval, apply action, or public record.

The current government-contract v1 payload accepts only `contractType` and `observedAt`. If product requirements include award status, value, department, amendments, cancellations, procurement category, or award description in durable intelligence, that is a separately versioned signal-contract decision—not a feed configuration switch.

## Verified dry-run outcome

The approved run-on-demand pilot fetched only the initial 4 MB range of the official current CSV and parsed a capped sample of **20** records. The normalizer allowlisted only official record identifiers, status, procurement category, supplier-name presence, and publication date. It deliberately discarded address, telephone, email, fax, contact fields, and free-text award description before a review candidate could be formed.

| Measure | Verified result |
|---|---:|
| Official records inspected | 20 |
| Private Review Queue candidates persisted | 16 |
| Records held before persistence for unsupported procurement category | 4 |
| Canonical Companies created | 0 |
| Signals or Company–Signal links created | 0 |
| Offerings, approvals, or apply actions created | 0 |
| Public offering-projection records created | 0 |

One controlled replay of the exact sanitized manifest produced the same **16** canonical Review Queue records while creating 16 additional delivery-attempt Ingestion Run Items and 16 additional audit events, for 32 of each. This is the intended delivery-history behavior: review candidates deduplicate, while every ingestion attempt remains auditable.

The Category `SRV` prefilter is only a narrow routing condition for this pilot. It is **not** an automatic determination that a notice satisfies the existing `professional_services` signal contract. A reviewer must still provide canonical-domain identity evidence and make any separate classification decision before the existing accepted government-contract path can be used.

## Operating choices

| Option | Behavior | Tradeoffs | Cost | Setup complexity |
|---|---|---:|---:|---:|
| Run-on-demand bounded batches | An authorized operator requests a limited, deterministic batch and reviews the result before another run. | Strongest control, no unattended updates, slower freshness. | Minimal | Low |
| Daily scheduled intake | A backend job checks the official dataset once a day, creates review candidates, and records technical failures; no automatic publication. | More timely, but needs source-version tracking, batch caps, monitoring, and reviewer capacity. | Low at pilot scale | Medium |

The implementation should start run-on-demand. After a successful 20–50 record dry run and reviewer acceptance, daily intake can be enabled only with a bounded page/window, persisted cursor/checkpoint, retries, alerting, and a kill switch. The source updates daily, so sub-hour polling and an always-on worker are unnecessary for this signal family. [1]

## Verification gates

1. Validate source schema and licence attribution against the current official data dictionary.
2. Test exact replay convergence, duplicate delivery, and concurrent intake handling.
3. Prove no Company is created from supplier names and every uncertain match persists to Review Queue.
4. Prove anonymous users cannot invoke ingestion, read review state, audit records, raw source fields, or privileged functions.
5. Verify allowed Company evidence continues through the existing service-role government-contract RPC with its existing fingerprint semantics.
6. Confirm the Proofward public site remains limited to approved public projections, with no automatic contract-data exposure.

## Explicit approval required before implementation

Approve all of the following: the **20–50 record dry-run cap**, the **run-on-demand operating mode**, the **review-only handling of unresolved supplier identity and non-professional-service classification**, the **additive persisted Review Queue function**, and the decision to **defer public CanadaBuys evidence display** until a dedicated public projection is specified.

## References

[1] [CanadaBuys award notices](https://open.canada.ca/data/en/dataset/a1acb126-9ce8-40a9-b889-5da2b1dd20cb)

[2] [Open Government Licence – Canada](https://open.canada.ca/en/open-government-licence-canada)

[3] [Existing Government Contract and Job Posting Signal Specification](./features/government-contract-and-job-posting-signals.md)
