begin;

create extension if not exists pgtap with schema extensions;

select plan(30);

select has_table('public', 'companies', 'Companies table exists');
select has_table('public', 'sources', 'Sources table exists');
select has_table('public', 'signals', 'Signals table exists');
select has_table('public', 'company_signal_links', 'Company–Signal links table exists');
select has_table('public', 'review_queue_items', 'Review Queue table exists');
select has_table('public', 'review_queue_candidates', 'Review Queue candidates table exists');
select has_table('public', 'review_decisions', 'Review decisions table exists');
select has_table('public', 'audit_events', 'Audit ledger exists');

select ok(
  not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name in ('sources', 'signals', 'review_queue_items', 'audit_events')
      and column_name ~ '(raw|document|html|body|prompt)'
  ),
  'Persistence tables contain no raw-source field'
);

insert into public.companies (
  id,
  canonical_name,
  canonical_domain
) values (
  '00000000-0000-0000-0000-000000000001',
  'Schema Fixture Systems',
  'schema-fixture-systems.example'
);

select throws_ok(
  $$insert into public.companies (canonical_name, canonical_domain)
    values ('Duplicate Northstar', 'schema-fixture-systems.example')$$,
  '23505',
  null,
  'Two active Companies cannot own one canonical domain'
);

insert into public.sources (
  id,
  display_name,
  source_url,
  normalized_url,
  content_hash
) values (
  '00000000-0000-0000-0000-000000000002',
  'Canadian Public Procurement Fixture',
  'https://contracts.example/notices/contract-2026-001',
  'https://contracts.example/notices/contract-2026-001',
  repeat('a', 64)
);

select throws_ok(
  $$insert into public.sources (display_name, source_url, normalized_url, content_hash)
    values (
      'Alternate caller identity',
      'https://contracts.example/notices/contract-2026-001',
      'https://contracts.example/notices/contract-2026-001',
      repeat('a', 64)
    )$$,
  '23505',
  null,
  'Source identity is unique independently of caller identity'
);

select throws_ok(
  $$insert into public.signals (
      source_id,
      signal_type,
      observed_date,
      signal_discriminator,
      signal_fingerprint_version,
      fingerprint_canonical_input,
      signal_fingerprint,
      structured_payload,
      confidence_score,
      schema_version
    ) values (
      '00000000-0000-0000-0000-000000000002',
      'government_contract_awarded',
      '2026-06-30',
      'contract-2026-001',
      1,
      'fingerprint-vector',
      repeat('b', 64),
      '{"contractType":"professional_services","observedAt":"2026-06-30"}',
      0.98,
      'government-contract-signal/v1'
    )$$,
  '23514',
  null,
  'Opaque caller fingerprint mismatches are rejected'
);

select throws_ok(
  $$insert into public.signals (
      source_id,
      signal_type,
      observed_date,
      signal_discriminator,
      signal_fingerprint_version,
      fingerprint_canonical_input,
      signal_fingerprint,
      structured_payload,
      confidence_score,
      schema_version
    ) values (
      '00000000-0000-0000-0000-000000000002',
      'government_contract_awarded',
      '2026-06-30',
      'contract-2026-001',
      1,
      'invalid-confidence',
      encode(extensions.digest(convert_to('invalid-confidence', 'UTF8'), 'sha256'), 'hex'),
      '{"contractType":"professional_services","observedAt":"2026-06-30"}',
      1.1,
      'government-contract-signal/v1'
    )$$,
  '23514',
  null,
  'Confidence outside zero through one is rejected'
);

select throws_ok(
  $$insert into public.signals (
      source_id,
      signal_type,
      observed_date,
      signal_discriminator,
      signal_fingerprint_version,
      fingerprint_canonical_input,
      signal_fingerprint,
      structured_payload,
      confidence_score,
      schema_version
    ) values (
      null,
      'government_contract_awarded',
      '2026-06-30',
      'contract-2026-001',
      1,
      'missing-source',
      encode(extensions.digest(convert_to('missing-source', 'UTF8'), 'sha256'), 'hex'),
      '{"contractType":"professional_services","observedAt":"2026-06-30"}',
      0.98,
      'government-contract-signal/v1'
    )$$,
  '23502',
  null,
  'Signal provenance Source is required'
);

select throws_ok(
  $$insert into public.signals (
      source_id,
      signal_type,
      observed_date,
      signal_discriminator,
      signal_fingerprint_version,
      fingerprint_canonical_input,
      signal_fingerprint,
      structured_payload,
      confidence_score,
      schema_version
    ) values (
      '00000000-0000-0000-0000-000000000002',
      'government_contract_awarded',
      '2026-06-30',
      'contract-2026-001',
      1,
      'invalid-payload',
      encode(extensions.digest(convert_to('invalid-payload', 'UTF8'), 'sha256'), 'hex'),
      '{"contractType":"other","observedAt":"2026-06-30"}',
      0.98,
      'government-contract-signal/v1'
    )$$,
  '23514',
  null,
  'Government-contract payload structure is enforced'
);

