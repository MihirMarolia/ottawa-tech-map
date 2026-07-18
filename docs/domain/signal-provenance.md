# Signal Provenance

Every field on every Entity traces back to the signal that produced it. Provenance is non-optional.

## What we record per signal

- **Source** — the external system the signal came from (news outlet, RSS feed, GitHub, LinkedIn public page, government filing, etc.).
- **Source URL / identifier** — the canonical link back to the original.
- **Fetched-at** — when our collector retrieved it.
- **Published-at** — when the source published it (when available).
- **Raw payload** — the unmodified bytes/text we received, stored for replay.
- **Collector version** — the code version that fetched and normalized it.
- **Confidence** — validator-assigned score.

## What we record per proposal

- **Source signal IDs** — the signals the enricher read to produce this proposal.
- **Enricher version** — the code version that produced the proposal.
- **Field path** — which Entity field this proposal targets.
- **Proposed value** — the new value.
- **Previous value** — what was there before (for updates).
- **Confidence** — proposal-level score, may differ from signal-level.

## What we record per apply

- **Approval path** — human (who) or automated (which rule).
- **Applied-at** — timestamp.
- **Applied-by** — the apply step's code version.

## Invariant

A rendered pin or search hit can be clicked through to: the field → the proposal → the signals → the source URL. This chain must never break. If a signal must be redacted (see `privacy-boundary.md`), the affected proposals are re-evaluated, not silently dropped.
