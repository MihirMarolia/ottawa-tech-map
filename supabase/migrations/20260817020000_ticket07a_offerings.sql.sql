/*
  Ticket 07A: Company Products & Services Intelligence.

  Additive offering-specific path. Existing government-contract schema,
  fingerprinting, and proof RPC are intentionally unchanged.
*/

alter type public.review_reason_code add value if not exists 'company_not_found';

create type public.offering_kind as enum ('product', 'service');
create type public.offering_status as enum ('active', 'unknown');
create type public.offering_proposal_status as enum ('pending', 'approved', 'rejected', 'applied');

create table public.offerings (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  kind public.offering_kind not null,
  canonical_name text not null check (btrim(canonical_name) <> ''),
  description text,
  normalized_name text generated always as (lower(btrim(canonical_name))) stored,
  status public.offering_status not null default 'active',
  first_observed_at date,
  last_observed_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, kind, normalized_name)
);

create index offerings_company_idx on public.offerings(company_id, status, kind);
create index offerings_identity_idx on public.offerings(company_id, kind, normalized_name);

alter table public.review_queue_items
  add column review_deduplication_key text;
create unique index review_queue_offering_deduplication_unique
  on public.review_queue_items (review_deduplication_key)
  where review_deduplication_key is not null;

create table public.offering_proposals (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  kind public.offering_kind not null,
  proposed_name text not null check (btrim(proposed_name) <> ''),
  proposed_description text,
  proposed_status public.offering_status not null default 'active',
  observed_date date not null,
  evidence_type text not null check (evidence_type in (
    'official_product_page',
    'official_service_page',
    'official_company_page',
    'official_documentation',
    'official_press_release',
    'government_record',
    'other_primary_source'
  )),
  confidence_score numeric(5,4) not null check (confidence_score between 0 and 1),
  source_id uuid not null references public.sources(id) on delete restrict,
  signal_id uuid not null references public.signals(id) on delete restrict,
  proposal_fingerprint_version integer not null check (proposal_fingerprint_version > 0),
  proposal_fingerprint text not null check (proposal_fingerprint ~ '^[0-9a-f]{64}$'),
  status public.offering_proposal_status not null default 'pending',
  correlation_id uuid not null,
  approved_at timestamptz,
  rejected_at timestamptz,
  applied_at timestamptz,
  decision_actor_identifier text,
  decision_note text,
  created_at timestamptz not null default now(),
  unique (proposal_fingerprint_version, proposal_fingerprint),
  check (proposal_fingerprint = encode(extensions.digest(convert_to(
    format('%s|%s|%s|%s|%s|%s|%s', company_id, kind, proposed_name, coalesce(proposed_description, ''), observed_date, source_id, signal_id),
    'UTF8'
  ), 'sha256'), 'hex')),
  check ((status = 'approved' and approved_at is not null) or status <> 'approved'),
  check ((status = 'rejected' and rejected_at is not null) or status <> 'rejected'),
  check ((status = 'applied' and applied_at is not null and approved_at is not null) or status <> 'applied')
);

create index offering_proposals_status_idx on public.offering_proposals(status, created_at);
create index offering_proposals_company_idx on public.offering_proposals(company_id, kind, proposed_name);

create table public.offering_signal_links (
  id uuid primary key default gen_random_uuid(),
  offering_id uuid not null references public.offerings(id) on delete restrict,
  signal_id uuid not null references public.signals(id) on delete restrict,
  relationship_type text not null default 'evidence_for' check (relationship_type = 'evidence_for'),
  valid_from timestamptz not null default now(),
  valid_to timestamptz,
  created_by_proposal_id uuid not null references public.offering_proposals(id) on delete restrict,
  invalidated_by_proposal_id uuid references public.offering_proposals(id) on delete restrict,
  created_at timestamptz not null default now(),
  check ((valid_to is null and invalidated_by_proposal_id is null) or (valid_to is not null and invalidated_by_proposal_id is not null)),
  check (valid_to is null or valid_to >= valid_from)
);

create unique index offering_signal_links_active_unique
  on public.offering_signal_links(offering_id, signal_id, relationship_type)
  where valid_to is null;
create index offering_signal_links_offering_idx on public.offering_signal_links(offering_id, valid_to);

