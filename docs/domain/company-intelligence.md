# Company Intelligence

What we capture about a Company entity, and what we deliberately do not.

## Stored fields

- **Identity**: stable internal ID, canonical name, aliases (former names, common misspellings), website, domain.
- **Classification**: sector, industry, stage (private / seed / Series A … / public), headcount band, founding year.
- **Location**: HQ address + geo point; optional office locations as separate Location entities linked to the company.
- **Signals**: backlinks to every signal that contributed a field (see `signal-provenance.md`).
- **Relationships**: founders, current leadership, investors, acquirers, acquired-by, parent, subsidiaries — each a typed edge to another Entity.

## Derived fields

- **Confidence-weighted field values** — every scalar field carries the highest-confidence proposal that has been approved; lower-confidence proposals remain visible in the audit trail but do not overwrite.
- **Last-verified-at** — timestamp of the most recent approved proposal touching this field.

## Out of bounds

- No private financials unless published in a public filing.
- No employee PII (see `privacy-boundary.md`).
- No speculative "growth score" invented by the enricher — only fields traceable to a signal.
