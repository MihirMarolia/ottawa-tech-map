create extension if not exists pgcrypto with schema extensions;

create type public.company_status as enum ('active', 'inactive', 'merged', 'disputed');
create type public.ingestion_run_status as enum ('pending', 'running', 'completed', 'completed_with_errors', 'failed');
create type public.ingestion_item_outcome as enum ('pending', 'accepted_created', 'accepted_already_processed', 'review_required', 'rejected', 'failed');
create type public.review_status as enum ('pending', 'claimed', 'resolved', 'reopened', 'superseded', 'rejected');
create type public.review_reason_code as enum (
  'company_not_found',
  'company_domain_ambiguous',
  'company_identifier_conflict',
  'company_domain_invalid',
  'company_record_inactive',
  'conflicting_evidence',
  'low_confidence'
);
create type public.review_decision_type as enum (
  'candidate_selected',
  'rejected',
  'company_created',
  'reopened',
  'superseded',
  'association_invalidated'
);
create type public.audit_actor_type as enum ('system', 'service', 'user');
create type public.ingestion_failure_category as enum (
  'database_unavailable',
  'transaction_timeout',
  'deadlock_detected',
  'serialization_failure',
  'constraint_violation',
  'function_contract_violation',
  'authorization_failure',
  'schema_version_unsupported',
  'payload_validation_failure',
  'source_resolution_failure',
  'company_resolution_failure',
  'signal_persistence_failure',
  'audit_persistence_failure',
  'unexpected_internal_error'
);

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  canonical_name text not null check (btrim(canonical_name) <> ''),
  canonical_domain text,
  status public.company_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    canonical_domain is null
    or (
      canonical_domain = lower(btrim(canonical_domain))
      and canonical_domain !~ '[/:#?[:space:]]'
      and canonical_domain <> ''
    )
  )
);

create unique index companies_active_canonical_domain_unique
  on public.companies (canonical_domain)
  where status = 'active' and canonical_domain is not null;
create index companies_canonical_domain_idx on public.companies (canonical_domain);

