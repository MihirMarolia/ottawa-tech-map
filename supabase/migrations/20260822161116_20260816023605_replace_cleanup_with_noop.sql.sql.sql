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