DROP POLICY IF EXISTS "read_districts_authenticated" ON public.districts;
DROP POLICY IF EXISTS "expenses_insert_auth" ON public.expenses;
CREATE POLICY "expenses_insert_own" ON public.expenses FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());