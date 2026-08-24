/*
  Ticket 07A defect remediation discovered by Ticket 08C verification.

  PostgreSQL treats the apply_offering_proposal() output column `status` as a
  PL/pgSQL variable. The post-update status lookup therefore needs an explicit
  table qualification. This migration changes no state transitions, identities,
  fingerprints, RLS policies, grants, audit behavior, projections, or RPCs.
*/

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
  select public.offering_proposals.status into resolved_status
  from public.offering_proposals
  where id = proposal.id;

  insert into public.audit_events (event_type, actor_type, actor_identifier, company_id, signal_id, correlation_id, metadata)
  values ('offering_applied', 'service', 'offering-apply', proposal.company_id, proposal.signal_id, proposal.correlation_id,
    jsonb_build_object('proposalId', proposal.id, 'offeringId', resolved_offering_id));

  return query select resolved_offering_id, resolved_status;
end;
$$;
