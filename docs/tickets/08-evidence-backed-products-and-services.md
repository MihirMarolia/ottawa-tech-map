# Ticket 08 — Evidence-Backed Products & Services

**Status:** Contract proposed; **implementation is not authorized by this document**.

**Objective:** Enable an evidence-led answer to: **“What does this company offer, and what source-backed changes have been observed?”** The system must keep three layers distinct:

```text
Company
├── Offering observations — what a public source explicitly states
├── Signals — what changed between supported observations
└── Interpretations — what a supported combination of signals may mean
```

An observation is not an inference. An inference is not a Company Fact. Ticket 08 must not turn the absence of a webpage mention into evidence of discontinuation.

## 1. Scope and Non-Goals

Ticket 08 develops the **contract** for offering observations, evidence-backed change signals, lifecycle semantics, and later public reads. It reuses the Ticket 07A normalized `offerings`, `offering_proposals`, and `offering_signal_links` path; it must not create a parallel offerings, sources, signals, evidence, proposal, audit, or public-read system.

| In scope after contract approval | Explicitly out of scope |
|---|---|
| Evidence-backed product and service observations from public primary sources | A generalized proposal framework |
| Product/service classification and uncertain-classification routing | Changing government-contract identity, fingerprints, or persistence |
| Defined semantics for observed, active, not-recently-observed, and confirmed discontinuation | Treating a missing page as a discontinuation |
| Public projection requirements for approved facts and provenance | Persisting raw source text, private/login-gated material, or speculative claims |
| Signal-cluster and interpretation boundaries | Implementing hiring, contracts, news, or technology intelligence |
| Controlled research-corpus manifest and fixture strategy | UI redesign or schema migration before approval |

## 2. Existing Foundations That Must Be Reused

Ticket 07A already establishes the canonical Offering persistence path:

```text
sanitized source → validated offering signal → company resolution
→ offering proposal + audit → reviewer decision → apply
→ canonical offering + offering/signal evidence link → public projection
```

The current canonical Offering identity is **company + kind + normalized name**. `kind` remains part of identity, so a product and a service with the same human-readable name may coexist. The canonical name remains human-readable; normalization is only an identity mechanism.

The following invariants are non-negotiable:

| Invariant | Ticket 08 requirement |
|---|---|
| Proposal-first writes | Enrichers create proposals and audit events; only approved apply operations mutate canonical Offerings. |
| Provenance | Every displayed offering attribute and change must trace to a Signal and Source URL. |
| Privacy | Only privacy-sanitized material can cross ingestion; raw source text never persists. |
| Public-read boundary | Client-facing code reads approved projections or controlled functions only. |
| Privileged writes | Controlled ingestion/setup/apply uses the ingestion client; public reads use the anonymous client. |
| Idempotency | Replay and concurrent application converge without duplicate canonical offerings, signals, or evidence links. |
| Entity resolution | Unknown company references route to the durable Review Queue; they must not create a placeholder canonical Company or Offering. |

## 3. Domain Contract

### 3.1 Offering Observation

> **Offering Observation:** A privacy-sanitized, source-backed statement that a public source explicitly associates a named offering with a resolved Company at an observation date.

An Offering Observation answers only **what was found**. It includes source metadata, observed date, extraction/validation version, a candidate name, optional description, candidate classification, and evidence type. It does not assert that the offering is current, changed, discontinued, strategically important, or an inference.

A classification can be `product`, `service`, or `unknown` **at observation time**. `unknown` means the source identifies an offering but does not support product/service classification. It is not a canonical Offering kind. Such records must go to review or remain non-canonical until classification is supported; they must not manufacture a Product or Service.

### 3.2 Product and Service

A **Product** and **Service** remain the only canonical Offering kinds. They require primary-source evidence and the existing proposal → audit → approval → apply lifecycle.

### 3.3 Change Signal

A **Change Signal** is a source-backed, versioned statement about a supported difference, not a broad conclusion. Existing signal types remain valid:

| Signal | Meaning | It does not mean |
|---|---|---|
| `product_added` / `service_added` | A qualifying source newly supports offering creation through the approved path. | The Company has entered a market or grown. |
| `product_changed` / `service_changed` | A source supports a material description or capability change. | The offering was discontinued, replaced, or is commercially successful. |

A future discontinuation signal requires separate approved signal semantics, explicit affirmative evidence, reviewer approval, and audit coverage. It is not implied by a changed signal or by a missing source mention.

### 3.4 Interpretation

> **Interpretation:** A confidence-scored, versioned, evidence-linked analytical statement that explains what a collection of observations and signals may mean.

