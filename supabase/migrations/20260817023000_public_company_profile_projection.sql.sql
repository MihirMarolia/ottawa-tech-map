-- Preserve the Ticket 05/06 public-read boundary.
-- Public consumers access company profile fields only through approved projections,
-- never through the internal companies table or its UUID primary key.

revoke select on public.companies from anon, authenticated;
drop policy if exists "anon_select_companies" on public.companies;

create view public.public_company_profiles
with (security_barrier = true)
as
select
  company.canonical_name,
  company.canonical_domain,
  company.jurisdiction,
  company.status::text as status
from public.companies as company
where company.status = 'active';

comment on view public.public_company_profiles is
  'Privacy-safe public Company Profile projection; excludes internal UUIDs, provenance internals, Review Queue data, audit metadata, and unrestricted payloads.';

-- The existing CompanyEvidenceQuery accepts a CompanyId because it is also used
-- inside durable application flows. This controlled projection preserves that
-- domain interface without granting browser roles SELECT on public.companies.
create or replace function public.public_company_profile_by_id(candidate_company_id uuid)
returns table (
  canonical_name text,
  canonical_domain text,
  jurisdiction text,
  status text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    company.canonical_name,
    company.canonical_domain,
    company.jurisdiction,
    company.status::text
  from public.companies as company
  where company.id = candidate_company_id
    and company.status = 'active';
$$;

comment on function public.public_company_profile_by_id(uuid) is
  'Privacy-safe public Company Profile projection for CompanyEvidenceQuery; returns no internal identifier.';

grant select on public.public_company_profiles to anon, authenticated;
revoke execute on function public.public_company_profile_by_id(uuid) from public;
grant execute on function public.public_company_profile_by_id(uuid) to anon, authenticated;
