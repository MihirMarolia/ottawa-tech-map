# Scoring

How confidence is assigned and how it flows through the pipeline.

## Signal confidence

Assigned by the validator. Factors:

- **Source reputation** — established news outlet vs. anonymous forum post.
- **Source corroboration** — multiple independent sources reporting the same fact raise confidence.
- **Recency** — newer signals carry more weight for time-sensitive fields (headcount, stage) and less for stable fields (founding year).
- **Specificity** — a signal that names a specific number (headcount = 240) beats one that gives a band (headcount = 200-500).

Range: 0.0 to 1.0.

## Proposal confidence

Computed by the enricher from the underlying signals:

- Weighted max of source signal confidences, with a bonus for corroboration.
- Penalized for conflict — if two high-confidence signals disagree, the proposal confidence drops below either.

## Approval thresholds

- **Auto-approve**: proposal confidence ≥ 0.9 and field is non-identity (not canonical name, not domain).
- **Human-approve**: 0.6 ≤ confidence < 0.9, or any identity field.
- **Reject**: confidence < 0.6.

## What confidence is not

- Not a "quality score" for the Entity. It is per-proposal.
- Not a substitute for provenance. A high-confidence proposal still links to its signals.
- Not user-visible as a single number. The UI surfaces "verified" / "unverified" / "disputed" states derived from the underlying proposal confidences.
