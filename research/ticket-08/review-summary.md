# Ticket 08B — Source Manifest Review Summary

**Status:** Ready for **human review**. This is a research corpus only. It does not authorize a schema migration, ingestion run, public projection, UI change, or interpretation feature.

## Corpus Coverage

The attached manifest contains **10 provisional company candidates** and **28 first-party source records**. Each record uses an official company-domain URL, a permitted source type, a sanitized claim, and an explicit `supports` value. The manifest has been structurally validated for unique candidate domains, unique record identifiers, permitted source types, permitted support categories, HTTPS source URLs, retrieval dates, and non-empty sanitized claims.

| Candidate company | Primary-source records | Intended support |
|---|---:|---|
| Assent | 2 | Product observation |
| Field Effect | 3 | Product and managed-service observation |
| Kinaxis | 3 | Product observation and one historical offering-change candidate |
| Klipfolio | 2 | Product observation |
| MindBridge | 3 | Product observation |
| N-able | 3 | Product observation |
| Rewind | 3 | Product observation |
| Solink | 4 | Product observation |
| TrueContext | 2 | Product observation |
| Versaterm | 3 | Product observation |
| **Total** | **28** | **26 product observations, 1 service observation, 1 offering-change candidate** |

## Source and Privacy Boundary

All manifest records link to the relevant company’s public website or a first-party press-release path. The manifest deliberately stores only a concise, privacy-safe summary of the explicit public claim. It does not store page HTML, full page text, screenshots, credentials, personal contact data, production identifiers, or source content hashes.

> A manifest record is **evidence for human review**, not a canonical Company, Product, Service, Signal, Company Fact, or Interpretation.

The candidate cohort was discovered from non-canonical ecosystem material, which is documented separately in `discovery-notes.md`. That discovery material is not used as offering evidence. Each Company/domain mapping and the intended Ottawa relationship must be reviewed before the record can enter any future entity-resolution or proposal flow.

## Quality Findings and Required Decisions

| Finding | Consequence | Required human decision |
|---|---|---|
| Twenty-seven records have no page-level publication date. | `retrieved_at` is capture metadata, not an inferred observation date. | Confirm a collection-date policy for future observations or locate dated first-party announcements where chronology matters. |
| Kinaxis has one dated 2024 announcement describing Maestro as an evolution of RapidResponse. | It is a historical offering-change **candidate**, not a current-state or discontinuation assertion. | Confirm whether it is appropriate for a future `offering_changed` proposal and whether the change is material enough to model. |
| Field Effect presents MDR with both platform and managed-delivery language. | The source supports a Product candidate and a Service candidate, but not an automatic canonical split. | Approve the intended classification after review. |
| TrueContext’s historical ProntoForms route redirected to the current TrueContext site. | A Company/domain transition may affect canonical identity and offering continuity. | Resolve identity before creating any proposal or fixture. |
| Several pages enumerate multiple named products. | One source may support more than one later Product proposal, but cannot bypass individual validation and idempotency checks. | Select the exact named offering candidates to include in the initial persistence tracer bullet. |
| No record supports discontinuation, hiring, or contract activity. | The manifest cannot power those future signal classes. | Keep those classes out of Ticket 08C/08D unless separate reviewed records are added. |

## Review Checklist

The reviewer should approve or reject each Company/domain mapping, then each source record’s explicit claim, source type, candidate kind, and intended `supports` value. Any record that fails identity, privacy, or claim-specific review should be removed rather than repaired with a guess.

Once approved, this manifest may supply controlled, sanitized fixture inputs for Ticket 08C. It must remain a GitHub-reviewed research artifact; **Supabase remains the sole durable source of truth** for any approved operational data.

## Next Gate

Ticket 08B is complete only after human review records decisions against the manifest. **Ticket 08C remains blocked** until the approved record subset, precise offering classifications, and initial change-signal policy are provided. No implementation agent should receive a schema or persistence prompt before that gate is approved.
