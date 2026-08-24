# Ticket 08B — Provisional Approval Matrix

**Purpose:** This matrix makes the 08B human-review gate explicit. It is an evidence-quality recommendation prepared from the reviewed manifest and source-host audit; it is **not** an approval to ingest data or start Ticket 08C.

> **Decision vocabulary.** **Recommend approve** means the first-party URL and explicit claim appear fit for the stated evidence purpose, subject to a human confirming the Company/domain mapping. **Hold** means the source may be useful, but a human must resolve a naming, identity, classification, chronology, or cohort issue. **Reject/merge** means do not create a separate canonical offering from that candidate as written; retain the source only as corroborating capability evidence if approved.

## Company Gate

| Company | Domain | First-party identity evidence | Ottawa jurisdiction | Technology-cohort recommendation | Gate decision | Notes |
|---|---|---|---|---|---|---|
| Kinaxis | `kinaxis.com` | Yes | Explicit Ottawa headquarters | Yes | **Recommend approve** | Use `contact-us` as the separate geography record when formally approving. |
| MindBridge | `mindbridge.ai` | Yes | Explicit Ottawa headquarters | Yes | **Recommend approve** | The manifest needs a separate geography record before fixture use. |
| Solink | `solink.com` | Yes | Explicit Ottawa address | Yes | **Recommend approve** | The manifest needs a separate geography record before fixture use. |
| Assent | `assent.com` | Yes | Explicit Ottawa office | Yes | **Recommend approve** | The manifest needs a separate geography record before fixture use. |
| Field Effect | `fieldeffect.com` | Yes | Explicit Ottawa head office | Yes | **Recommend approve** | The manifest needs a separate geography record before fixture use. |
| Rewind | `rewind.com` | Yes | Founded in Ottawa | Yes | **Recommend approve** | A reviewer should decide whether “founded in” satisfies the cohort policy or add a current location source. |
| Klipfolio | `klipfolio.com` | Yes | Not established in an extractable first-party source reviewed | Yes | **Hold** | Add first-party Ottawa jurisdiction evidence before approval. |
| TrueContext | `truecontext.com` | Yes | Explicit Ottawa headquarters | Yes | **Recommend approve** | Resolve the historical ProntoForms-to-TrueContext identity transition before canonical Company matching. |
| N-able | `n-able.com` | Yes | Not established in an extractable first-party source reviewed | Yes | **Hold** | Add first-party Ottawa jurisdiction evidence before approval. |
| Versaterm | `versaterm.com` | Yes | Explicit Ottawa location | Yes | **Recommend approve** | The manifest needs a separate geography record before fixture use. |

The company gate therefore supports a **maximum eight-company approved subset** pending human confirmation. **Klipfolio and N-able must remain out of an Ottawa-controlled fixture subset** until first-party jurisdiction evidence is added. No current manifest record is accepted as a durable Company fact; the result only controls whether the candidate may progress to later entity resolution.

## Source Gate

All 28 manifest URLs use the candidate company’s canonical host (including accepted `www` variants). Twenty-five returned HTTP 200 in the current audit; the three N-able URLs returned HTTP 403 to an automated request while retaining the correct official host. The earlier text extraction captured their public product content, so the 403 result is an access-control limitation of automated fetches rather than proof that the source is invalid. A human browser check should confirm those three pages before approval.

