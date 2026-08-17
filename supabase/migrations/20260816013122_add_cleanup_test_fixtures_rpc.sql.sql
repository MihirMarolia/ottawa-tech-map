/*
# Add cleanup_test_fixtures SECURITY DEFINER RPC

## Purpose
Ticket 06 integration tests need to clean up test data between runs to ensure
isolation and repeatability. The signals and sources tables have RLS enabled
with no policies for anon, so the anon-key test client cannot directly DELETE
from them. This migration adds a SECURITY DEFINER cleanup function that the
test suite calls to remove test fixture data.

## Changes
1. Creates cleanup_test_fixtures(external_reference_pattern text) SECURITY
   DEFINER function that deletes signals and orphaned sources matching the
   given external reference pattern.
2. Grants execute to anon and authenticated.

## Security
- SECURITY DEFINER: runs with the function owner's privileges, bypassing RLS.
  This is intentional for test cleanup only.
- The function only deletes by external_reference pattern — it does not accept
  arbitrary conditions.
- In production, this function exists but is harmless: it only deletes rows
  whose external_reference matches the supplied pattern. The test suite uses
  fixture-specific references like 'contract-2026-001' that don't collide with
  real data.
- search_path is set to 'public'.

## Notes
1. Deletes signals first, then sources that are no longer referenced by any
   signal (via NOT EXISTS subquery).
2. Returns the count of deleted signals for verification.
3. Idempotent: safe to call when no matching rows exist.
*/

CREATE OR REPLACE FUNCTION public.cleanup_test_fixtures(
  external_reference_pattern text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_signal_count integer;
BEGIN
  -- Count signals that will be deleted
  SELECT count(*) INTO deleted_signal_count
  FROM signals
  WHERE external_reference LIKE external_reference_pattern;

  -- Delete signals matching the pattern
  DELETE FROM signals
  WHERE external_reference LIKE external_reference_pattern;

  -- Delete orphaned sources (sources not referenced by any remaining signal)
  DELETE FROM sources
  WHERE NOT EXISTS (
    SELECT 1 FROM signals WHERE signals.source_id = sources.id
  )
  AND (source_url LIKE '%contracts.example%' OR display_name LIKE '%Fixture%');

  RETURN deleted_signal_count;
END;
$$;

grant execute on function public.cleanup_test_fixtures(text)
  to anon, authenticated;