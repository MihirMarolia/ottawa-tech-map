create extension if not exists pgtap with schema extensions;
select plan(15);

select has_function(
  'public',
  'persist_government_contract_unresolved_review_item',
  array['uuid','text','uuid','text','text','text','text','text','text','date','jsonb','text','text','text'],
  'CanadaBuys primitive review RPC exists'
);
select has_function(
  'public',
  'persist_government_contract_unresolved_review_application_item',
  array['uuid','text','uuid','text','text','text','text','text','text','date','jsonb','text','text','text'],
  'CanadaBuys application review RPC exists'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.persist_government_contract_unresolved_review_application_item(uuid,text,uuid,text,text,text,text,text,text,date,jsonb,text,text,text)',
    'execute'
  ),
  'Anonymous role cannot execute the CanadaBuys application RPC'
);
select ok(
  (select p.prosecdef and coalesce(p.proconfig, array[]::text[]) @> array['search_path=']
   from pg_proc p
   join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.proname = 'persist_government_contract_unresolved_review_application_item'
     and pg_get_function_identity_arguments(p.oid) = 'candidate_ingestion_run_id uuid, candidate_item_key text, candidate_correlation_id uuid, candidate_source_name text, candidate_source_url text, candidate_normalized_url text, candidate_content_hash text, candidate_review_deduplication_key text, candidate_supplier_name text, candidate_observed_date date, candidate_sanitized_proposal jsonb, candidate_schema_version text, candidate_resolver_version text, candidate_resolver_rationale text'),
  'CanadaBuys application RPC is SECURITY DEFINER with an empty search_path'
);

select set_config(
  'test.first_review_id',
  (select review_item_id::text
   from public.persist_government_contract_unresolved_review_application_item(
     'a4000000-0000-0000-0000-000000000001',
     'canadabuys-review:test-001',
     'a4000000-0000-0000-0000-000000000002',
     'CanadaBuys award notices',
     'https://canadabuys.canada.ca/opendata/pub/awardNoticeComplete-avisAttributionComplet.csv',
     'https://canadabuys.canada.ca/opendata/pub/awardNoticeComplete-avisAttributionComplet.csv',
     repeat('c', 64),
     'canadabuys-review:v1:test-content-001',
     'Unresolved Supplier Test',
     '2026-08-21',
     '{"sourceFamily":"canadabuys_award_notice","externalReference":"canadabuys:test-001:000","noticeReference":"test-001","amendmentNumber":"000","awardStatus":"active","procurementCategory":"SRV","observedAt":"2026-08-21","attribution":"Contains information licensed under the Open Government Licence – Canada."}'::jsonb,
     'government-contract-signal/v1',
     'canadabuys-supplier-name/v1',
     'CanadaBuys provides a supplier legal name but no verified canonical company domain; reviewer resolution is required.'
   )),
  true
);
select ok(current_setting('test.first_review_id') ~ '^[0-9a-f-]{36}$', 'Review RPC returns a persisted Review Queue UUID');
select is((select reason_code::text from public.review_queue_items where id = current_setting('test.first_review_id')::uuid), 'company_not_found', 'Unresolved supplier is routed to company_not_found review');
select is((select proposed_canonical_domain from public.review_queue_items where id = current_setting('test.first_review_id')::uuid), null, 'Unresolved supplier has no proposed canonical domain');
select is((select count(*)::integer from public.sources where content_hash = repeat('c', 64)), 1, 'Official source provenance is persisted exactly once');
select ok((select sanitized_proposal ? 'sourceFamily' and not sanitized_proposal ? 'contactEmail' and not sanitized_proposal ? 'address' from public.review_queue_items where id = current_setting('test.first_review_id')::uuid), 'Review proposal is sanitized and excludes contact/address fields');
select is((select count(*)::integer from public.audit_events where review_queue_item_id = current_setting('test.first_review_id')::uuid and event_type = 'review_required'), 1, 'Review-required audit event is appended');
select is((select count(*)::integer from public.companies where canonical_name = 'Unresolved Supplier Test'), 0, 'CanadaBuys review intake creates no Company');
select is((select count(*)::integer from public.signals where external_reference = 'canadabuys:test-001:000'), 0, 'CanadaBuys review intake creates no Signal');

select set_config(
  'test.replay_review_id',
  (select review_item_id::text
   from public.persist_government_contract_unresolved_review_application_item(
     'a4000000-0000-0000-0000-000000000003',
     'canadabuys-review:test-001-replay',
     'a4000000-0000-0000-0000-000000000004',
     'CanadaBuys award notices',
     'https://canadabuys.canada.ca/opendata/pub/awardNoticeComplete-avisAttributionComplet.csv',
     'https://canadabuys.canada.ca/opendata/pub/awardNoticeComplete-avisAttributionComplet.csv',
     repeat('c', 64),
     'canadabuys-review:v1:test-content-001',
     'Unresolved Supplier Test',
     '2026-08-21',
     '{"sourceFamily":"canadabuys_award_notice","externalReference":"canadabuys:test-001:000","noticeReference":"test-001","amendmentNumber":"000","awardStatus":"active","procurementCategory":"SRV","observedAt":"2026-08-21","attribution":"Contains information licensed under the Open Government Licence – Canada."}'::jsonb,
     'government-contract-signal/v1',
     'canadabuys-supplier-name/v1',
     'CanadaBuys provides a supplier legal name but no verified canonical company domain; reviewer resolution is required.'
   )),
  true
);
select is(current_setting('test.replay_review_id'), current_setting('test.first_review_id'), 'Replay converges on the original Review Queue ID');
select is((select count(*)::integer from public.review_queue_items where review_deduplication_key = 'canadabuys-review:v1:test-content-001'), 1, 'Replay does not create a duplicate Review Queue item');
select is((select count(*)::integer from public.ingestion_run_items where item_key like 'canadabuys-review:test-001%'), 2, 'Each delivery attempt retains its own ingestion item');
select is((select count(*)::integer from public.audit_events where review_queue_item_id = current_setting('test.first_review_id')::uuid and event_type = 'review_required'), 2, 'Replay appends a second review-required audit event');

select * from finish();
rollback;