create or replace function public.offering_signal_fingerprint_input(
  candidate_company_id uuid,
  candidate_kind public.offering_kind,
  candidate_name text,
  candidate_description text,
  candidate_normalized_url text,
  candidate_content_hash text,
  candidate_observed_date date,
  candidate_signal_type text
)
returns text
language sql
immutable
set search_path = ''
as $$
  select format(
    '{"companyId":%s,"description":%s,"kind":%s,"name":%s,"observedDate":%s,"signalType":%s,"sourceIdentity":%s}',
    to_jsonb(candidate_company_id::text)::text,
    to_jsonb(coalesce(candidate_description, ''))::text,
    to_jsonb(candidate_kind::text)::text,
    to_jsonb(btrim(candidate_name))::text,
    to_jsonb(candidate_observed_date::text)::text,
    to_jsonb(candidate_signal_type)::text,
    to_jsonb(candidate_normalized_url || '|' || candidate_content_hash)::text
  );
$$;

create or replace function public.validate_offering_signal_payload(
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
  select
    jsonb_typeof(candidate_payload) = 'object'
    and candidate_schema_version = 'offering-signal/v1'
    and candidate_signal_type in ('product_added', 'service_added', 'product_changed', 'service_changed')
    and jsonb_typeof(candidate_payload -> 'kind') = 'string'
    and candidate_payload ->> 'kind' in ('product', 'service')
    and ((candidate_signal_type like 'product_%' and candidate_payload ->> 'kind' = 'product')
      or (candidate_signal_type like 'service_%' and candidate_payload ->> 'kind' = 'service'))
    and jsonb_typeof(candidate_payload -> 'name') = 'string'
    and btrim(candidate_payload ->> 'name') <> ''
    and jsonb_typeof(candidate_payload -> 'observedAt') = 'string'
    and candidate_payload ->> 'observedAt' = candidate_observed_date::text
    and jsonb_typeof(candidate_payload -> 'evidenceType') = 'string'
    and candidate_payload ->> 'evidenceType' in (
      'official_product_page', 'official_service_page', 'official_company_page',
      'official_documentation', 'official_press_release', 'government_record', 'other_primary_source'
    )
    and (not (candidate_payload ? 'description') or jsonb_typeof(candidate_payload -> 'description') = 'string');
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
    when candidate_signal_type = 'government_contract_awarded'
      and candidate_schema_version = 'government-contract-signal/v1'
      then jsonb_typeof(candidate_payload) = 'object'
        and jsonb_typeof(candidate_payload -> 'contractType') = 'string'
        and candidate_payload ->> 'contractType' = 'professional_services'
        and jsonb_typeof(candidate_payload -> 'observedAt') = 'string'
        and candidate_payload ->> 'observedAt' = candidate_observed_date::text
    when candidate_signal_type in ('product_added', 'service_added', 'product_changed', 'service_changed')
      then public.validate_offering_signal_payload(candidate_signal_type, candidate_schema_version, candidate_payload, candidate_observed_date)
    else false
  end;
$$;

alter table public.signals
  add constraint signals_offering_payload_check
  check (
    signal_type not in ('product_added', 'service_added', 'product_changed', 'service_changed')
    or public.validate_offering_signal_payload(signal_type, schema_version, structured_payload, observed_date)
  );

alter table public.audit_events drop constraint if exists audit_events_event_type_check;
alter table public.audit_events add constraint audit_events_event_type_check check (event_type in (
  'ingestion_item_started', 'source_resolved', 'signal_created', 'signal_already_processed',
  'review_required', 'ingestion_item_rejected', 'ingestion_item_failed', 'review_claimed',
  'review_candidate_selected', 'company_created_by_review', 'review_resolved', 'review_reopened',
  'audit_event_correction_recorded', 'offering_proposed', 'offering_proposal_approved',
  'offering_proposal_rejected', 'offering_applied'
));

create or replace function public.propose_offering_signal(
  candidate_ingestion_run_id uuid,
  candidate_item_key text,
  candidate_correlation_id uuid,
  candidate_company_id uuid,
  candidate_source_name text,
  candidate_source_url text,
  candidate_normalized_url text,
  candidate_content_hash text,
  candidate_observed_date date,
  candidate_kind public.offering_kind,
  candidate_name text,
  candidate_description text,
  candidate_evidence_type text,
  candidate_signal_type text,
  candidate_signal_fingerprint_version integer,
  candidate_signal_fingerprint_canonical_input text,
  candidate_signal_fingerprint text,
  candidate_proposal_fingerprint_version integer,
  candidate_confidence_score numeric,
  candidate_schema_version text
)
returns table (outcome text, proposal_id uuid, source_id uuid, signal_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  resolved_source_id uuid;
  resolved_signal_id uuid;
  resolved_proposal_id uuid;
  resolved_item_id uuid;
  payload jsonb;
  signal_was_created boolean;
  resolved_proposal_fingerprint text;
begin
  if not exists (select 1 from public.companies where id = candidate_company_id and status = 'active') then
    raise exception 'Company must already exist and be active' using errcode = '23503';
  end if;
  if candidate_signal_fingerprint_canonical_input <> public.offering_signal_fingerprint_input(
    candidate_company_id, candidate_kind, candidate_name, candidate_description,
    candidate_normalized_url, candidate_content_hash, candidate_observed_date, candidate_signal_type
  ) then
    raise exception 'Offering signal fingerprint canonical input does not match identity fields' using errcode = '23514';
  end if;

  payload := jsonb_build_object(
    'kind', candidate_kind::text,
    'name', btrim(candidate_name),
    'description', candidate_description,
    'evidenceType', candidate_evidence_type,
    'observedAt', candidate_observed_date::text
  );
  if not public.validate_offering_signal_payload(candidate_signal_type, candidate_schema_version, payload, candidate_observed_date) then
    raise exception 'Invalid offering signal payload' using errcode = '23514';
  end if;

  insert into public.ingestion_run_items (ingestion_run_id, item_key, correlation_id)
  values (candidate_ingestion_run_id, candidate_item_key, candidate_correlation_id)
  returning id into resolved_item_id;

  insert into public.sources (display_name, source_url, normalized_url, content_hash)
  values (candidate_source_name, candidate_source_url, candidate_normalized_url, candidate_content_hash)
  on conflict (normalized_url, content_hash) do nothing
  returning id into resolved_source_id;
  if resolved_source_id is null then
    select id into strict resolved_source_id from public.sources
    where normalized_url = candidate_normalized_url and content_hash = candidate_content_hash;
  end if;

  insert into public.signals (
    source_id, signal_type, observed_date, external_reference, signal_discriminator,
    signal_fingerprint_version, fingerprint_canonical_input, signal_fingerprint,
    structured_payload, confidence_score, schema_version
  ) values (
    resolved_source_id, candidate_signal_type, candidate_observed_date, null,
    btrim(candidate_name), candidate_signal_fingerprint_version,
    candidate_signal_fingerprint_canonical_input, candidate_signal_fingerprint,
    payload, candidate_confidence_score, candidate_schema_version
  ) on conflict (signal_fingerprint_version, signal_fingerprint) do nothing
  returning id into resolved_signal_id;
  signal_was_created := resolved_signal_id is not null;
  if resolved_signal_id is null then
    select id into strict resolved_signal_id from public.signals
    where signal_fingerprint_version = candidate_signal_fingerprint_version
      and signal_fingerprint = candidate_signal_fingerprint;
  end if;

  resolved_proposal_fingerprint := encode(extensions.digest(convert_to(
    format('%s|%s|%s|%s|%s|%s|%s', candidate_company_id, candidate_kind, btrim(candidate_name), coalesce(candidate_description, ''), candidate_observed_date, resolved_source_id, resolved_signal_id),
    'UTF8'
  ), 'sha256'), 'hex');

  insert into public.offering_proposals (
    company_id, kind, proposed_name, proposed_description, observed_date,
    evidence_type, confidence_score, source_id, signal_id,
    proposal_fingerprint_version, proposal_fingerprint, correlation_id
  ) values (
    candidate_company_id, candidate_kind, btrim(candidate_name), candidate_description,
    candidate_observed_date, candidate_evidence_type, candidate_confidence_score,
    resolved_source_id, resolved_signal_id, candidate_proposal_fingerprint_version,
    resolved_proposal_fingerprint, candidate_correlation_id
  ) on conflict (proposal_fingerprint_version, proposal_fingerprint) do nothing
  returning id into resolved_proposal_id;

  if resolved_proposal_id is null then
    select id into strict resolved_proposal_id from public.offering_proposals
    where proposal_fingerprint_version = candidate_proposal_fingerprint_version
      and proposal_fingerprint = resolved_proposal_fingerprint;
  end if;

  update public.ingestion_run_items
  set outcome = 'accepted_created', source_id = resolved_source_id, signal_id = resolved_signal_id,
      completed_at = now()
  where id = resolved_item_id;

  insert into public.audit_events (
    event_type, actor_type, actor_identifier, ingestion_run_id, ingestion_run_item_id,
    source_id, signal_id, company_id, correlation_id, metadata
  ) values (
    'offering_proposed', 'service', 'offering-ingestion', candidate_ingestion_run_id,
    resolved_item_id, resolved_source_id, resolved_signal_id, candidate_company_id,
    candidate_correlation_id, jsonb_build_object('proposalId', resolved_proposal_id, 'signalCreated', signal_was_created)
  );

  return query select case when signal_was_created then 'created' else 'already_processed' end,
    resolved_proposal_id, resolved_source_id, resolved_signal_id;
end;
$$;

create or replace function public.approve_offering_proposal(
  candidate_proposal_id uuid,
  candidate_actor_identifier text,
  candidate_note text
)
returns public.offering_proposal_status
language plpgsql
security definer
set search_path = ''
as $$
declare resolved_status public.offering_proposal_status;
begin
  if not public.is_reviewer() then raise exception 'Reviewer authorization required' using errcode = '42501'; end if;
  update public.offering_proposals
  set status = 'approved', approved_at = now(), decision_actor_identifier = candidate_actor_identifier, decision_note = candidate_note
  where id = candidate_proposal_id and status = 'pending'
  returning status into resolved_status;
  if resolved_status is null then
    select status into resolved_status from public.offering_proposals where id = candidate_proposal_id;
    if resolved_status is null then raise exception 'Offering proposal not found' using errcode = 'P0002'; end if;
    return resolved_status;
  end if;
  insert into public.audit_events (event_type, actor_type, actor_identifier, company_id, correlation_id, metadata)
  select 'offering_proposal_approved', 'user', candidate_actor_identifier, company_id, correlation_id,
    jsonb_build_object('proposalId', id)
  from public.offering_proposals where id = candidate_proposal_id;
  return resolved_status;
end;
$$;

create or replace function public.reject_offering_proposal(
  candidate_proposal_id uuid,
  candidate_actor_identifier text,
  candidate_note text
)
returns public.offering_proposal_status
language plpgsql
security definer
set search_path = ''
as $$
declare resolved_status public.offering_proposal_status;
begin
  if not public.is_reviewer() then raise exception 'Reviewer authorization required' using errcode = '42501'; end if;
  update public.offering_proposals
  set status = 'rejected', rejected_at = now(), decision_actor_identifier = candidate_actor_identifier, decision_note = candidate_note
  where id = candidate_proposal_id and status = 'pending'
  returning status into resolved_status;
  if resolved_status is null then
    select status into resolved_status from public.offering_proposals where id = candidate_proposal_id;
    if resolved_status is null then raise exception 'Offering proposal not found' using errcode = 'P0002'; end if;
    return resolved_status;
  end if;
  insert into public.audit_events (event_type, actor_type, actor_identifier, company_id, correlation_id, metadata)
  select 'offering_proposal_rejected', 'user', candidate_actor_identifier, company_id, correlation_id,
    jsonb_build_object('proposalId', id)
  from public.offering_proposals where id = candidate_proposal_id;
  return resolved_status;
end;
$$;

create or replace function public.persist_offering_company_not_found_review(
  candidate_ingestion_run_id uuid,
  candidate_item_key text,
  candidate_correlation_id uuid,
  candidate_review_deduplication_key text,
  candidate_company_name text,
  candidate_company_domain text,
  candidate_signal_type text,
  candidate_observed_date date,
  candidate_schema_version text,
  candidate_sanitized_proposal jsonb,
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
  resolved_review_item_id uuid;
begin
  insert into public.ingestion_run_items (ingestion_run_id, item_key, correlation_id)
  values (candidate_ingestion_run_id, candidate_item_key, candidate_correlation_id)
  returning id into resolved_item_id;

  insert into public.review_queue_items (
    ingestion_run_item_id,
    reason_code,
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
    btrim(candidate_company_name),
    lower(btrim(candidate_company_domain)),
    candidate_signal_type,
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
      review_queue_item_id = resolved_review_item_id,
      completed_at = now()
  where id = resolved_item_id;

  insert into public.audit_events (
    event_type,
    actor_type,
    actor_identifier,
    ingestion_run_id,
    ingestion_run_item_id,
    review_queue_item_id,
    correlation_id,
    metadata
  ) values (
    'review_required',
    'service',
    'offering-ingestion',
    candidate_ingestion_run_id,
    resolved_item_id,
    resolved_review_item_id,
    candidate_correlation_id,
    jsonb_build_object('reason', 'company_not_found', 'signalType', candidate_signal_type)
  );

  return query select resolved_review_item_id;
end;
$$;

create or replace function public.apply_offering_proposal(candidate_proposal_id uuid)
returns table (offering_id uuid, status public.offering_proposal_status)
language plpgsql
security definer
set search_path = ''
as $$
declare
  proposal public.offering_proposals%rowtype;
  resolved_offering_id uuid;
  resolved_status public.offering_proposal_status;
begin
  select * into strict proposal from public.offering_proposals where id = candidate_proposal_id;
  if proposal.status = 'applied' then
    select id into strict resolved_offering_id from public.offerings
    where company_id = proposal.company_id and kind = proposal.kind and normalized_name = lower(btrim(proposal.proposed_name));
    return query select resolved_offering_id, proposal.status;
    return;
  end if;
  if proposal.status <> 'approved' then raise exception 'Offering proposal must be approved before apply' using errcode = '55000'; end if;

  insert into public.offerings (company_id, kind, canonical_name, description, status, first_observed_at, last_observed_at)
  values (proposal.company_id, proposal.kind, proposal.proposed_name, proposal.proposed_description, proposal.proposed_status, proposal.observed_date, proposal.observed_date)
  on conflict (company_id, kind, normalized_name) do update
  set description = case when excluded.description is null then offerings.description else excluded.description end,
      status = excluded.status,
      first_observed_at = least(offerings.first_observed_at, excluded.first_observed_at),
      last_observed_at = greatest(offerings.last_observed_at, excluded.last_observed_at),
      updated_at = now()
  returning id into resolved_offering_id;

  insert into public.offering_signal_links (offering_id, signal_id, created_by_proposal_id)
  values (resolved_offering_id, proposal.signal_id, proposal.id)
  on conflict do nothing;

  update public.offering_proposals
  set status = 'applied', applied_at = now()
  where id = proposal.id;
  select status into resolved_status from public.offering_proposals where id = proposal.id;

  insert into public.audit_events (event_type, actor_type, actor_identifier, company_id, signal_id, correlation_id, metadata)
  values ('offering_applied', 'service', 'offering-apply', proposal.company_id, proposal.signal_id, proposal.correlation_id,
    jsonb_build_object('proposalId', proposal.id, 'offeringId', resolved_offering_id));

  return query select resolved_offering_id, resolved_status;
end;
$$;

create view public.public_company_offerings
with (security_barrier = true)
as
select
  company.canonical_name as company_name,
  company.canonical_domain,
  offering.kind,
  offering.canonical_name as offering_name,
  offering.description,
  offering.status,
  offering.first_observed_at,
  offering.last_observed_at,
  signal.signal_type,
  signal.observed_date,
  signal.confidence_score,
  signal.structured_payload ->> 'evidenceType' as evidence_type,
  source.display_name as source_name,
  source.source_url
from public.offerings as offering
join public.companies as company on company.id = offering.company_id
left join public.offering_signal_links as offering_link on offering_link.offering_id = offering.id and offering_link.valid_to is null
left join public.signals as signal on signal.id = offering_link.signal_id
left join public.sources as source on source.id = signal.source_id
where company.status = 'active';

comment on view public.public_company_offerings is
  'Privacy-safe public offering projection; excludes internal IDs, proposal state, fingerprints, run metadata, audit metadata, review data, and raw payloads.';

alter table public.offerings enable row level security;
alter table public.offering_proposals enable row level security;
alter table public.offering_signal_links enable row level security;

grant select on public.public_company_offerings to anon, authenticated;
revoke execute on function public.persist_offering_company_not_found_review(uuid, text, uuid, text, text, text, text, date, text, jsonb, text, text) from public, anon, authenticated;
grant execute on function public.persist_offering_company_not_found_review(uuid, text, uuid, text, text, text, text, date, text, jsonb, text, text) to service_role;
revoke execute on function public.propose_offering_signal(
  uuid, text, uuid, uuid, text, text, text, text, date, public.offering_kind, text, text, text, text,
  integer, text, text, integer, numeric, text
) from public, anon, authenticated;
grant execute on function public.propose_offering_signal(
  uuid, text, uuid, uuid, text, text, text, text, date, public.offering_kind, text, text, text, text,
  integer, text, text, integer, numeric, text
) to service_role;
grant execute on function public.approve_offering_proposal(uuid, text, text) to authenticated;
grant execute on function public.reject_offering_proposal(uuid, text, text) to authenticated;
grant execute on function public.apply_offering_proposal(uuid) to service_role;