| ID | Company | Source / candidate | Source status | Claim and `supports` review | Classification recommendation | Preliminary decision | Required human action |
|---|---|---|---|---|---|---|---|
| t08b-001 | Kinaxis | Maestro platform | First-party, reachable | Explicit named platform supports `product_observed`. | Product | **Recommend approve** | Confirm Company gate. |
| t08b-002 | Kinaxis | Maestro evolution of RapidResponse | First-party, reachable | The announcement explicitly describes an evolution, but a change signal requires the future change contract. | Product change candidate | **Hold** | Verify publication date and approve the precise change semantics; do not infer a lifecycle transition. |
| t08b-003 | Kinaxis | Maestro supply-planning capability | First-party, reachable | Explicit capability corroborates Maestro; it does not identify another named Product. | Evidence for Maestro | **Reject/merge** | Retain as corroborating evidence for Maestro, not as a separate offering. |
| t08b-004 | MindBridge | MindBridge AI | First-party, reachable | The company page explicitly presents MindBridge AI/oversight capabilities. | Product | **Recommend approve** | Confirm canonical public product name. |
| t08b-005 | MindBridge | Audit intelligence | First-party, reachable | The page supports an audit-and-assurance capability, but not a distinct named offering. | Capability evidence | **Reject/merge** | Retain only as evidence for the approved MindBridge product. |
| t08b-006 | MindBridge | MindBridge AI Platform | First-party, reachable | The platform is explicitly described, but its name may duplicate t08b-004. | Product / same-platform corroboration | **Hold** | Choose one canonical offering name; do not create two synonymous offerings. |
| t08b-007 | Solink | Video Intelligence Platform | First-party, reachable | The homepage uses platform language but does not resolve whether this is the canonical name or umbrella description. | Product family candidate | **Hold** | Choose an approved canonical platform name. |
| t08b-008 | Solink | Solink AI | First-party, reachable | Explicit named product page supports `product_observed`. | Product | **Recommend approve** | Confirm Company gate. |
| t08b-009 | Solink | Solink Cloud VMS | First-party, reachable | Explicit named product page supports `product_observed`. | Product | **Recommend approve** | Confirm Company gate. |
| t08b-010 | Solink | Solink Video Alarms | First-party, reachable | Explicit named product page supports `product_observed`. | Product | **Recommend approve** | Confirm whether it is standalone or a platform module; either choice must be stable. |
| t08b-011 | Assent | Assent Network | First-party, reachable | The company page explicitly presents a named solution. | Product | **Recommend approve** | Confirm Company gate and canonical name. |
| t08b-012 | Assent | Assent Native-AI | First-party, reachable | The page names Native-AI, but it may be a platform feature rather than separately purchasable offering. | Feature / possible product | **Hold** | Approve as Product only if public presentation and product policy treat it as distinct. |
| t08b-013 | Field Effect | Managed detection and response | First-party, reachable | The company page explicitly presents MDR with managed-delivery language. | Service | **Recommend approve** | Confirm Company gate and service name. |
| t08b-014 | Field Effect | Field Effect MDR | First-party, reachable | The products page supports a named MDR platform, but the same offering also has managed-delivery evidence. | Product / Service boundary | **Hold** | Decide whether the product platform and managed service are separate canonical offerings. |
| t08b-015 | Field Effect | Field Effect MDR detail | First-party, reachable | Explicit, corroborating MDR detail; it does not by itself resolve Product-versus-Service identity. | Corroborating evidence | **Hold** | Use after resolving t08b-013/t08b-014 classification. |
| t08b-016 | Rewind | SaaS backup and recovery | First-party, reachable | The homepage supports a product family, not a stable distinct product name. | Product family evidence | **Reject/merge** | Retain as corroboration for named Rewind offerings. |
| t08b-017 | Rewind | Rewind Backups for Shopify | First-party, reachable | Explicit named product page supports `product_observed`. | Product | **Recommend approve** | Confirm Company gate. |
| t08b-018 | Rewind | Rewind Protection Suite | First-party, reachable | Explicit named suite supports `product_observed`. | Product | **Recommend approve** | Confirm Company gate. |
| t08b-019 | Klipfolio | Klips homepage | First-party, reachable | Explicit named product supports `product_observed`. | Product | **Hold** | Requires Company Ottawa-jurisdiction approval. |
| t08b-020 | Klipfolio | Klips detail | First-party, reachable | Explicit named product corroborates t08b-019. | Corroborating evidence | **Hold** | Requires Company Ottawa-jurisdiction approval; do not create a duplicate offering. |
| t08b-021 | TrueContext | Field intelligence platform | First-party, reachable | Explicit platform description, but likely overlaps with t08b-022. | Product family / description | **Hold** | Resolve public canonical offering name and historical Company transition. |
| t08b-022 | TrueContext | Field Service Intelligence Platform | First-party, reachable | Explicit named platform page supports `product_observed`, subject to t08b-021 naming resolution. | Product | **Hold** | Resolve one canonical platform offering with t08b-021 before approval. |
| t08b-023 | N-able | Multi-product catalog | First-party host; automated access blocked | Catalog names multiple products but should not create all without individual review. | Multiple products | **Hold** | Confirm page in a human browser and only approve listed candidates with Company Ottawa evidence. |
| t08b-024 | N-able | Cove Data Protection | First-party host; automated access blocked | Earlier extracted text supports the named backup-and-recovery product. | Product | **Hold** | Human-browser confirmation plus Company Ottawa evidence. |
| t08b-025 | N-able | N-central Endpoint Management | First-party host; automated access blocked | Earlier extracted text supports the named endpoint-management product. | Product | **Hold** | Human-browser confirmation plus Company Ottawa evidence. |
| t08b-026 | Versaterm | Solution catalog | First-party, reachable | The catalog explicitly lists named solutions but should not create all as canonical offerings automatically. | Multiple products | **Hold** | Select the first approved subset rather than expanding scope. |
| t08b-027 | Versaterm | Versaterm RMS | First-party, reachable | Explicit named product page supports `product_observed`. | Product | **Recommend approve** | Confirm Company gate. |
| t08b-028 | Versaterm | Versaterm CAD | First-party, reachable | Explicit named product page supports `product_observed`. | Product | **Recommend approve** | Confirm Company gate. |

## Explicit Non-Approvals

The matrix does not recommend any `offering_discontinued`, `hiring_signal`, or `contract_signal` record. It also does not authorize any Interpretation. An evidence-backed Product or Service remains an **observed fact**; a commercial, strategic, or revenue conclusion must remain a separately modeled Interpretation in a later approved contract.

## Human Decision Form

A reviewer should record one disposition per Company and source record: `approved`, `approved_as_corroboration_only`, `rejected`, or `needs_more_evidence`. The approved subset must identify the one canonical Company/domain mapping and one canonical Product or Service name for each accepted offering. Any deferred source remains in Git history only and must not enter Supabase.

**08C unlock condition:** every Company used by the initial tracer bullet is approved; each accepted source is approved or corroboration-only; every accepted offering has exactly one confirmed `kind`; there is no unresolved duplicate/rename ambiguity; and the user explicitly authorizes 08C contract implementation.
