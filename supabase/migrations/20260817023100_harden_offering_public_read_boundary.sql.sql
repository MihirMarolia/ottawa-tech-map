/*
  Ticket 07A security remediation.

  New public-schema relations inherit broad default privileges in Supabase.
  Offerings remain readable only through the approved privacy-safe projection;
  all canonical offering, proposal, and provenance access stays behind
  controlled security-definer functions.
*/

alter table public.offerings enable row level security;
alter table public.offering_proposals enable row level security;
alter table public.offering_signal_links enable row level security;

create policy offerings_no_direct_access
  on public.offerings as restrictive for all to public
  using (false) with check (false);

create policy offering_proposals_no_direct_access
  on public.offering_proposals as restrictive for all to public
  using (false) with check (false);

create policy offering_signal_links_no_direct_access
  on public.offering_signal_links as restrictive for all to public
  using (false) with check (false);

revoke all on public.offerings, public.offering_proposals, public.offering_signal_links,
  public.public_company_offerings from public, anon, authenticated, service_role;

grant select on public.public_company_offerings to anon, authenticated;
