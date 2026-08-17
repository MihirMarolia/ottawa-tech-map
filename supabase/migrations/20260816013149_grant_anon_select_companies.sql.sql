/*
# Grant anon SELECT on companies for public company profiles

## Purpose
The durable Company Evidence query adapter needs to look up a company by ID
to build the CompanyProfile. The public_company_evidence view provides signal
and source data and is already readable by anon, but the view does not expose
the company UUID or jurisdiction. The adapter queries the companies table
directly for these fields.

Company profile data (name, domain, jurisdiction, status) is intentionally
public. This migration grants anon SELECT on companies.

## Changes
1. Grants SELECT on public.companies to anon and authenticated.
2. Adds a permissive SELECT RLS policy so anon can read all company rows.

## Security
- Company profiles are public data. The policy only allows SELECT.
- This is consistent with the public_company_evidence view already being
  readable by anon.

## Notes
1. Uses DROP POLICY IF EXISTS for idempotency.
2. The policy uses USING (true) because company profile data is public
   by design, not as a shortcut around ownership checks.
*/

GRANT SELECT ON public.companies TO anon, authenticated;

DROP POLICY IF EXISTS "anon_select_companies" ON public.companies;

CREATE POLICY "anon_select_companies"
  ON public.companies FOR SELECT
  TO anon, authenticated
  USING (true);