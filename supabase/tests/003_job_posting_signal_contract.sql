begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

select has_function(
  'public', 'job_posting_fingerprint_input',
  array['text', 'text', 'date', 'text', 'text'],
  'Job-posting fingerprint contract exists'
);

insert into public.sources (
  id, display_name, source_url, normalized_url, content_hash
) values (
  '90000000-0000-0000-0000-000000000001',
  'Fictional careers fixture',
  'https://careers.example/jobs/platform-security-engineer',
  'https://careers.example/jobs/platform-security-engineer',
  repeat('b', 64)
);

select lives_ok(
  $$insert into public.signals (
      id, source_id, signal_type, observed_date, external_reference,
      signal_discriminator, signal_fingerprint_version,
      fingerprint_canonical_input, signal_fingerprint, structured_payload,
      confidence_score, schema_version
    )
    select
      '90000000-0000-0000-0000-000000000002',
      '90000000-0000-0000-0000-000000000001',
      'job_posting_observed', '2026-08-05', null,
      'platform security engineer|ottawa ontario|2026-08-01', 1,
      fingerprint_input,
      encode(extensions.digest(convert_to(fingerprint_input, 'UTF8'), 'sha256'), 'hex'),
      '{"jobTitle":"Platform Security Engineer","location":"Ottawa, Ontario","postingDate":"2026-08-01","technologies":["TypeScript","PostgreSQL"],"securityClearanceRequired":true,"bilingualRequired":false,"employmentType":"full_time","expansionEvidence":false,"observedAt":"2026-08-05"}',
      0.97, 'job-posting-signal/v1'
    from (
      select public.job_posting_fingerprint_input(
        'https://careers.example/jobs/platform-security-engineer',
        repeat('b', 64), '2026-08-05', null,
        'platform security engineer|ottawa ontario|2026-08-01'
      ) as fingerprint_input
    ) identity$$,
  'A privacy-safe job-posting Signal without an external reference is valid'
);

select is(
  (select external_reference from public.signals where id = '90000000-0000-0000-0000-000000000002'),
  null,
  'Job-posting external reference remains nullable'
);

select throws_ok(
  $$insert into public.signals (
      source_id, signal_type, observed_date, signal_discriminator,
      signal_fingerprint_version, fingerprint_canonical_input,
      signal_fingerprint, structured_payload, confidence_score, schema_version
    ) values (
      '90000000-0000-0000-0000-000000000001',
      'job_posting_observed', '2026-08-05', 'unsafe', 1, 'unsafe-job',
      encode(extensions.digest(convert_to('unsafe-job', 'UTF8'), 'sha256'), 'hex'),
      '{"jobTitle":"Engineer","location":"Ottawa","postingDate":"2026-08-01","technologies":[],"securityClearanceRequired":false,"bilingualRequired":false,"employmentType":"full_time","expansionEvidence":false,"observedAt":"2026-08-05","rawText":"forbidden"}',
      0.8, 'job-posting-signal/v1'
    )$$,
  '23514',
  null,
  'Signal payload rejects raw source fields'
);

select throws_ok(
  $$insert into public.signals (
      source_id, signal_type, observed_date, signal_discriminator,
      signal_fingerprint_version, fingerprint_canonical_input,
      signal_fingerprint, structured_payload, confidence_score, schema_version
    ) values (
      '90000000-0000-0000-0000-000000000001',
      'unsupported_signal', '2026-08-05', 'unsupported', 1, 'unsupported',
      encode(extensions.digest(convert_to('unsupported', 'UTF8'), 'sha256'), 'hex'),
      '{}', 0.8, 'unsupported/v1'
    )$$,
  '23514',
  null,
  'Unsupported Signal types remain rejected'
);

select ok(
  public.job_posting_fingerprint_input(
    'https://careers.example/jobs/platform-security-engineer',
    repeat('b', 64), '2026-08-05', null,
    'platform security engineer|ottawa ontario|2026-08-01'
  ) = public.job_posting_fingerprint_input(
    'https://careers.example/jobs/platform-security-engineer',
    repeat('b', 64), '2026-08-05', null,
    'platform security engineer|ottawa ontario|2026-08-01'
  ),
  'Job-posting fingerprint input is deterministic'
);

select * from finish();
rollback;
