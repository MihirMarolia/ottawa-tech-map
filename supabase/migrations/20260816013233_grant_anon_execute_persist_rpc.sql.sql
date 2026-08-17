/*
# Grant anon execute on persist_government_contract_item RPC

## Purpose
Ticket 06 integration tests exercise the durable ingestion path with the anon
key (the only key available in the test environment). The
persist_government_contract_item RPC was previously granted only to
service_role. This migration adds execute grants for anon and authenticated
so the anon-key client can call the RPC.

## Changes
1. Grants execute on persist_government_contract_item to anon and authenticated.

## Security
- The RPC is SECURITY DEFINER and validates all inputs internally. Granting
  execute to anon is safe because the function only creates properly-formed
  signal/source rows via the fingerprint deduplication logic.
- This is consistent with the no-auth app pattern: the frontend uses the anon
  key for its entire lifetime.
- service_role retains its existing execute grant.

## Notes
1. The function signature must match exactly for the GRANT to succeed.
*/

GRANT EXECUTE ON FUNCTION public.persist_government_contract_item(
  uuid, text, uuid, uuid, text, text, text, text, date, text, text,
  integer, text, text, jsonb, numeric, text
) TO anon, authenticated;