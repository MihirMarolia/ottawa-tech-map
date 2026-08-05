alter table public.audit_events drop constraint audit_events_event_type_check;
alter table public.audit_events add constraint audit_events_event_type_check check (event_type in (
  'ingestion_item_started', 'source_resolved', 'signal_created', 'signal_already_processed',
  'review_required', 'ingestion_item_rejected', 'ingestion_item_failed', 'review_claimed',
  'review_candidate_selected', 'company_created_by_review', 'review_resolved',
  'review_rejected', 'review_reopened', 'review_superseded', 'association_invalidated',
  'audit_event_correction_recorded'
));

create or replace function public.require_reviewer()
returns uuid language plpgsql stable security definer set search_path = '' as $$
declare reviewer_id uuid := auth.uid();
begin
  if reviewer_id is null or not exists (
    select 1 from public.reviewer_memberships where user_id = reviewer_id
  ) then raise exception 'Reviewer membership required' using errcode = '42501'; end if;
  return reviewer_id;
end;
$$;

create or replace function public.select_review_candidate(
  candidate_review_queue_item_id uuid, candidate_id uuid, candidate_rationale_code text
) returns table (decision_id uuid, company_id uuid)
language plpgsql security definer set search_path = '' as $$
declare reviewer_id uuid := public.require_reviewer(); item public.review_queue_items%rowtype;
  resolved_company_id uuid; resolved_decision_id uuid;
begin
  if btrim(candidate_rationale_code) = '' then raise exception 'Rationale code is required' using errcode = '23514'; end if;
  select * into strict item from public.review_queue_items where id = candidate_review_queue_item_id for update;
  if item.status not in ('pending', 'claimed', 'reopened') then raise exception 'Review Queue item is not actionable' using errcode = '55000'; end if;
  select candidate.company_id into strict resolved_company_id from public.review_queue_candidates candidate
    join public.companies company on company.id = candidate.company_id and company.status = 'active'
    where candidate.review_queue_item_id = item.id and candidate.id = candidate_id;
  insert into public.review_decisions (review_queue_item_id, decision_type, selected_candidate_id, actor_type, actor_identifier, rationale_code)
    values (item.id, 'candidate_selected', candidate_id, 'user', reviewer_id::text, candidate_rationale_code)
    returning id into resolved_decision_id;
  update public.review_queue_items set status = 'resolved', resolved_at = now() where id = item.id;
  insert into public.audit_events (event_type, actor_type, actor_identifier, ingestion_run_id, ingestion_run_item_id, source_id, company_id, review_queue_item_id, correlation_id, metadata)
    select 'review_candidate_selected', 'user', reviewer_id::text, run_item.ingestion_run_id, item.ingestion_run_item_id,
      item.source_id, resolved_company_id, item.id, item.correlation_id, jsonb_build_object('rationaleCode', candidate_rationale_code)
    from public.ingestion_run_items run_item where run_item.id = item.ingestion_run_item_id;
  insert into public.audit_events (event_type, actor_type, actor_identifier, ingestion_run_id, ingestion_run_item_id, source_id, company_id, review_queue_item_id, correlation_id, metadata)
    select 'review_resolved', 'user', reviewer_id::text, run_item.ingestion_run_id, item.ingestion_run_item_id,
      item.source_id, resolved_company_id, item.id, item.correlation_id, jsonb_build_object('decisionType', 'candidate_selected')
    from public.ingestion_run_items run_item where run_item.id = item.ingestion_run_item_id;
  return query select resolved_decision_id, resolved_company_id;
end;
$$;

create or replace function public.reject_review_item(
  candidate_review_queue_item_id uuid, candidate_rationale_code text
) returns uuid language plpgsql security definer set search_path = '' as $$
declare reviewer_id uuid := public.require_reviewer(); item public.review_queue_items%rowtype; resolved_decision_id uuid;
begin
  if btrim(candidate_rationale_code) = '' then raise exception 'Rationale code is required' using errcode = '23514'; end if;
  select * into strict item from public.review_queue_items where id = candidate_review_queue_item_id for update;
  if item.status not in ('pending', 'claimed', 'reopened') then raise exception 'Review Queue item is not actionable' using errcode = '55000'; end if;
  insert into public.review_decisions (review_queue_item_id, decision_type, actor_type, actor_identifier, rationale_code)
    values (item.id, 'rejected', 'user', reviewer_id::text, candidate_rationale_code) returning id into resolved_decision_id;
  update public.review_queue_items set status = 'rejected', resolved_at = now() where id = item.id;
  insert into public.audit_events (event_type, actor_type, actor_identifier, ingestion_run_id, ingestion_run_item_id, source_id, review_queue_item_id, correlation_id, metadata)
    select 'review_rejected', 'user', reviewer_id::text, run_item.ingestion_run_id, item.ingestion_run_item_id,
      item.source_id, item.id, item.correlation_id, jsonb_build_object('rationaleCode', candidate_rationale_code)
    from public.ingestion_run_items run_item where run_item.id = item.ingestion_run_item_id;
  return resolved_decision_id;
