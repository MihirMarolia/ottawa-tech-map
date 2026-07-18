# ADR-0002: Proposal → audit → approval → apply pipeline

Date: 2026-07-18
Status: Accepted

## Context

The agent must be a first-class system component that proposes changes but never directly mutates production data (engineering constitution, principle 5). We considered:

- Letting the enricher write directly to Entity tables, with an audit log written after the fact.
- A single "agent action" stage that both proposes and applies.
- A strict separation: enrichers propose, a separate apply stage applies after approval.

## Decision

Adopt the strict separation:

```
collectors → validators → enrichers → agent actions → approval → apply
```

Enrichers write proposals. Agent actions log proposals to the audit trail. Approval gates (human or automated) decide. Apply is the only stage that mutates production data, and only after approval.

## Rationale

- An audit log written after a direct write can be lost if the write succeeds and the audit fails. Writing the audit entry first (as a proposal) means an un-audited change is impossible.
- The separation makes the pipeline replayable: re-running validators and enrichers against historical signals produces the same proposals.
- Human approval is non-negotiable for identity fields and low-confidence proposals (see `docs/domain/scoring.md`).

## Consequences

- Every Entity field write carries the ID of the proposal and audit entry that produced it.
- The apply step is the only place transactions touch Entity tables; enrichers and validators write to their own tables.
- Rejected proposals are kept (not deleted) so we can audit why a change was not made.

## Revisit trigger

A class of changes where the proposal overhead is provably wasted (e.g. a fully-trusted internal source) — revisit with a new ADR to carve out a fast path.
