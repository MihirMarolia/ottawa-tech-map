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