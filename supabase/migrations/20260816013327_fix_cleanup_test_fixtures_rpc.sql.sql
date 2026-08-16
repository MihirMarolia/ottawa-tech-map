/*
# Fix cleanup_test_fixtures RPC to respect FK constraints

## Purpose
The previous version of cleanup_test_fixtures tried to delete signals
directly, but company_signal_links, ingestion_run_items, and audit_events
all have FK references to signals. The delete silently failed due to FK
constraint violations, leaving stale data between test runs.

## Changes
1. Replaces cleanup_test_fixtures with a version that deletes in FK-safe
   order: company_signal_links → ingestion_run_items → audit_events →
   signals → orphaned sources.

## Security
- Same SECURITY DEFINER pattern as before.
- search_path set to public.
- Execute granted to anon and authenticated.

## Notes
1. Uses CREATE OR REPLACE so the function signature stays the same.
2. The orphaned-source cleanup now uses a subquery on normalized_url
   matching the test fixture pattern, not display_name.
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
  test_signal_ids uuid[];
BEGIN
  -- Collect signal IDs to clean up
  SELECT array_agg(id) INTO test_signal_ids
  FROM signals
  WHERE external_reference LIKE external_reference_pattern;

  IF test_signal_ids IS NULL THEN
    RETURN 0;
  END IF;

  -- Delete child rows that reference signals
  DELETE FROM company_signal_links
  WHERE signal_id = ANY(test_signal_ids);

  DELETE FROM ingestion_run_items
  WHERE signal_id = ANY(test_signal_ids);

  DELETE FROM audit_events
  WHERE signal_id = ANY(test_signal_ids);

  -- Now safe to delete signals
  DELETE FROM signals
  WHERE id = ANY(test_signal_ids);

  GET DIAGNOSTICS deleted_signal_count = ROW_COUNT;

  -- Delete orphaned sources from test fixtures
  DELETE FROM sources
  WHERE NOT EXISTS (
    SELECT 1 FROM signals WHERE signals.source_id = sources.id
  )
  AND normalized_url LIKE '%contracts.example%';

  RETURN deleted_signal_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cleanup_test_fixtures(text)
  TO anon, authenticated;