create table public.sources (
  id uuid primary key default gen_random_uuid(),
  display_name text not null check (btrim(display_name) <> ''),
  source_url text not null check (source_url ~ '^https?://'),
  normalized_url text not null check (normalized_url ~ '^https?://' and normalized_url !~ '#'),
  content_hash text not null check (content_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  unique (normalized_url, content_hash)
);

create index sources_identity_idx on public.sources (normalized_url, content_hash);

create table public.ingestion_runs (
  id uuid primary key default gen_random_uuid(),
  status public.ingestion_run_status not null default 'pending',
  started_at timestamptz,
  completed_at timestamptz,
  total_items integer not null default 0 check (total_items >= 0),
  accepted_items integer not null default 0 check (accepted_items >= 0),
  review_items integer not null default 0 check (review_items >= 0),
  rejected_items integer not null default 0 check (rejected_items >= 0),
  failed_items integer not null default 0 check (failed_items >= 0),
  created_at timestamptz not null default now(),
  check (completed_at is null or started_at is not null),
  check (completed_at is null or completed_at >= started_at)
);

create table public.ingestion_run_items (
  id uuid primary key default gen_random_uuid(),
  ingestion_run_id uuid not null references public.ingestion_runs(id) on delete restrict,
  item_key text not null check (btrim(item_key) <> ''),
  outcome public.ingestion_item_outcome not null default 'pending',
  correlation_id uuid not null,
  source_id uuid,
  signal_id uuid,
  review_queue_item_id uuid,
  rejection_code text,
  failure_category public.ingestion_failure_category,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (ingestion_run_id, item_key),
  check ((outcome = 'rejected' and rejection_code is not null) or (outcome <> 'rejected' and rejection_code is null)),
  check ((outcome = 'failed' and failure_category is not null) or (outcome <> 'failed' and failure_category is null)),
  check ((outcome = 'pending' and completed_at is null) or (outcome <> 'pending' and completed_at is not null))
);

create index ingestion_run_items_run_idx on public.ingestion_run_items (ingestion_run_id, outcome);
create index ingestion_run_items_correlation_idx on public.ingestion_run_items (correlation_id);

create or replace function public.validate_signal_payload(
  candidate_signal_type text,
  candidate_schema_version text,
  candidate_payload jsonb
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
        and (candidate_payload ->> 'observedAt') ~ '^\d{4}-\d{2}-\d{2}$'
    else false
  end;
$$;

create table public.signals (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.sources(id) on delete restrict,
  signal_type text not null check (btrim(signal_type) <> ''),
  observed_date date not null,
  external_reference text,
  signal_discriminator text not null check (btrim(signal_discriminator) <> ''),
  signal_fingerprint_version integer not null check (signal_fingerprint_version > 0),
  fingerprint_canonical_input text not null check (fingerprint_canonical_input <> ''),
  signal_fingerprint text not null check (signal_fingerprint ~ '^[0-9a-f]{64}$'),
  structured_payload jsonb not null,
  confidence_score numeric(5,4) not null check (confidence_score between 0 and 1),
  schema_version text not null check (btrim(schema_version) <> ''),
  created_at timestamptz not null default now(),
  unique (signal_fingerprint_version, signal_fingerprint),
  check (signal_fingerprint = encode(extensions.digest(convert_to(fingerprint_canonical_input, 'UTF8'), 'sha256'), 'hex')),
  check (public.validate_signal_payload(signal_type, schema_version, structured_payload))
);

create index signals_identity_idx on public.signals (signal_fingerprint_version, signal_fingerprint);
create index signals_source_idx on public.signals (source_id);


create table public.review_queue_items (
  id uuid primary key default gen_random_uuid(),
  ingestion_run_item_id uuid not null unique references public.ingestion_run_items(id) on delete restrict,
  reason_code public.review_reason_code not null,
  status public.review_status not null default 'pending',
  source_id uuid references public.sources(id) on delete restrict,
  proposed_company_name text,
  proposed_canonical_domain text,
  signal_type text not null,
  observed_date date not null,
  schema_version text not null,
  sanitized_proposal_version integer not null check (sanitized_proposal_version > 0),
  sanitized_proposal jsonb not null check (jsonb_typeof(sanitized_proposal) = 'object'),
  resolver_version text not null,
  resolver_rationale text,
  correlation_id uuid not null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  check (proposed_canonical_domain is null or proposed_canonical_domain = lower(btrim(proposed_canonical_domain))),
  check (
    (status in ('resolved', 'superseded', 'rejected') and resolved_at is not null)
    or (status in ('pending', 'claimed', 'reopened') and resolved_at is null)
  )
);

create index review_queue_status_idx on public.review_queue_items (status, created_at);

create table public.review_queue_candidates (
  id uuid primary key default gen_random_uuid(),
  review_queue_item_id uuid not null references public.review_queue_items(id) on delete restrict,
  company_id uuid references public.companies(id) on delete restrict,
  candidate_rank integer not null check (candidate_rank > 0),
  confidence_score numeric(5,4) not null check (confidence_score between 0 and 1),
  snapshot_name text not null check (btrim(snapshot_name) <> ''),
  snapshot_canonical_domain text,
  snapshot_company_status public.company_status,
  snapshot_match_basis text not null check (btrim(snapshot_match_basis) <> ''),
  snapshot_explanation text,
  created_at timestamptz not null default now(),
  unique (review_queue_item_id, candidate_rank),
  unique nulls not distinct (review_queue_item_id, company_id)
);

create table public.review_decisions (
  id uuid primary key default gen_random_uuid(),
  review_queue_item_id uuid not null references public.review_queue_items(id) on delete restrict,
  decision_type public.review_decision_type not null,
  selected_candidate_id uuid references public.review_queue_candidates(id) on delete restrict,
  actor_type public.audit_actor_type not null,
  actor_identifier text not null check (btrim(actor_identifier) <> ''),
  rationale_code text not null check (btrim(rationale_code) <> ''),
  rationale_note text,
  supersedes_decision_id uuid references public.review_decisions(id) on delete restrict,
  created_at timestamptz not null default now(),
  check ((decision_type = 'candidate_selected' and selected_candidate_id is not null) or decision_type <> 'candidate_selected'),
  check (supersedes_decision_id is null or supersedes_decision_id <> id)
);

create unique index review_decisions_supersedes_once
  on public.review_decisions (supersedes_decision_id)
  where supersedes_decision_id is not null;

create table public.company_signal_links (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  signal_id uuid not null references public.signals(id) on delete restrict,
  relationship_type text not null default 'evidence_for' check (relationship_type = 'evidence_for'),
  valid_from timestamptz not null default now(),
  valid_to timestamptz,
  created_by_ingestion_item_id uuid references public.ingestion_run_items(id) on delete restrict,
  created_by_decision_id uuid references public.review_decisions(id) on delete restrict,
  invalidated_by_decision_id uuid references public.review_decisions(id) on delete restrict,
  created_at timestamptz not null default now(),
  check (num_nonnulls(created_by_ingestion_item_id, created_by_decision_id) = 1),
  check (
    (valid_to is null and invalidated_by_decision_id is null)
    or (valid_to is not null and invalidated_by_decision_id is not null)
  ),
  check (valid_to is null or valid_to >= valid_from)
);

create unique index company_signal_links_active_unique
  on public.company_signal_links (company_id, signal_id, relationship_type)
  where valid_to is null;
create index company_signal_links_company_idx on public.company_signal_links (company_id, valid_to);

alter table public.ingestion_run_items
  add constraint ingestion_run_items_source_fk foreign key (source_id) references public.sources(id) on delete restrict,
  add constraint ingestion_run_items_signal_fk foreign key (signal_id) references public.signals(id) on delete restrict,
  add constraint ingestion_run_items_review_fk foreign key (review_queue_item_id) references public.review_queue_items(id) on delete restrict;

create table public.reviewer_memberships (
  user_id uuid primary key references auth.users(id) on delete restrict,
  granted_at timestamptz not null default now(),
  granted_by uuid references auth.users(id) on delete restrict
);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (event_type in (
    'ingestion_item_started',
    'source_resolved',
    'signal_created',
    'signal_already_processed',
    'review_required',
    'ingestion_item_rejected',
    'ingestion_item_failed',
    'review_claimed',
    'review_candidate_selected',
    'company_created_by_review',
    'review_resolved',
    'review_reopened',
    'audit_event_correction_recorded'
  )),
  actor_type public.audit_actor_type not null,
  actor_identifier text,
  ingestion_run_id uuid references public.ingestion_runs(id) on delete restrict,
  ingestion_run_item_id uuid references public.ingestion_run_items(id) on delete restrict,
  source_id uuid references public.sources(id) on delete restrict,
  signal_id uuid references public.signals(id) on delete restrict,
  company_id uuid references public.companies(id) on delete restrict,
  review_queue_item_id uuid references public.review_queue_items(id) on delete restrict,
  corrects_audit_event_id uuid references public.audit_events(id) on delete restrict,
  correlation_id uuid not null,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  occurred_at timestamptz not null default now(),
  check (event_type = 'audit_event_correction_recorded' or corrects_audit_event_id is null),
  check (event_type <> 'audit_event_correction_recorded' or corrects_audit_event_id is not null)
);

create index audit_events_ingestion_item_idx on public.audit_events (ingestion_run_item_id, occurred_at);
create index audit_events_correlation_idx on public.audit_events (correlation_id);

create or replace function public.prevent_append_only_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception '% is append-only', tg_table_name using errcode = '55000';
end;
$$;

create trigger audit_events_append_only
  before update or delete on public.audit_events
  for each row execute function public.prevent_append_only_mutation();
create trigger review_decisions_append_only
  before update or delete on public.review_decisions
  for each row execute function public.prevent_append_only_mutation();
create trigger review_candidates_immutable
  before update or delete on public.review_queue_candidates
  for each row execute function public.prevent_append_only_mutation();


create or replace function public.is_reviewer()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.reviewer_memberships where user_id = auth.uid()
  );
