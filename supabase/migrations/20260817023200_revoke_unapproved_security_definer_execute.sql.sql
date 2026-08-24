/*
  Controlled write boundary remediation.

  Security-definer ingestion, cleanup, and offering lifecycle functions are
  server or reviewer operations. New functions otherwise receive PostgreSQL's
  default PUBLIC EXECUTE privilege, so grants must be narrowed explicitly.
*/

revoke update on public.ingestion_runs from anon, authenticated;

revoke execute on function public.create_ingestion_run(integer)
  from public, anon, authenticated;
grant execute on function public.create_ingestion_run(integer)
  to service_role;

revoke execute on function public.cleanup_test_fixtures(text)
  from public, anon, authenticated, service_role;

revoke execute on function public.persist_government_contract_item(
  uuid, text, uuid, uuid, text, text, text, text, date, text, text,
  integer, text, text, jsonb, numeric, text
) from public, anon, authenticated;
grant execute on function public.persist_government_contract_item(
  uuid, text, uuid, uuid, text, text, text, text, date, text, text,
  integer, text, text, jsonb, numeric, text
) to service_role;

revoke execute on function public.approve_offering_proposal(uuid, text, text)
  from public, anon;
grant execute on function public.approve_offering_proposal(uuid, text, text)
  to authenticated;

revoke execute on function public.reject_offering_proposal(uuid, text, text)
  from public, anon;
grant execute on function public.reject_offering_proposal(uuid, text, text)
  to authenticated;

revoke execute on function public.apply_offering_proposal(uuid)
  from public, anon, authenticated;
grant execute on function public.apply_offering_proposal(uuid)
  to service_role;