Example: “The Company appears to be expanding AI implementation services.” This is an interpretation only when the underlying source-backed signals and methodology are retained. It must never overwrite a Product, Service, Company Fact, or canonical lifecycle state. Ticket 08 defines this boundary but does **not** add persistence or UI for interpretations.

## 4. Lifecycle Semantics

The requested vocabulary separates an evidentiary state from a canonical lifecycle state. `observed` must not be stored as a peer status to `active`, because it describes an Observation rather than the state of an approved Offering.

| Term | Layer | Contractual meaning | Required evidence / decision |
|---|---|---|---|
| `observed` | Observation | A public source explicitly stated an offering claim on a date. | One validated, privacy-safe source record. |
| `active` | Canonical Offering | The approved canonical offering has positive supporting evidence. | Approved proposal and applied source-backed signal. |
| `unknown` | Canonical Offering or observation classification | Current offering state or product/service classification is not sufficiently supported. | Explicit uncertainty; no inference. |
| `not_recently_observed` | Derived review indicator | Positive evidence has not been refreshed within an approved source-class policy. | Deterministic policy, recorded window, and no discontinuation assertion. |
| `discontinued_confirmed` | Future canonical lifecycle state | Explicit affirmative evidence confirms discontinuation, withdrawal, or retirement. | Approved discontinuation proposal supported by affirmative primary-source evidence or an approved authoritative record. |

**Contract decision:** Ticket 08A does not change the existing canonical `offering_status` enum (`active | unknown`). It defines `not_recently_observed` as a future derived review indicator and reserves `discontinued_confirmed` for a later approved additive lifecycle migration. The persistence proposal must show why an enum extension is needed before any schema change. This preserves Ticket 07A’s tested status contract while preventing absence-based conclusions.

## 5. Evidence and Provenance Contract

Every offering observation, signal, proposal, canonical offering, and public rendering must retain a traceable chain:

```text
public Source metadata → sanitized Observation → Signal → Proposal → Audit event
→ approved Apply → Offering ↔ Signal evidence link → public projection
```

The public contract may show source name, source URL, observed date, evidence type, signal type, confidence, offering name, approved description, and allowed current-status fields. It must exclude internal UUIDs, proposal/review state, audit metadata, correlation IDs, fingerprints, ingestion run metadata, raw payloads, and raw source text.

Acceptable evidence types remain the established primary-source vocabulary:

- `official_product_page`
- `official_service_page`
- `official_company_page`
- `official_documentation`
- `official_press_release`
- `government_record`
- `other_primary_source`

Login-gated sources, personal contact information, raw scraped content, and unsupported secondary claims are out of scope.

## 6. Ingestion and Deduplication Contract

Ticket 08 must preserve the current separated clients and controlled RPC model. No browser or prototype may query a base table or invoke a privileged write RPC.

| Concern | Contract |
|---|---|
| Company resolution | Resolve through the existing resolver. If no canonical Company is found, create one durable `company_not_found` Review Queue item using the existing deduplication behavior; do not create a Company, Offering, or canonical signal. |
| Observation identity | Proposed immutable observation fingerprint: resolved company ID, normalized URL, content hash, observed date, candidate kind (including `unknown`), normalized offering name, normalized description, observation schema version, and observation type. |
| Canonical Offering identity | Preserve `company + product/service kind + normalized name`. Description is not identity. |
| Signal identity | Preserve the existing versioned offering signal fingerprint contract. Do not change government-contract fingerprinting. |
| Proposal identity | Preserve offering-specific proposal fingerprints and their current source/signal linkage. |
| Reapply behavior | A repeated approved proposal returns the same canonical Offering and does not duplicate the active Offering–Signal evidence link. |
| Change vs. discontinuation | `product_changed` and `service_changed` update supported content only; they cannot set discontinued state or invalidate evidence by themselves. |

## 7. Proposed Persistence Direction — Not Yet Approved for Implementation

No migration is authorized in Ticket 08A. If the contract is approved, the smallest schema design to review is:

| Conceptual addition | Purpose | Constraints |
|---|---|---|
| Immutable Offering Observation record | Preserve “what the source said” separately from canonical state. | Reuse existing Sources and Signals; no raw text; no direct public read. |
| Observation-to-Signal association | Preserve derivation from observed claim to change signal. | Reuse existing Signal provenance; avoid parallel evidence tables. |
| Derived freshness/review query | Surface `not_recently_observed` without asserting discontinuation. | Deterministic policy and no canonical status mutation. |
| Confirmed discontinuation proposal type | Permit a later explicit lifecycle transition only with affirmative evidence. | Additive, reviewer-gated, append-only audit, idempotent apply, and separate from change signals. |
| Privacy-safe public projection extension | Render only approved offering facts, current evidence, and allowed recent changes. | No internal IDs or proposal/audit/review data; tests before client use. |

