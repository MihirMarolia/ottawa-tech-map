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