$$;

create view public.public_company_evidence
with (security_barrier = true)
as
select
  company.canonical_name as company_name,
  company.canonical_domain,
  signal.signal_type,
  signal.observed_date,
  signal.confidence_score,
  signal.schema_version,
  signal.structured_payload ->> 'contractType' as contract_type,
  source.display_name as source_name,
  source.source_url
from public.company_signal_links as link
join public.companies as company on company.id = link.company_id
join public.signals as signal on signal.id = link.signal_id
join public.sources as source on source.id = signal.source_id
where link.valid_to is null and company.status = 'active';

create view public.reviewer_queue
with (security_barrier = true)
as
select
  item.id,
  item.reason_code,
  item.status,
  item.source_id,
  item.proposed_company_name,
  item.proposed_canonical_domain,
  item.signal_type,
  item.observed_date,
  item.schema_version,
  item.sanitized_proposal,
  item.resolver_version,
  item.resolver_rationale,
  item.created_at
from public.review_queue_items as item
where public.is_reviewer();

comment on view public.public_company_evidence is
  'Privacy-safe public Evidence projection; excludes internal IDs, fingerprints, run metadata, Review Queue data, and unrestricted payloads.';
comment on function public.is_reviewer() is
  'Reviewer authorization supplements the broad authenticated role.';