select is(
  public.government_contract_fingerprint_input(
    'https://contracts.example/notices/contract-2026-001',
    repeat('a', 64),
    '2026-06-30',
    null,
    'buyer:ca-on|professional_services|2026-06-30'
  ),
  '{"externalReference":null,"observedDate":"2026-06-30","signalDiscriminator":"buyer:ca-on|professional_services|2026-06-30","signalType":"government_contract_awarded","sourceIdentity":"https://contracts.example/notices/contract-2026-001|aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}',
  'PostgreSQL canonical fingerprint input matches the shared vector'
);

select throws_ok(
  $$insert into public.signals (
      source_id,
      signal_type,
      observed_date,
      signal_discriminator,
      signal_fingerprint_version,
      fingerprint_canonical_input,
      signal_fingerprint,
      structured_payload,
      confidence_score,
      schema_version
    ) values (
      '00000000-0000-0000-0000-000000000002',
      'government_contract_awarded',
      '2026-06-30',
      'date-mismatch',
      1,
      'date-mismatch',
      encode(extensions.digest(convert_to('date-mismatch', 'UTF8'), 'sha256'), 'hex'),
      '{"contractType":"professional_services","observedAt":"2026-07-01"}',
      0.98,
      'government-contract-signal/v1'
    )$$,
  '23514',
  null,
  'Structured payload observation date must match the typed Signal date'
);

insert into public.ingestion_runs (id, status, started_at, total_items)
values ('30000000-0000-0000-0000-000000000001', 'running', now(), 2);

insert into public.ingestion_run_items (id, ingestion_run_id, item_key, correlation_id)
values
  (
    '30000000-0000-0000-0000-000000000002',
    '30000000-0000-0000-0000-000000000001',
    'review-one',
    '30000000-0000-0000-0000-000000000004'
  ),
  (
    '30000000-0000-0000-0000-000000000003',
    '30000000-0000-0000-0000-000000000001',
    'review-two',
    '30000000-0000-0000-0000-000000000005'
  );

insert into public.review_queue_items (
  id,
  ingestion_run_item_id,
  reason_code,
  signal_type,
  observed_date,
  schema_version,
  sanitized_proposal_version,
  sanitized_proposal,
  resolver_version,
  correlation_id
) values
  (
    '30000000-0000-0000-0000-000000000006',
    '30000000-0000-0000-0000-000000000002',
    'conflicting_evidence',
    'government_contract_awarded',
    '2026-06-30',
    'government-contract-signal/v1',
    1,
    '{}',
    'exact-domain/v1',
    '30000000-0000-0000-0000-000000000004'
  ),
  (
    '30000000-0000-0000-0000-000000000007',
    '30000000-0000-0000-0000-000000000003',
    'conflicting_evidence',
    'government_contract_awarded',
    '2026-06-30',
    'government-contract-signal/v1',
    1,
    '{}',
    'exact-domain/v1',
    '30000000-0000-0000-0000-000000000005'
  );

insert into public.review_queue_candidates (
  id,
  review_queue_item_id,
  company_id,
  candidate_rank,
  confidence_score,
  snapshot_name,
  snapshot_canonical_domain,
  snapshot_company_status,
  snapshot_match_basis
) values (
  '30000000-0000-0000-0000-000000000008',
  '30000000-0000-0000-0000-000000000006',
  '00000000-0000-0000-0000-000000000001',
  1,
  1,
  'Schema Fixture Systems',
  'schema-fixture-systems.example',
  'active',
  'canonical_domain'
);

select throws_ok(
  $$insert into public.review_decisions (
      review_queue_item_id,
      decision_type,
      selected_candidate_id,
      actor_type,
      actor_identifier,
      rationale_code
    ) values (
      '30000000-0000-0000-0000-000000000007',
      'candidate_selected',
      '30000000-0000-0000-0000-000000000008',
      'user',
      'reviewer-1',
      'confirmed_match'
    )$$,
  '23503',
  null,
  'A Review Decision cannot select another Review Queue item candidate'
);

insert into public.review_decisions (
  id,
  review_queue_item_id,
  decision_type,
  actor_type,
  actor_identifier,
  rationale_code
) values (
  '30000000-0000-0000-0000-000000000009',
  '30000000-0000-0000-0000-000000000006',
  'rejected',
  'user',
  'reviewer-1',
  'insufficient_evidence'
);

