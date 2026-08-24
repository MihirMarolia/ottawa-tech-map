create extension if not exists pgtap with schema extensions;

begin;

select plan(21);

select has_table('public', 'offerings', 'Offerings table exists');
select has_table('public', 'offering_proposals', 'Offering proposals table exists');
select has_table('public', 'offering_signal_links', 'Offering-signal provenance table exists');
select has_view('public', 'public_company_offerings', 'Public offering projection exists');

select ok(
  public.validate_offering_signal_payload(
    'product_added',
    'offering-signal/v1',
    '{"kind":"product","name":"Civic Data Platform","description":"Primary-source description","evidenceType":"official_product_page","observedAt":"2026-08-16"}'::jsonb,
    '2026-08-16'
  ),
  'Valid product signal payload is accepted'
);

select ok(
  not public.validate_offering_signal_payload(
    'product_added',
    'offering-signal/v1',
    '{"kind":"service","name":"Advisory","evidenceType":"official_service_page","observedAt":"2026-08-16"}'::jsonb,
    '2026-08-16'
  ),
  'Product signal cannot carry a service payload'
);

select is(
  public.offering_signal_fingerprint_input(
    '00000000-0000-0000-0000-000000000001'::uuid,
    'product',
    'Civic Data Platform',
    null,
    'https://example.ca/product',
    repeat('a', 64),
    '2026-08-16',
    'product_added'
  ),
  '{"companyId":"00000000-0000-0000-0000-000000000001","description":"","kind":"product","name":"Civic Data Platform","observedDate":"2026-08-16","signalType":"product_added","sourceIdentity":"https://example.ca/product|aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}',
  'Offering fingerprint input is canonical and version-independent'
);

select ok(
  not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name in ('offerings', 'offering_proposals', 'offering_signal_links')
      and column_name ~ '(raw|document|html|body|prompt)'
  ),
  'Offering persistence tables contain no raw-source field'
);

select ok(
  exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'offerings'),
  'Offerings table has an RLS policy boundary'
);

select has_column('public', 'offerings', 'normalized_name', 'Offerings keep a normalized identity column');
select has_column('public', 'review_queue_items', 'review_deduplication_key', 'Review Queue supports offering review deduplication');

insert into public.companies (id, canonical_name, canonical_domain)
values ('00000000-0000-0000-0000-000000000010', 'Offering Test Company', 'offering-test.example');

insert into public.offerings (company_id, kind, canonical_name)
values ('00000000-0000-0000-0000-000000000010', 'product', 'OpenAI API');

select throws_ok(
  $$insert into public.offerings (company_id, kind, canonical_name)
    values ('00000000-0000-0000-0000-000000000010', 'product', 'openai api')$$,
  '23505',
  null,
  'Case variants cannot create duplicate canonical products'
);

insert into public.offerings (company_id, kind, canonical_name)
values ('00000000-0000-0000-0000-000000000010', 'service', 'openai api');

select is(
  (select count(*)::integer from public.offerings where company_id = '00000000-0000-0000-0000-000000000010'),
  2,
  'Product and service identities remain distinct by kind'
);

select has_function(
  'public',
  'propose_offering_signal',
  'Offering proposal RPC exists'
);

select has_function(
  'public',
  'approve_offering_proposal',
  'Offering approval RPC exists'
);

select has_function(
  'public',
  'apply_offering_proposal',
  'Offering apply RPC exists'
);

select has_function(
  'public',
  'persist_offering_company_not_found_review',
  'Unknown-company offering review persistence RPC exists'
);

select ok(
  exists (
    select 1
    from pg_trigger
    where tgname = 'audit_events_append_only'
      and tgrelid = 'public.audit_events'::regclass
  ),
  'Existing audit append-only trigger remains installed'
);

select ok(
  not has_table_privilege('anon', 'public.offerings', 'select')
  and not has_table_privilege('anon', 'public.offering_proposals', 'select')
  and not has_table_privilege('anon', 'public.offering_signal_links', 'select')
  and has_table_privilege('anon', 'public.public_company_offerings', 'select'),
  'Anonymous clients read offerings only through the approved public projection'
);

select ok(
  not has_table_privilege('service_role', 'public.offerings', 'insert')
  and not has_table_privilege('service_role', 'public.offering_proposals', 'insert')
  and not has_table_privilege('service_role', 'public.offering_signal_links', 'insert')
  and has_function_privilege('service_role', 'public.propose_offering_signal(uuid,text,uuid,uuid,text,text,text,text,date,public.offering_kind,text,text,text,text,integer,text,text,integer,numeric,text)', 'execute')
  and has_function_privilege('service_role', 'public.apply_offering_proposal(uuid)', 'execute'),
  'Offering ingestion and apply use controlled RPCs without direct canonical writes'
);

select ok(
  not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'public_company_offerings'
      and column_name in ('id', 'proposal_fingerprint', 'signal_fingerprint', 'ingestion_run_id', 'correlation_id', 'structured_payload')
  ),
  'Public offering projection excludes internal identity and unrestricted payload fields'
);

select * from finish();
rollback;
