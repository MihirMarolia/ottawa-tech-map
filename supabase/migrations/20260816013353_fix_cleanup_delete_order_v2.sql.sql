/*
# Fix cleanup_test_fixtures RPC delete order (round 2)

## Purpose
audit_events has FK to ingestion_run_items, so ingestion_run_items cannot be
deleted before audit_events. This migration fixes the delete order to:
audit_events → company_signal_links → ingestion_run_items → signals → sources.

## Changes
1. Replaces cleanup_test_fixtures with corrected delete order.

## Security
- Same SECURITY DEFINER pattern.
- search_path set to public.
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
  SELECT array_agg(id) INTO test_signal_ids
  FROM signals
  WHERE external_reference LIKE external_reference_pattern;

  IF test_signal_ids IS NULL THEN
    RETURN 0;
  END IF;

  -- Delete audit_events first (FK to ingestion_run_items and signals)
  DELETE FROM audit_events
  WHERE signal_id = ANY(test_signal_ids);

  -- Delete company_signal_links (FK to signals)
  DELETE FROM company_signal_links
  WHERE signal_id = ANY(test_signal_ids);

  -- Delete ingestion_run_items (FK to signals and sources)
  DELETE FROM ingestion_run_items
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