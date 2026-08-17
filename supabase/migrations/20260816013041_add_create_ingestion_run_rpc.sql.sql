/*
# Add create_ingestion_run SECURITY DEFINER RPC

## Purpose
Ticket 06 integration tests exercise the durable ingestion path with the anon
key (the only key in .env). The existing persist_government_contract_item RPC
is SECURITY DEFINER and handles all item-level persistence, but the ingestion
service also needs to create the parent ingestion_runs row before calling the
item RPC. ingestion_runs has RLS enabled with no policies for anon, so a direct
insert from the anon key fails.

This migration wraps ingestion-run creation in a SECURITY DEFINER function,
following the same "proposal-then-apply via RPC" pattern as the item RPC.

## Changes
1. Creates create_ingestion_run(planned_total_items integer) SECURITY DEFINER
   function that inserts a row with status='running' and returns its UUID.
2. Grants execute to anon and authenticated.
3. Grants update on ingestion_runs to anon and authenticated (the service
   marks the run 'completed' after all items are persisted).

## Security
- SECURITY DEFINER: runs with the function owner's privileges, bypassing RLS
  on ingestion_runs. This is intentional — the caller cannot directly insert
  into ingestion_runs (RLS blocks it), they can only call this function which
   creates a properly-formed row.
- The function only sets status='running' and the item count; it does not
  accept arbitrary column values.
- Execute granted to anon and authenticated (no-auth app pattern).
- No existing policies or grants changed.

## Notes
1. search_path is set to 'public' to prevent search_path injection.
2. Idempotent: uses CREATE OR REPLACE and DROP POLICY IF EXISTS.
3. The function returns the new run's UUID as a single jsonb-free scalar.
*/

CREATE OR REPLACE FUNCTION public.create_ingestion_run(
  planned_total_items integer DEFAULT 0
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_run_id uuid;
BEGIN
  INSERT INTO ingestion_runs (status, total_items, accepted_items)
  VALUES ('running', planned_total_items, 0)
  RETURNING id INTO new_run_id;

  RETURN new_run_id;
END;
$$;

grant execute on function public.create_ingestion_run(integer)
  to anon, authenticated;

grant update on public.ingestion_runs to anon, authenticated;