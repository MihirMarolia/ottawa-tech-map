# Entity Resolution

How we decide that two signals are talking about the same Entity.

## Resolution keys

- **Company**: domain (root domain of website) is the primary key. Aliases and former names resolve to the same Entity.
- **Person**: full name + current company + role, with disambiguation by LinkedIn public URL when available.
- **Product**: company + product name.
- **Location**: address + geo point, with the company link as a tiebreaker for shared addresses (e.g. co-working spaces).

## Confidence thresholds

- **Auto-merge**: confidence ≥ 0.95 → enricher proposes a merge, approval gate auto-approves if both sides have stable IDs and no conflicting canonical names.
- **Proposed merge**: 0.7 ≤ confidence < 0.95 → enricher proposes, human approves.
- **No merge**: confidence < 0.7 → signals remain on separate Entities; a "possible duplicate" flag is set for later review.

## Never merge across entity types

A Person and a Company with the same name (e.g. "Acme") never merge. Type is a hard boundary.

## Splitting

An Entity can be split when a later signal proves it was actually two. The split is itself a proposal with an audit entry; the original Entity keeps its ID, the new Entity gets a new ID, and signals are re-routed by a re-validation pass.
