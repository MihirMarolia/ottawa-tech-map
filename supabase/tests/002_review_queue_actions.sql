begin;
create extension if not exists pgtap with schema extensions;
select plan(19);

select has_function('public', 'select_review_candidate', array['uuid', 'uuid', 'text'], 'Candidate selection RPC exists');
select has_function('public', 'reject_review_item', array['uuid', 'text'], 'Review rejection RPC exists');
select has_function('public', 'create_company_from_review', array['uuid', 'text', 'text', 'text'], 'Reviewed Company creation RPC exists');
select has_function('public', 'reopen_review_item', array['uuid', 'uuid', 'text'], 'Review reopening RPC exists');
select has_function('public', 'supersede_review_item', array['uuid', 'jsonb', 'text'], 'Review supersession RPC exists');
select has_function('public', 'invalidate_company_signal_link', array['uuid', 'uuid', 'text'], 'Temporal association invalidation RPC exists');
select ok(not has_function_privilege('anon', 'public.select_review_candidate(uuid,uuid,text)', 'execute'), 'Anonymous role cannot execute review actions');
select ok(has_function_privilege('authenticated', 'public.select_review_candidate(uuid,uuid,text)', 'execute'), 'Authenticated role receives the guarded RPC');

insert into auth.users (id) values ('80000000-0000-0000-0000-000000000001');
insert into public.reviewer_memberships (user_id) values ('80000000-0000-0000-0000-000000000001');
insert into public.companies (id, canonical_name, canonical_domain) values
  ('80000000-0000-0000-0000-000000000002', 'Reviewed Candidate', 'reviewed-candidate.example');
insert into public.ingestion_runs (id, status, started_at, total_items) values
  ('80000000-0000-0000-0000-000000000003', 'running', now(), 3);
insert into public.ingestion_run_items (id, ingestion_run_id, item_key, correlation_id) values
  ('80000000-0000-0000-0000-000000000004', '80000000-0000-0000-0000-000000000003', 'select', '80000000-0000-0000-0000-000000000005'),
  ('80000000-0000-0000-0000-000000000006', '80000000-0000-0000-0000-000000000003', 'reject', '80000000-0000-0000-0000-000000000007'),
  ('80000000-0000-0000-0000-000000000008', '80000000-0000-0000-0000-000000000003', 'create', '80000000-0000-0000-0000-000000000009');
insert into public.review_queue_items (id, ingestion_run_item_id, reason_code, proposed_company_name, proposed_canonical_domain, signal_type, observed_date, schema_version, sanitized_proposal_version, sanitized_proposal, resolver_version, correlation_id) values
  ('80000000-0000-0000-0000-000000000010', '80000000-0000-0000-0000-000000000004', 'company_domain_ambiguous', null, null, 'government_contract_awarded', '2026-08-05', 'government-contract-signal/v1', 1, '{}', 'exact-domain/v1', '80000000-0000-0000-0000-000000000005'),
  ('80000000-0000-0000-0000-000000000011', '80000000-0000-0000-0000-000000000006', 'company_not_found', 'Rejected Proposal', 'rejected.example', 'government_contract_awarded', '2026-08-05', 'government-contract-signal/v1', 1, '{}', 'exact-domain/v1', '80000000-0000-0000-0000-000000000007'),
  ('80000000-0000-0000-0000-000000000012', '80000000-0000-0000-0000-000000000008', 'company_not_found', 'New Reviewed Company', 'new-reviewed.example', 'government_contract_awarded', '2026-08-05', 'government-contract-signal/v1', 1, '{}', 'exact-domain/v1', '80000000-0000-0000-0000-000000000009');
insert into public.review_queue_candidates (id, review_queue_item_id, company_id, candidate_rank, confidence_score, snapshot_name, snapshot_canonical_domain, snapshot_company_status, snapshot_match_basis) values
  ('80000000-0000-0000-0000-000000000013', '80000000-0000-0000-0000-000000000010', '80000000-0000-0000-0000-000000000002', 1, 0.8, 'Reviewed Candidate', 'reviewed-candidate.example', 'active', 'canonical_domain');

