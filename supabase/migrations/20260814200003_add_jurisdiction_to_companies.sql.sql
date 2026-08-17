/*
# Add jurisdiction column to companies

## Purpose
The in-memory Company type includes a `jurisdiction` field (e.g. "CA-ON")
that is part of the Company profile presentation. The database companies
table does not yet have this column. Ticket 06 wires Supabase-backed
adapters that need to return the full Company shape including jurisdiction.

## Changes
1. Adds `jurisdiction` column (text, nullable) to `public.companies`.
2. Updates the seeded fixture Company with jurisdiction "CA-ON".

## Security
- No RLS or grant changes.
- The column is nullable so existing rows (if any) are unaffected.
- service_role already has SELECT on companies.

## Notes
1. Nullable because the schema was deployed without it; existing rows get NULL.
2. Future ingestion may populate this from source documents.
*/

alter table public.companies add column if not exists jurisdiction text;

update public.companies
set jurisdiction = 'CA-ON'
where canonical_domain = 'northstar-civic.example';