A schema proposal must include a migration-order review, RLS/grants, concurrency behavior, fingerprint inputs, public projection columns, and pgTAP coverage before any durable-state edit.

## 8. Public Read and UI Contract

`CompanyProfile.products[]` and `CompanyProfile.services[]` remain the approved public entry point for canonical Offerings. A later UI phase may render:

```text
Company
What they do
  Products
  Services
Recent source-backed changes
Evidence
  Source → observation date → evidence type
```

The UI must use honest empty states. It may not display an interpretation as a fact, show an inferred discontinuation, fabricate an offering, or expose proposal/review/audit state. “Recent changes” must show the actual signal type and its source, not a strategic conclusion.

## 9. Acceptance Criteria and Required Tests

An implementation agent must map every acceptance criterion to a test or an explicit runtime verification.

| # | Acceptance criterion | Required proof |
|---:|---|---|
| 1 | Public data uses only approved projections/controlled reads. | Anonymous privilege tests deny internal tables and read approved projections. |
| 2 | Offering observation is distinct from a canonical Offering and from an Interpretation. | Domain/unit tests and public-contract tests. |
| 3 | Unknown product/service classification does not create a canonical Product or Service. | Unknown-classification/review-routing tests. |
| 4 | Unknown Company input creates a persisted, deduplicated Review Queue item only. | Integration and database idempotency tests. |
| 5 | Offering identity is case-insensitive and kind-aware; canonical name remains readable. | Unit and pgTAP uniqueness tests. |
| 6 | Replays and concurrent applies converge to one Offering and one active provenance link. | Database-level idempotency and concurrency tests. |
| 7 | A changed Product/Service does not imply discontinuation. | Signal/lifecycle contract tests. |
| 8 | `not_recently_observed` does not mutate canonical lifecycle state or claim discontinuation. | Derived-indicator policy tests. |
| 9 | Discontinuation can occur only after affirmative evidence and approved apply. | Lifecycle transition, reviewer authorization, and audit tests. |
| 10 | Every rendered offering/change traces to source URL and observed date without internal identifiers. | Public projection contract and UI renderer tests. |
| 11 | Raw source text, PII, private/login-gated material, and unproven facts never persist. | Privacy Gateway, fixture, and boundary tests. |
| 12 | Existing government-contract behavior and fingerprints remain unchanged. | Existing durable integration, pgTAP, and regression tests. |

## 10. Controlled Research Corpus — Phase 08B

The requested **10 Ottawa companies / 28 primary-source records** are not present in the repository. No companies, offerings, signals, locations, or scores will be invented to fill this gap.

Before research-backed tests or persistence begin, add a reviewed source manifest outside raw-source persistence with at least:

| Field | Requirement |
|---|---|
| `recordId` | Stable fixture identifier, not a production UUID. |
| `companyReference` | Existing resolved Company reference or an explicit expected Review Queue outcome. |
| `sourceUrl` | Public, retrievable primary-source URL. |
| `sourceType` | One allowed evidence type. |
| `observedAt` | Observation date or explicit capture date. |
| `sanitizedClaim` | Privacy-safe structured offering statement; never raw scraped text. |
| `expectedClassification` | `product`, `service`, or `unknown`. |
| `expectedOutcome` | Proposal, review-required, rejected, or no-change. |
| `provenanceNotes` | Why the source supports the expected outcome. |

The manifest requires source review before import. It must not become a second durable source of truth; Supabase remains the only durable production data store, while GitHub stores reviewed test fixtures and contracts.

## 11. Required Implementation Handoff

Use one canonical implementation agent at a time. Before any edit, the agent must read `AGENTS.md`, the ubiquitous language, ADR-0002, ADR-0003, this specification, the Ticket 07A migration and tests, and the relevant public contracts. It must then provide, in no more than eight lines, the acceptance criteria, deep-module interfaces to be changed, and proof plan.

The agent must stop and report rather than invent a workaround if the approved contract conflicts with Ticket 07A, the public-read boundary, append-only audit behavior, RLS, or government-contract semantics.

## 12. Approval Gates

| Gate | Required approval before proceeding |
|---|---|
| 08A contract | Approve this observation/signal/interpretation contract and lifecycle decisions. |
| 08B research corpus | Provide or approve the 10-company/28-record manifest. |
| 08C persistence | Review the exact additive migration, RLS/grants, RPC transitions, fingerprints, and test plan before durable-state changes. |
| 08D UI | Review the public projection and evidence-first profile design after persistence verification is green. |

**No schema, persistence, ingestion, public-API, or UI implementation work is authorized until Gate 08A is explicitly approved.**