set local role authenticated;
select set_config('request.jwt.claim.sub', '80000000-0000-0000-0000-000000000001', true);
select lives_ok($$select * from public.select_review_candidate('80000000-0000-0000-0000-000000000010', '80000000-0000-0000-0000-000000000013', 'confirmed_domain')$$, 'Reviewer can select an active candidate');
select is((select status::text from public.reviewer_queue where id = '80000000-0000-0000-0000-000000000010'), 'resolved', 'Candidate selection resolves the Review Queue item');
select lives_ok($$select public.reopen_review_item('80000000-0000-0000-0000-000000000011', public.reject_review_item('80000000-0000-0000-0000-000000000011', 'unsupported_identity'), 'new_evidence')$$, 'Reviewer can reject and then reopen through append-only supersession');
select is((select status::text from public.reviewer_queue where id = '80000000-0000-0000-0000-000000000011'), 'reopened', 'Reopening restores an actionable Review Queue state');
select lives_ok($$select public.supersede_review_item('80000000-0000-0000-0000-000000000011', '{"resolverVersion":"exact-domain/v2"}', 'context_changed')$$, 'Reviewer can supersede frozen review context');
select lives_ok($$select * from public.create_company_from_review('80000000-0000-0000-0000-000000000012', 'New Reviewed Company', 'new-reviewed.example', 'verified_official_source')$$, 'Reviewer can explicitly create a Company');
reset role;
select set_config('test.company_decision_id', (select id::text from public.review_decisions where review_queue_item_id = '80000000-0000-0000-0000-000000000012' and decision_type = 'company_created'), true);
select set_config('test.other_decision_id', (select id::text from public.review_decisions where review_queue_item_id = '80000000-0000-0000-0000-000000000010' and decision_type = 'candidate_selected'), true);
insert into public.sources (id, display_name, source_url, normalized_url, content_hash) values ('80000000-0000-0000-0000-000000000014', 'Reviewed source', 'https://review.example/source', 'https://review.example/source', repeat('a', 64));
insert into public.signals (id, source_id, signal_type, observed_date, signal_discriminator, signal_fingerprint_version, fingerprint_canonical_input, signal_fingerprint, structured_payload, confidence_score, schema_version)
select '80000000-0000-0000-0000-000000000015', '80000000-0000-0000-0000-000000000014', 'government_contract_awarded', '2026-08-05', 'reviewed-contract', 1, fingerprint_input,
  encode(extensions.digest(convert_to(fingerprint_input, 'UTF8'), 'sha256'), 'hex'), '{"contractType":"professional_services","observedAt":"2026-08-05"}', 0.9, 'government-contract-signal/v1'
from (select public.government_contract_fingerprint_input('https://review.example/source', repeat('a', 64), '2026-08-05', null, 'reviewed-contract') as fingerprint_input) identity;
insert into public.company_signal_links (id, company_id, signal_id, created_by_decision_id)
select '80000000-0000-0000-0000-000000000016', company.id, '80000000-0000-0000-0000-000000000015', decision.id from public.companies company
join public.review_decisions decision on decision.review_queue_item_id = '80000000-0000-0000-0000-000000000012' and decision.decision_type = 'company_created' where company.canonical_domain = 'new-reviewed.example';
set local role authenticated;
select lives_ok($$select public.invalidate_company_signal_link('80000000-0000-0000-0000-000000000016', current_setting('test.company_decision_id')::uuid, 'wrong_company')$$, 'Reviewer invalidates attribution with a compensating decision');
select throws_ok($$select public.invalidate_company_signal_link('80000000-0000-0000-0000-000000000016', current_setting('test.other_decision_id')::uuid, 'wrong_review')$$, '23503', 'Decision does not own Company–Signal link', 'A decision cannot invalidate another review context association');
reset role;
select ok((select valid_to is not null and invalidated_by_decision_id is not null from public.company_signal_links where id = '80000000-0000-0000-0000-000000000016'), 'Compensating action closes the temporal Company–Signal link');

select is((select count(*)::integer from public.review_decisions where actor_identifier = '80000000-0000-0000-0000-000000000001'), 6, 'Each action appends one immutable Review Decision');
select is((select count(*)::integer from public.audit_events where actor_identifier = '80000000-0000-0000-0000-000000000001'), 7, 'Material review transitions append privacy-safe Audit Events');

select * from finish();
rollback;
