/*
# Grant service-role execute on ingestion RPC and seed fixture Company

## Purpose
Ticket 06 wires the application ingestion path to Supabase-backed persistence
adapters. The existing migration created the persist_government_contract_item
RPC but did not explicitly grant execute to service_role. This migration:

1. Grants execute on persist_government_contract_item to service_role.
2. Grants select on companies to service_role (entity resolver needs to read
   active companies for canonical-domain resolution).
3. Grants insert on ingestion_runs to service_role (needed to create the
   parent ingestion run before persisting items).
4. Grants insert/select on ingestion_run_items to service_role.
5. Grants select on review_queue_items and review_queue_candidates to
   service_role (review-required path reads these back).
6. Grants insert on review_queue_items and review_queue_candidates to
   service_role (review-required path creates these).
7. Seeds the fictional fixture Company so the Supabase adapter can resolve
   it by canonical domain.

## Security
- No RLS policies changed. RLS remains enabled on all tables.
- service_role bypasses RLS by design in Supabase; these grants are the
  explicit privileges the ingestion service needs.
- The anon role continues to read only public_company_evidence.
- No new tables or columns.

## Notes
1. The fixture Company is fictional and uses the .example domain per RFC 2606.
2. The seed is idempotent via ON CONFLICT DO NOTHING.
*/

grant execute on function public.persist_government_contract_item(
  uuid, text, uuid, uuid, text, text, text, text, date, text, text,
  integer, text, text, jsonb, numeric, text
) to service_role;

grant select on public.companies to service_role;
grant insert on public.ingestion_runs to service_role;
grant select, insert on public.ingestion_run_items to service_role;
grant select, insert on public.review_queue_items to service_role;
grant select, insert on public.review_queue_candidates to service_role;
grant select on public.sources to service_role;
grant select on public.signals to service_role;
grant select on public.company_signal_links to service_role;
grant select on public.audit_events to service_role;

insert into public.companies (canonical_name, canonical_domain, status)
values ('Northstar Civic Systems', 'northstar-civic.example', 'active')
on conflict do nothing;