end;
$$;

create or replace function public.create_company_from_review(
  candidate_review_queue_item_id uuid, candidate_canonical_name text,
  candidate_canonical_domain text, candidate_rationale_code text
) returns table (decision_id uuid, company_id uuid)
language plpgsql security definer set search_path = '' as $$
declare reviewer_id uuid := public.require_reviewer(); item public.review_queue_items%rowtype;
  resolved_company_id uuid; resolved_decision_id uuid; normalized_domain text := lower(btrim(candidate_canonical_domain));
begin
  if btrim(candidate_canonical_name) = '' or normalized_domain = '' or normalized_domain ~ '[/:#?[:space:]]' then
    raise exception 'Valid reviewed Company identity is required' using errcode = '23514'; end if;
  if btrim(candidate_rationale_code) = '' then raise exception 'Rationale code is required' using errcode = '23514'; end if;
  select * into strict item from public.review_queue_items where id = candidate_review_queue_item_id for update;
  if item.status not in ('pending', 'claimed', 'reopened') then raise exception 'Review Queue item is not actionable' using errcode = '55000'; end if;
  insert into public.companies (canonical_name, canonical_domain) values (btrim(candidate_canonical_name), normalized_domain)
    returning id into resolved_company_id;
  insert into public.review_decisions (review_queue_item_id, decision_type, actor_type, actor_identifier, rationale_code)
    values (item.id, 'company_created', 'user', reviewer_id::text, candidate_rationale_code) returning id into resolved_decision_id;
  update public.review_queue_items set status = 'resolved', resolved_at = now() where id = item.id;
  insert into public.audit_events (event_type, actor_type, actor_identifier, ingestion_run_id, ingestion_run_item_id, source_id, company_id, review_queue_item_id, correlation_id, metadata)
    select 'company_created_by_review', 'user', reviewer_id::text, run_item.ingestion_run_id, item.ingestion_run_item_id,
      item.source_id, resolved_company_id, item.id, item.correlation_id, jsonb_build_object('rationaleCode', candidate_rationale_code, 'canonicalDomain', normalized_domain)
    from public.ingestion_run_items run_item where run_item.id = item.ingestion_run_item_id;
  return query select resolved_decision_id, resolved_company_id;
end;
$$;

create or replace function public.reopen_review_item(
  candidate_review_queue_item_id uuid, candidate_supersedes_decision_id uuid, candidate_rationale_code text
) returns uuid language plpgsql security definer set search_path = '' as $$
declare reviewer_id uuid := public.require_reviewer(); item public.review_queue_items%rowtype; resolved_decision_id uuid;
begin
  if btrim(candidate_rationale_code) = '' then raise exception 'Rationale code is required' using errcode = '23514'; end if;
  select * into strict item from public.review_queue_items where id = candidate_review_queue_item_id for update;
  if item.status not in ('resolved', 'rejected') then raise exception 'Only a terminal Review Queue item can be reopened' using errcode = '55000'; end if;
  insert into public.review_decisions (review_queue_item_id, decision_type, actor_type, actor_identifier, rationale_code, supersedes_decision_id)
    values (item.id, 'reopened', 'user', reviewer_id::text, candidate_rationale_code, candidate_supersedes_decision_id)
    returning id into resolved_decision_id;
  update public.review_queue_items set status = 'reopened', resolved_at = null where id = item.id;
  insert into public.audit_events (event_type, actor_type, actor_identifier, ingestion_run_id, ingestion_run_item_id, source_id, review_queue_item_id, correlation_id, metadata)
    select 'review_reopened', 'user', reviewer_id::text, run_item.ingestion_run_id, item.ingestion_run_item_id,
      item.source_id, item.id, item.correlation_id, jsonb_build_object('rationaleCode', candidate_rationale_code, 'supersedesDecisionId', candidate_supersedes_decision_id)
    from public.ingestion_run_items run_item where run_item.id = item.ingestion_run_item_id;
  return resolved_decision_id;
end;
$$;

create or replace function public.supersede_review_item(
  candidate_review_queue_item_id uuid, candidate_replacement_context jsonb, candidate_rationale_code text
) returns uuid language plpgsql security definer set search_path = '' as $$
declare reviewer_id uuid := public.require_reviewer(); item public.review_queue_items%rowtype;
  decision_id uuid; previous_decision_id uuid; resolver_version text := candidate_replacement_context ->> 'resolverVersion';
