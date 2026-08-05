create or replace function public.job_posting_fingerprint_input(
  candidate_normalized_url text,
  candidate_content_hash text,
  candidate_observed_date date,
  candidate_external_reference text,
  candidate_signal_discriminator text
)
returns text
language sql
immutable
set search_path = ''
as $$
  select format(
    '{"externalReference":%s,"observedDate":%s,"signalDiscriminator":%s,"signalType":"job_posting_observed","sourceIdentity":%s}',
    coalesce(to_jsonb(candidate_external_reference)::text, 'null'),
    to_jsonb(candidate_observed_date::text)::text,
    to_jsonb(candidate_signal_discriminator)::text,
    to_jsonb(candidate_normalized_url || '|' || candidate_content_hash)::text
  );
$$;

create or replace function public.validate_signal_payload(
  candidate_signal_type text,
  candidate_schema_version text,
  candidate_payload jsonb,
  candidate_observed_date date
)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case
    when jsonb_typeof(candidate_payload) <> 'object' then false
    when candidate_signal_type = 'government_contract_awarded'
      and candidate_schema_version = 'government-contract-signal/v1'
      then
        jsonb_typeof(candidate_payload -> 'contractType') = 'string'
        and candidate_payload ->> 'contractType' = 'professional_services'
        and jsonb_typeof(candidate_payload -> 'observedAt') = 'string'
        and candidate_payload ->> 'observedAt' = candidate_observed_date::text
        and not exists (
          select 1 from jsonb_object_keys(candidate_payload) key
          where key not in ('contractType', 'observedAt')
        )
    when candidate_signal_type = 'job_posting_observed'
      and candidate_schema_version = 'job-posting-signal/v1'
      then
        jsonb_typeof(candidate_payload -> 'jobTitle') = 'string'
        and btrim(candidate_payload ->> 'jobTitle') <> ''
        and jsonb_typeof(candidate_payload -> 'location') = 'string'
        and btrim(candidate_payload ->> 'location') <> ''
        and jsonb_typeof(candidate_payload -> 'postingDate') = 'string'
        and (candidate_payload ->> 'postingDate') ~ '^\d{4}-\d{2}-\d{2}$'
        and jsonb_typeof(candidate_payload -> 'technologies') = 'array'
        and not exists (
          select 1 from jsonb_array_elements(candidate_payload -> 'technologies') technology
          where jsonb_typeof(technology) <> 'string' or btrim(technology #>> '{}') = ''
        )
        and jsonb_typeof(candidate_payload -> 'securityClearanceRequired') = 'boolean'
        and jsonb_typeof(candidate_payload -> 'bilingualRequired') = 'boolean'
        and candidate_payload ->> 'employmentType' in ('full_time', 'part_time', 'contract', 'temporary', 'unknown')
        and jsonb_typeof(candidate_payload -> 'expansionEvidence') = 'boolean'
        and candidate_payload ->> 'observedAt' = candidate_observed_date::text
        and not exists (
          select 1 from jsonb_object_keys(candidate_payload) key
          where key not in (
            'jobTitle', 'location', 'postingDate', 'technologies',
            'securityClearanceRequired', 'bilingualRequired', 'employmentType',
            'expansionEvidence', 'observedAt'
          )
        )
    else false
  end;
$$;

revoke all on function public.job_posting_fingerprint_input(text, text, date, text, text)
  from public, anon, authenticated, service_role;
