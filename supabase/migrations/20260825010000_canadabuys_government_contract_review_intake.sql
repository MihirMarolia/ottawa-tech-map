/*
  CanadaBuys structured intake: durable Review Queue path for official award
  notices whose supplier identity cannot be resolved by exact canonical domain.
  This does not create Companies, Signals, Company-Signal links, or public data.
*/

create or replace function public.persist_government_contract_unresolved_review_item(
  candidate_ingestion_run_id uuid,
  candidate_item_key text,
  candidate_correlation_id uuid,
  candidate_source_name text,
  candidate_source_url text,
  candidate_normalized_url text,
  candidate_content_hash text,
  candidate_review_deduplication_key text,
  candidate_supplier_name text,
  candidate_observed_date date,
  candidate_sanitized_proposal jsonb,
  candidate_schema_version text,
  candidate_resolver_version text,
  candidate_resolver_rationale text
)
returns table (review_item_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  resolved_item_id uuid;
  resolved_source_id uuid;
  resolved_review_item_id uuid;
begin
  if btrim(candidate_review_deduplication_key) = '' then
    raise exception 'Review deduplication key is required' using errcode = '23514';
  end if;
  if jsonb_typeof(candidate_sanitized_proposal) <> 'object' then
    raise exception 'Sanitized proposal must be an object' using errcode = '23514';
  end if;

  insert into public.ingestion_run_items (ingestion_run_id, item_key, correlation_id)
  values (candidate_ingestion_run_id, candidate_item_key, candidate_correlation_id)
  returning id into resolved_item_id;

  insert into public.sources (display_name, source_url, normalized_url, content_hash)
  values (
    candidate_source_name,
    candidate_source_url,
    candidate_normalized_url,
    candidate_content_hash
  )
  on conflict (normalized_url, content_hash) do nothing
  returning id into resolved_source_id;

  if resolved_source_id is null then
    select id into strict resolved_source_id
    from public.sources
    where normalized_url = candidate_normalized_url
      and content_hash = candidate_content_hash;
  end if;

  insert into public.review_queue_items (
    ingestion_run_item_id,
    reason_code,
    source_id,
    proposed_company_name,
    proposed_canonical_domain,
    signal_type,
    observed_date,
    schema_version,
    sanitized_proposal_version,
    sanitized_proposal,
    resolver_version,
    resolver_rationale,
    correlation_id,
    review_deduplication_key
  ) values (
    resolved_item_id,
    'company_not_found',
    resolved_source_id,
    btrim(candidate_supplier_name),
    null,
    'government_contract_awarded',
    candidate_observed_date,
    candidate_schema_version,
    1,
    candidate_sanitized_proposal,
    candidate_resolver_version,
    candidate_resolver_rationale,
    candidate_correlation_id,
    candidate_review_deduplication_key
  )
  on conflict (review_deduplication_key) where review_deduplication_key is not null do nothing
  returning id into resolved_review_item_id;

  if resolved_review_item_id is null then
    select id into strict resolved_review_item_id
    from public.review_queue_items
    where review_deduplication_key = candidate_review_deduplication_key;
  end if;

  update public.ingestion_run_items
  set outcome = 'review_required',
      source_id = resolved_source_id,
      review_queue_item_id = resolved_review_item_id,
      completed_at = now()
  where id = resolved_item_id;

  insert into public.audit_events (
    event_type,
    actor_type,
    actor_identifier,
    ingestion_run_id,
    ingestion_run_item_id,
    source_id,
    review_queue_item_id,
    correlation_id,
    metadata
  ) values (
    'review_required',
    'service',
    'government-contract-ingestion',
    candidate_ingestion_run_id,
    resolved_item_id,
    resolved_source_id,
    resolved_review_item_id,
    candidate_correlation_id,
    jsonb_build_object(
      'reason', 'company_not_found',
      'signalType', 'government_contract_awarded'
    )
  );

  return query select resolved_review_item_id;
end;
$$;

create or replace function public.persist_government_contract_unresolved_review_application_item(
  candidate_ingestion_run_id uuid,
  candidate_item_key text,
  candidate_correlation_id uuid,
  candidate_source_name text,
  candidate_source_url text,
  candidate_normalized_url text,
  candidate_content_hash text,
  candidate_review_deduplication_key text,
  candidate_supplier_name text,
  candidate_observed_date date,
  candidate_sanitized_proposal jsonb,
  candidate_schema_version text,
  candidate_resolver_version text,
  candidate_resolver_rationale text
)
returns table (review_item_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  resolved_review_item_id uuid;
begin
  insert into public.ingestion_runs (id, status, started_at, total_items)
  values (candidate_ingestion_run_id, 'running', now(), 1);

  select review.review_item_id
  into strict resolved_review_item_id
  from public.persist_government_contract_unresolved_review_item(
    candidate_ingestion_run_id,
    candidate_item_key,
    candidate_correlation_id,
    candidate_source_name,
    candidate_source_url,
    candidate_normalized_url,
    candidate_content_hash,
    candidate_review_deduplication_key,
    candidate_supplier_name,
    candidate_observed_date,
    candidate_sanitized_proposal,
    candidate_schema_version,
    candidate_resolver_version,
    candidate_resolver_rationale
  ) as review;

  update public.ingestion_runs
  set status = 'completed',
      completed_at = now(),
      review_items = 1
  where id = candidate_ingestion_run_id;

  return query select resolved_review_item_id;
end;
$$;

revoke all on function public.persist_government_contract_unresolved_review_item(
  uuid, text, uuid, text, text, text, text, text, text, date, jsonb, text, text, text
) from public, anon, authenticated, service_role;
revoke all on function public.persist_government_contract_unresolved_review_application_item(
  uuid, text, uuid, text, text, text, text, text, text, date, jsonb, text, text, text
) from public, anon, authenticated, service_role;
grant execute on function public.persist_government_contract_unresolved_review_application_item(
  uuid, text, uuid, text, text, text, text, text, text, date, jsonb, text, text, text
) to service_role;

comment on function public.persist_government_contract_unresolved_review_item(
  uuid, text, uuid, text, text, text, text, text, text, date, jsonb, text, text, text
) is 'CanadaBuys intake primitive: persists an unresolved official award notice as an idempotent Review Queue item without creating a Company or Signal.';
comment on function public.persist_government_contract_unresolved_review_application_item(
  uuid, text, uuid, text, text, text, text, text, text, date, jsonb, text, text, text
) is 'CanadaBuys application RPC: creates one review-only ingestion run and atomically persists one unresolved official award-notice Review Queue item.';
