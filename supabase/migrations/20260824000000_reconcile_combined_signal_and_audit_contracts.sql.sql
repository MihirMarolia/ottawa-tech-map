-- Reconcile signal and audit contracts after integrating the independently delivered
-- review-queue, job-posting, and offering migrations. This is intentionally additive:
-- each earlier migration remains historically reproducible, while the final combined
-- schema accepts every governed signal and audit event type it now emits.

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
        and jsonb_typeof(candidate_payload -> 'observedAt') = 'string'
        and candidate_payload ->> 'observedAt' = candidate_observed_date::text
        and not exists (
          select 1 from jsonb_object_keys(candidate_payload) key
          where key not in (
            'jobTitle', 'location', 'postingDate', 'technologies',
            'securityClearanceRequired', 'bilingualRequired', 'employmentType',
            'expansionEvidence', 'observedAt'
          )
        )
    when candidate_signal_type in ('product_added', 'service_added', 'product_changed', 'service_changed')
      then public.validate_offering_signal_payload(
        candidate_signal_type,
        candidate_schema_version,
        candidate_payload,
        candidate_observed_date
      )
    else false
  end;
$$;

alter table public.audit_events drop constraint if exists audit_events_event_type_check;
alter table public.audit_events add constraint audit_events_event_type_check check (event_type in (
  'ingestion_item_started', 'source_resolved', 'signal_created', 'signal_already_processed',
  'review_required', 'ingestion_item_rejected', 'ingestion_item_failed', 'review_claimed',
  'review_candidate_selected', 'company_created_by_review', 'review_resolved', 'review_rejected',
  'review_reopened', 'review_superseded', 'association_invalidated', 'audit_event_correction_recorded',
  'offering_proposed', 'offering_proposal_approved', 'offering_proposal_rejected', 'offering_applied'
));

-- Public company discovery is served through public_company_profiles and the
-- approved profile RPC. Do not expose the canonical persistence table or its
-- internal UUIDs through anonymous/authenticated direct table reads.
revoke select on table public.companies from anon, authenticated;
drop policy if exists "anon_select_companies" on public.companies;
