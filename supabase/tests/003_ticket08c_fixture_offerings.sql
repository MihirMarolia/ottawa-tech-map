create extension if not exists pgtap with schema extensions;

begin;

select plan(8);

insert into public.companies (id, canonical_name, canonical_domain)
values ('00000000-0000-0000-0000-000000000080', 'Ticket 08C Fixture Company', 'ticket08c-fixture.example');

select ok(
  public.validate_offering_signal_payload(
    'product_added',
    'offering-signal/v1',
    '{"kind":"product","name":"Fixture Evidence Product","description":"Sanitized fixture description","evidenceType":"official_product_page","observedAt":"2026-08-18"}'::jsonb,
    '2026-08-18'
  ),
  'Fixture-only product observation payload is accepted'
);

select ok(
  not public.validate_offering_signal_payload(
    'product_added',
    'offering-signal/v1',
    '{"kind":"unknown","name":"Ambiguous fixture","evidenceType":"official_company_page","observedAt":"2026-08-18"}'::jsonb,
    '2026-08-18'
  ),
  'Unknown observation classification cannot create a canonical product signal'
);

select is(
  (
    select outcome from public.propose_offering_signal(
      public.create_ingestion_run(1),
      'ticket08c-primary',
      '00000000-0000-0000-0000-000000000081',
      '00000000-0000-0000-0000-000000000080',
      'Ticket 08C official product page',
      'https://ticket08c-fixture.example/products/evidence-product',
      'https://ticket08c-fixture.example/products/evidence-product',
      encode(extensions.digest('ticket08c-primary-source', 'sha256'), 'hex'),
      '2026-08-18',
      'product',
      'Fixture Evidence Product',
      'Sanitized fixture description',
      'official_product_page',
      'product_added',
      1,
      public.offering_signal_fingerprint_input(
        '00000000-0000-0000-0000-000000000080',
        'product',
        'Fixture Evidence Product',
        'Sanitized fixture description',
        'https://ticket08c-fixture.example/products/evidence-product',
        encode(extensions.digest('ticket08c-primary-source', 'sha256'), 'hex'),
        '2026-08-18',
        'product_added'
      ),
      encode(extensions.digest(convert_to(public.offering_signal_fingerprint_input(
        '00000000-0000-0000-0000-000000000080',
        'product',
        'Fixture Evidence Product',
        'Sanitized fixture description',
        'https://ticket08c-fixture.example/products/evidence-product',
        encode(extensions.digest('ticket08c-primary-source', 'sha256'), 'hex'),
        '2026-08-18',
        'product_added'
      ), 'UTF8'), 'sha256'), 'hex'),
      1,
      0.98,
      'offering-signal/v1'
    )
  ),
  'created',
  'Primary sanitized fixture observation proposes through the existing controlled RPC'
);

update public.offering_proposals
set status = 'approved', approved_at = now(), decision_actor_identifier = 'fixture-reviewer'
where company_id = '00000000-0000-0000-0000-000000000080'
  and proposed_name = 'Fixture Evidence Product';

select is(
  (
    select status::text from public.apply_offering_proposal((
      select id from public.offering_proposals
      where company_id = '00000000-0000-0000-0000-000000000080'
        and proposed_name = 'Fixture Evidence Product'
      order by created_at asc
      limit 1
    ))
  ),
  'applied',
  'Approved primary fixture proposal applies through the existing controlled RPC'
);

select is(
  (
    select outcome from public.propose_offering_signal(
      public.create_ingestion_run(1),
      'ticket08c-corroborating',
      '00000000-0000-0000-0000-000000000082',
      '00000000-0000-0000-0000-000000000080',
      'Ticket 08C official documentation',
      'https://ticket08c-fixture.example/docs/evidence-product',
      'https://ticket08c-fixture.example/docs/evidence-product',
      encode(extensions.digest('ticket08c-corroborating-source', 'sha256'), 'hex'),
      '2026-08-18',
      'product',
      'Fixture Evidence Product',
      'Sanitized fixture description',
      'official_documentation',
      'product_added',
      1,
      public.offering_signal_fingerprint_input(
        '00000000-0000-0000-0000-000000000080',
        'product',
        'Fixture Evidence Product',
        'Sanitized fixture description',
        'https://ticket08c-fixture.example/docs/evidence-product',
        encode(extensions.digest('ticket08c-corroborating-source', 'sha256'), 'hex'),
        '2026-08-18',
        'product_added'
      ),
      encode(extensions.digest(convert_to(public.offering_signal_fingerprint_input(
        '00000000-0000-0000-0000-000000000080',
        'product',
        'Fixture Evidence Product',
        'Sanitized fixture description',
        'https://ticket08c-fixture.example/docs/evidence-product',
        encode(extensions.digest('ticket08c-corroborating-source', 'sha256'), 'hex'),
        '2026-08-18',
        'product_added'
      ), 'UTF8'), 'sha256'), 'hex'),
      1,
      0.95,
      'offering-signal/v1'
    )
  ),
  'created',
  'Corroborating sanitized fixture observation proposes through the existing controlled RPC'
);

update public.offering_proposals
set status = 'approved', approved_at = now(), decision_actor_identifier = 'fixture-reviewer'
where company_id = '00000000-0000-0000-0000-000000000080'
  and proposed_name = 'Fixture Evidence Product'
  and status = 'pending';

select is(
  (
    select status::text from public.apply_offering_proposal((
      select id from public.offering_proposals
      where company_id = '00000000-0000-0000-0000-000000000080'
        and proposed_name = 'Fixture Evidence Product'
        and status = 'approved'
      order by created_at desc
      limit 1
    ))
  ),
  'applied',
  'Approved corroborating fixture proposal applies through the existing controlled RPC'
);

select is(
  (select count(*)::integer from public.offerings
   where company_id = '00000000-0000-0000-0000-000000000080'
     and kind = 'product'
     and normalized_name = 'fixture evidence product'),
  1,
  'Corroborating observations converge to one canonical offering'
);

select is(
  (select count(*)::integer from public.offering_signal_links as link
   join public.offerings as offering on offering.id = link.offering_id
   where offering.company_id = '00000000-0000-0000-0000-000000000080'
     and offering.normalized_name = 'fixture evidence product'
     and link.valid_to is null),
  2,
  'One canonical offering retains both active source-backed provenance links'
);

select * from finish();
rollback;
