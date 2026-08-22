create or replace function public.persist_government_contract_application_item(
  candidate_ingestion_run_id uuid,
  candidate_item_key text,
  candidate_correlation_id uuid,
  candidate_company_id uuid,
  candidate_source_name text,
  candidate_source_url text,
  candidate_normalized_url text,
  candidate_content_hash text,
  candidate_observed_date date,
  candidate_external_reference text,
  candidate_signal_discriminator text,
  candidate_fingerprint_version integer,
  candidate_fingerprint_canonical_input text,
  candidate_signal_fingerprint text,
  candidate_structured_payload jsonb,
  candidate_confidence_score numeric,
  candidate_schema_version text
)
returns table (outcome public.ingestion_item_outcome, source_id uuid, signal_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  resolved_outcome public.ingestion_item_outcome;
  resolved_source_id uuid;
  resolved_signal_id uuid;
begin
  insert into public.ingestion_runs (id, status, started_at, total_items)
  values (candidate_ingestion_run_id, 'running', now(), 1);

  select persisted.outcome, persisted.source_id, persisted.signal_id
  into strict resolved_outcome, resolved_source_id, resolved_signal_id
  from public.persist_government_contract_item(
    candidate_ingestion_run_id,
    candidate_item_key,
    candidate_correlation_id,
    candidate_company_id,
    candidate_source_name,
    candidate_source_url,
    candidate_normalized_url,
    candidate_content_hash,
    candidate_observed_date,
    candidate_external_reference,
    candidate_signal_discriminator,
    candidate_fingerprint_version,
    candidate_fingerprint_canonical_input,
    candidate_signal_fingerprint,
    candidate_structured_payload,
    candidate_confidence_score,
    candidate_schema_version
  ) as persisted;

  update public.ingestion_runs
  set status = 'completed',
      completed_at = now(),
      accepted_items = 1
  where id = candidate_ingestion_run_id;

  return query
  select resolved_outcome, resolved_source_id, resolved_signal_id;
end;
$$;

create or replace function public.record_government_contract_item_failure(
  candidate_ingestion_run_id uuid,
  candidate_item_key text,
  candidate_correlation_id uuid,
  candidate_failure_category public.ingestion_failure_category
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  resolved_item_id uuid;
begin
  insert into public.ingestion_runs (
    id,
    status,
    started_at,
    completed_at,
    total_items,
    failed_items
  ) values (
    candidate_ingestion_run_id,
    'failed',
    now(),
    now(),
    1,
    1
  )
  on conflict (id) do nothing;

  insert into public.ingestion_run_items (
    ingestion_run_id,
    item_key,
    outcome,
    correlation_id,
    failure_category,
    completed_at
  ) values (
    candidate_ingestion_run_id,
    candidate_item_key,
    'failed',
    candidate_correlation_id,
    candidate_failure_category,
    now()
  )
  on conflict (ingestion_run_id, item_key) do nothing
  returning id into resolved_item_id;

  if resolved_item_id is not null then
    insert into public.audit_events (
      event_type,
      actor_type,
      actor_identifier,
      ingestion_run_id,
      ingestion_run_item_id,
      correlation_id,
      metadata
    ) values (
      'ingestion_item_failed',
      'service',
      'government-contract-ingestion',
      candidate_ingestion_run_id,
      resolved_item_id,
      candidate_correlation_id,
      jsonb_build_object('failureCategory', candidate_failure_category)
    );
  end if;
end;
$$;

create or replace function public.read_company_government_contract_evidence(
  candidate_company_id uuid
)
returns table (
  signal_id uuid,
  source_id uuid,
  source_name text,
  source_url text,
  observed_date date,
  confidence_score numeric,
  schema_version text,
  contract_type text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    signal.id,
    source.id,
    source.display_name,
    source.source_url,
    signal.observed_date,
    signal.confidence_score,
    signal.schema_version,
    signal.structured_payload ->> 'contractType'
  from public.company_signal_links as link
  join public.signals as signal on signal.id = link.signal_id
  join public.sources as source on source.id = signal.source_id
  where link.company_id = candidate_company_id
    and link.valid_to is null
    and signal.signal_type = 'government_contract_awarded'
  order by signal.observed_date desc, signal.id;
$$;

revoke all on function public.persist_government_contract_application_item(
  uuid, text, uuid, uuid, text, text, text, text, date, text, text,
  integer, text, text, jsonb, numeric, text
) from public, anon, authenticated, service_role;
revoke all on function public.record_government_contract_item_failure(
  uuid, text, uuid, public.ingestion_failure_category
) from public, anon, authenticated, service_role;
revoke all on function public.read_company_government_contract_evidence(uuid)
  from public, anon, authenticated, service_role;

grant execute on function public.persist_government_contract_application_item(
  uuid, text, uuid, uuid, text, text, text, text, date, text, text,
  integer, text, text, jsonb, numeric, text
) to service_role;
grant execute on function public.record_government_contract_item_failure(
  uuid, text, uuid, public.ingestion_failure_category
) to service_role;
grant execute on function public.read_company_government_contract_evidence(uuid)
  to service_role;

comment on function public.persist_government_contract_application_item(
  uuid, text, uuid, uuid, text, text, text, text, date, text, text,
  integer, text, text, jsonb, numeric, text
) is 'Ticket 06 application RPC: creates the parent Ingestion Run and atomically persists one accepted government-contract item.';
comment on function public.record_government_contract_item_failure(
  uuid, text, uuid, public.ingestion_failure_category
) is 'Ticket 06 recovery RPC: records a privacy-safe technical failure in a separate transaction.';
comment on function public.read_company_government_contract_evidence(uuid)
  is 'Service-role Company Evidence query for the government-contract application path.';