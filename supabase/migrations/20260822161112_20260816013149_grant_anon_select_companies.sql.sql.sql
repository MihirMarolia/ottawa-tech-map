GRANT SELECT ON public.companies TO anon, authenticated;

DROP POLICY IF EXISTS "anon_select_companies" ON public.companies;

CREATE POLICY "anon_select_companies"
  ON public.companies FOR SELECT
  TO anon, authenticated
  USING (true);