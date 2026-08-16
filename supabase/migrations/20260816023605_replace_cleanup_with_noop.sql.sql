/*
# Replace cleanup_test_fixtures with no-op

## Purpose
The previous version of cleanup_test_fixtures used SET LOCAL
session_replication_role = replica to bypass the append-only audit_events
trigger. Per architectural review, the append-only invariant must be
preserved. Integration tests now use unique fixture identifiers per run
instead of destructive cleanup, so this function is no longer needed.

## Changes
1. Replaces cleanup_test_fixtures with a no-op that returns 0.
2. Retains execute grants for backward compatibility.

## Security
- The function is now harmless — it does nothing.
- No triggers are disabled, no data is modified.
*/

CREATE OR REPLACE FUNCTION public.cleanup_test_fixtures(
  external_reference_pattern text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cleanup_test_fixtures(text)
  TO anon, authenticated;