begin
  if btrim(candidate_rationale_code) = '' or jsonb_typeof(candidate_replacement_context) <> 'object' or candidate_replacement_context - 'resolverVersion' <> '{}'::jsonb or coalesce(btrim(resolver_version), '') = '' then raise exception 'Privacy-safe replacement context is required' using errcode = '23514'; end if;
  select * into strict item from public.review_queue_items where id = candidate_review_queue_item_id for update;
  if item.status not in ('pending', 'claimed', 'reopened') then raise exception 'Review Queue item is not actionable' using errcode = '55000'; end if;
  select decision.id into previous_decision_id from public.review_decisions decision
    where decision.review_queue_item_id = item.id and not exists (select 1 from public.review_decisions successor where successor.supersedes_decision_id = decision.id)
    order by decision.created_at desc, decision.id desc limit 1;
  insert into public.review_decisions (review_queue_item_id, decision_type, actor_type, actor_identifier, rationale_code, supersedes_decision_id)
    values (item.id, 'superseded', 'user', reviewer_id::text, candidate_rationale_code, previous_decision_id)
    returning id into decision_id;
  update public.review_queue_items set status = 'superseded', resolved_at = now() where id = item.id;
  insert into public.audit_events (
    event_type, actor_type, actor_identifier, ingestion_run_id, ingestion_run_item_id,
    source_id, review_queue_item_id, correlation_id, metadata
  ) select 'review_superseded', 'user', reviewer_id::text, run_item.ingestion_run_id,
      item.ingestion_run_item_id, item.source_id, item.id, item.correlation_id,
      jsonb_build_object('rationaleCode', candidate_rationale_code, 'resolverVersion', resolver_version)
    from public.ingestion_run_items run_item where run_item.id = item.ingestion_run_item_id;
  return decision_id;
end;
$$;

create or replace function public.invalidate_company_signal_link(
  candidate_link_id uuid, candidate_supersedes_decision_id uuid, candidate_rationale_code text
) returns uuid language plpgsql security definer set search_path = '' as $$
declare reviewer_id uuid := public.require_reviewer(); item public.review_queue_items%rowtype; link public.company_signal_links%rowtype; decision_id uuid;
begin
  if btrim(candidate_rationale_code) = '' then raise exception 'Rationale code is required' using errcode = '23514'; end if;
  select review_item.* into strict item from public.review_decisions decision join public.review_queue_items review_item on review_item.id = decision.review_queue_item_id where decision.id = candidate_supersedes_decision_id;
  select * into strict link from public.company_signal_links where id = candidate_link_id for update;
  if link.created_by_decision_id is distinct from candidate_supersedes_decision_id then
    raise exception 'Decision does not own Company–Signal link' using errcode = '23503';
  end if;
  if link.valid_to is not null then raise exception 'Company–Signal link is already inactive' using errcode = '55000'; end if;
  insert into public.review_decisions (review_queue_item_id, decision_type, actor_type, actor_identifier, rationale_code, supersedes_decision_id)
    values (item.id, 'association_invalidated', 'user', reviewer_id::text, candidate_rationale_code, candidate_supersedes_decision_id) returning id into decision_id;
  update public.company_signal_links set valid_to = now(), invalidated_by_decision_id = decision_id where id = link.id;
  insert into public.audit_events (event_type, actor_type, actor_identifier, ingestion_run_id, ingestion_run_item_id, source_id, signal_id, company_id, review_queue_item_id, correlation_id, metadata)
    select 'association_invalidated', 'user', reviewer_id::text, run_item.ingestion_run_id, item.ingestion_run_item_id, item.source_id, link.signal_id, link.company_id, item.id, item.correlation_id, jsonb_build_object('rationaleCode', candidate_rationale_code) from public.ingestion_run_items run_item where run_item.id = item.ingestion_run_item_id;
  return decision_id;
end;
$$;

-- Review RPC grants are intentionally explicit.
revoke all on function public.require_reviewer() from public, anon, authenticated, service_role;
revoke all on function public.select_review_candidate(uuid, uuid, text) from public, anon, authenticated, service_role;
revoke all on function public.reject_review_item(uuid, text) from public, anon, authenticated, service_role;
revoke all on function public.create_company_from_review(uuid, text, text, text) from public, anon, authenticated, service_role;
revoke all on function public.reopen_review_item(uuid, uuid, text) from public, anon, authenticated, service_role;
revoke all on function public.supersede_review_item(uuid, jsonb, text) from public, anon, authenticated, service_role;
revoke all on function public.invalidate_company_signal_link(uuid, uuid, text) from public, anon, authenticated, service_role;
grant execute on function public.select_review_candidate(uuid, uuid, text) to authenticated;
grant execute on function public.reject_review_item(uuid, text) to authenticated;
grant execute on function public.create_company_from_review(uuid, text, text, text) to authenticated;
grant execute on function public.reopen_review_item(uuid, uuid, text) to authenticated;
grant execute on function public.supersede_review_item(uuid, jsonb, text) to authenticated;
grant execute on function public.invalidate_company_signal_link(uuid, uuid, text) to authenticated;
