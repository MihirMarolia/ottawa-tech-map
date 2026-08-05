# Government contract and job-posting Signal contracts

The Ottawa MVP supports exactly two Signal types.

## Government contract awarded

government_contract_awarded uses schema version government-contract-signal/v1. Its accepted payload contains only contractType and observedAt. Existing Source provenance, confidence, optional external-reference identity, deterministic fingerprinting, and Company attribution rules remain unchanged.

## Job posting observed

job_posting_observed uses schema version job-posting-signal/v1.

Its structured Evidence fields are:

- job title
- location
- posting date
- explicitly named technologies
- whether security clearance is explicitly required
- whether bilingual capability is explicitly required
- employment type
- whether expansion is explicitly evidenced
- observation date
- confidence
- Source provenance

An absent external reference is valid. When it is absent, Signal identity uses the normalized job title, location, and posting date as the domain-specific discriminator. Caller-provided Source IDs do not determine canonical Source identity.

The contract never interprets the absence of wording as evidence of growth, contraction, clearance, or bilingual requirements. expansionEvidence can be true only when the sanitized Source Document explicitly supports it.

## Privacy and persistence

## AI-ready extraction boundary

The optional job-posting extractor accepts only branded Sanitized Corporate
Text. It returns a review-required proposal rather than an accepted Signal.
Every proposed field carries Source identity, observation date, model version,
extractor version, confidence, and character-offset Evidence location. It does
not return or persist source excerpts.

A model adapter may be enabled only after at least 20 sanitized evaluation
cases meet precision thresholds of 95% for security-clearance requirements,
95% for bilingual requirements, and 90% for named technologies. Every
evaluation case must produce structurally valid output. The repository's
deterministic evaluation model proves this contract without a live model call;

Raw posting text, contact information, unrestricted HTML, prompts, and arbitrary payload fields are not Signal fields. PostgreSQL validates an allowlisted structured payload, matching schema version, and observation-date parity. Unsupported Signal types remain rejected.

Automated ingestion resolves only an existing active Company by exact canonical domain. Missing or ambiguous identity remains a Review Queue outcome. This ticket does not add scraping, a generalized Signal plugin system, AI extraction, or automatic Company creation.