select throws_ok(
  $$insert into public.review_decisions (
      review_queue_item_id,
      decision_type,
      actor_type,
      actor_identifier,
      rationale_code,
      supersedes_decision_id
    ) values (
      '30000000-0000-0000-0000-000000000007',
      'rejected',
      'user',
      'reviewer-2',
      'corrected_decision',
      '30000000-0000-0000-0000-000000000009'
    )$$,
  '23503',
  null,
  'A Review Decision cannot supersede another Review Queue item decision'
);

select throws_ok(
  $$select * from public.persist_government_contract_item(
      '30000000-0000-0000-0000-000000000001',
      'fingerprint-mismatch',
      '30000000-0000-0000-0000-000000000010',
      '00000000-0000-0000-0000-000000000001',
      'Canadian Public Procurement Fixture',
      'https://contracts.example/notices/contract-2026-001',
      'https://contracts.example/notices/contract-2026-001',
      repeat('a', 64),
      '2026-06-30',
      null,
      'buyer:ca-on|professional_services|2026-06-30',
      1,
      'caller-controlled-mismatch',
      encode(extensions.digest(convert_to('caller-controlled-mismatch', 'UTF8'), 'sha256'), 'hex'),
      '{"contractType":"professional_services","observedAt":"2026-06-30"}',
      0.98,
      'government-contract-signal/v1'
    )$$,
  '23514',
  'Signal fingerprint canonical input does not match identity fields',
  'The RPC rejects a self-consistent hash over mismatched identity input'
);


insert into public.audit_events (
  id,
  event_type,
  actor_type,
  correlation_id
) values (
  '00000000-0000-0000-0000-000000000003',
  'ingestion_item_started',
  'system',
  '00000000-0000-0000-0000-000000000004'
);

select throws_ok(
  $$update public.audit_events
    set event_type = 'source_resolved'
    where id = '00000000-0000-0000-0000-000000000003'$$,
  '55000',
  'audit_events is append-only',
  'Audit Events cannot be updated'
);


select throws_ok(
  $$delete from public.audit_events
    where id = '00000000-0000-0000-0000-000000000003'$$,
  '55000',
  'audit_events is append-only',
  'Audit Events cannot be deleted'
);

select throws_ok(
  $$update public.review_queue_candidates
    set snapshot_name = 'Rewritten snapshot'
    where id = '30000000-0000-0000-0000-000000000008'$$,
  '55000',
  'review_queue_candidates is append-only',
  'Review Queue candidate snapshots cannot be mutated'
);

select throws_ok(
  $$update public.review_decisions
    set rationale_code = 'rewritten'
    where id = '30000000-0000-0000-0000-000000000009'$$,
  '55000',
  'review_decisions is append-only',
  'Review Decisions cannot be mutated'
);

select ok(
  not has_table_privilege('anon', 'public.companies', 'select')
  and has_table_privilege('anon', 'public.public_company_profiles', 'select')
  and has_table_privilege('anon', 'public.public_company_evidence', 'select'),
  'Anonymous clients read only approved public Company Profile and Evidence projections'
);

select is(
  (
    select count(*)::integer
    from pg_class
    join pg_namespace on pg_namespace.oid = pg_class.relnamespace
    where pg_namespace.nspname = 'public'
      and pg_class.relname in (
        'companies',
        'sources',
        'signals',
        'company_signal_links',
        'ingestion_runs',
        'ingestion_run_items',
        'review_queue_items',
        'review_queue_candidates',
        'review_decisions',
        'audit_events',
        'reviewer_memberships'
      )
      and pg_class.relrowsecurity
  ),
  11,
  'RLS is enabled on every protected persistence table'
);

select ok(
  not has_table_privilege('authenticated', 'public.review_queue_items', 'select')
  and has_table_privilege('authenticated', 'public.reviewer_queue', 'select'),
  'Authenticated clients use the controlled reviewer view'
);

select ok(
  not has_table_privilege('service_role', 'public.signals', 'insert')
  and has_function_privilege(
    'service_role',
    'public.persist_government_contract_item(uuid,text,uuid,uuid,text,text,text,text,date,text,text,integer,text,text,jsonb,numeric,text)',
    'execute'
  ),
  'Ingestion service invokes the controlled RPC without direct Signal writes'
);

select ok(
  not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'public_company_evidence'
      and column_name in (
        'id',
        'signal_fingerprint',
        'ingestion_run_id',
        'correlation_id',
        'structured_payload'
      )
  ),
  'Public Evidence excludes internal identity and unrestricted payload fields'
);

select ok(
  not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'public_company_profiles'
      and column_name in ('id', 'company_id', 'fingerprint', 'ingestion_run_id', 'correlation_id')
  ),
  'Public Company Profile excludes internal identifiers and operational metadata'
);

select * from finish();
rollback;
