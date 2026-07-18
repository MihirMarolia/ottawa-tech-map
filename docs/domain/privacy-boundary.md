# Privacy Boundary

What we collect, what we don't, and how we redact.

## Public-by-default

Companies, products, and locations are public entities. We collect and publish information about them from public sources only.

## People — narrow collection

For individuals (founders, executives, public employees), we collect only:

- Publicly disclosed role and company affiliation.
- Public professional links (LinkedIn public profile, personal site, public bio).
- Public mentions in news, filings, and talks.

We do **not** collect:

- Personal contact info (personal email, phone, home address).
- Family, relationships, or anything outside their professional role.
- Anything from a source that requires login to view, even if the user is logged in.

## Redaction

If a person requests removal, or if a source is later found to be non-public:

1. The signal is flagged `redacted`.
2. All proposals derived from that signal are re-evaluated; if no other signal supports the field, the field is reverted to its previous approved value (or cleared).
3. The redacted signal's raw payload is deleted; provenance metadata is kept so the audit chain remains intact (it points to "redacted source" rather than the URL).
4. A redaction audit entry is written.

## Children and vulnerable groups

Out of scope entirely. We do not collect data on minors or on individuals in vulnerable situations, regardless of source.

## Legal

We honor takedown requests and legal removals (e.g. GDPR right to erasure) through the same redaction path, with an additional `legal-hold` flag that prevents re-collection from the same source for the duration of the hold.