create or replace function public.persist_government_contract_item(
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
  resolved_source_id uuid;
  resolved_signal_id uuid;
  resolved_item_id uuid;
  signal_was_created boolean;
  resolved_outcome public.ingestion_item_outcome;
begin
  if not exists (
    select 1 from public.companies
    where id = candidate_company_id and status = 'active'
  ) then
    raise exception 'Company must already exist and be active' using errcode = '23503';
  end if;

  insert into public.ingestion_run_items (ingestion_run_id, item_key, correlation_id)
  values (candidate_ingestion_run_id, candidate_item_key, candidate_correlation_id)
  returning id into resolved_item_id;

  insert into public.sources (display_name, source_url, normalized_url, content_hash)
  values (candidate_source_name, candidate_source_url, candidate_normalized_url, candidate_content_hash)
  on conflict (normalized_url, content_hash) do nothing
  returning id into resolved_source_id;

  if resolved_source_id is null then
    select id into strict resolved_source_id
    from public.sources
    where normalized_url = candidate_normalized_url and content_hash = candidate_content_hash;
  end if;

  insert into public.signals (
    source_id,
    signal_type,
    observed_date,
    external_reference,
    signal_discriminator,
    signal_fingerprint_version,
    fingerprint_canonical_input,
    signal_fingerprint,
    structured_payload,
    confidence_score,
    schema_version
  )
  values (
    resolved_source_id,
    'government_contract_awarded',
    candidate_observed_date,
    candidate_external_reference,
    candidate_signal_discriminator,
    candidate_fingerprint_version,
    candidate_fingerprint_canonical_input,
    candidate_signal_fingerprint,
    candidate_structured_payload,
    candidate_confidence_score,
    candidate_schema_version
  )
  on conflict (signal_fingerprint_version, signal_fingerprint) do nothing
  returning id into resolved_signal_id;

  signal_was_created := resolved_signal_id is not null;

  if not signal_was_created then
    select id into strict resolved_signal_id
    from public.signals
    where signal_fingerprint_version = candidate_fingerprint_version
      and signal_fingerprint = candidate_signal_fingerprint;
  end if;

  insert into public.company_signal_links (
    company_id,
    signal_id,
    created_by_ingestion_item_id
  )
  values (candidate_company_id, resolved_signal_id, resolved_item_id)
  on conflict do nothing;

  resolved_outcome := case
    when signal_was_created then 'accepted_created'::public.ingestion_item_outcome
    else 'accepted_already_processed'::public.ingestion_item_outcome
  end;

  update public.ingestion_run_items
  set outcome = resolved_outcome,
      source_id = resolved_source_id,
      signal_id = resolved_signal_id,
      completed_at = now()
  where id = resolved_item_id;

  insert into public.audit_events (
    event_type,
    actor_type,
    actor_identifier,
    ingestion_run_id,
    ingestion_run_item_id,
    source_id,
    signal_id,
    company_id,
    correlation_id,
    metadata
  )
  values (
    case when signal_was_created then 'signal_created' else 'signal_already_processed' end,
    'service',
    'government-contract-ingestion',
    candidate_ingestion_run_id,
    resolved_item_id,
    resolved_source_id,
    resolved_signal_id,
    candidate_company_id,
    candidate_correlation_id,
    jsonb_build_object('outcome', resolved_outcome)
  );

  return query select resolved_outcome, resolved_source_id, resolved_signal_id;
end;
$$;

comment on function public.persist_government_contract_item(
  uuid, text, uuid, uuid, text, text, text, text, date, text, text,
  integer, text, text, jsonb, numeric, text
) is
  'Ticket 05 proof RPC: atomically converges Source, Signal, active Company attribution, ingestion outcome, and Audit Event.';


alter table public.companies enable row level security;
alter table public.sources enable row level security;
alter table public.signals enable row level security;
alter table public.company_signal_links enable row level security;
alter table public.ingestion_runs enable row level security;
alter table public.ingestion_run_items enable row level security;
alter table public.review_queue_items enable row level security;
alter table public.review_queue_candidates enable row level security;
alter table public.review_decisions enable row level security;
alter table public.audit_events enable row level security;
alter table public.reviewer_memberships enable row level security;

revoke all on all tables in schema public from anon, authenticated, service_role;
revoke all on all functions in schema public from public, anon, authenticated, service_role;

grant select on public.public_company_evidence to anon, authenticated;
grant select on public.reviewer_queue to authenticated;
grant execute on function public.is_reviewer() to authenticated;
grant execute on function public.persist_government_contract_item(
  uuid, text, uuid, uuid, text, text, text, text, date, text, text,
  integer, text, text, jsonb, numeric, text
) to service_role;
