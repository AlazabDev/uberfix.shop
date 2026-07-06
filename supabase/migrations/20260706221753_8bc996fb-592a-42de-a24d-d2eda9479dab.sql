
DROP POLICY IF EXISTS tp_select_strict ON public.technician_profiles;
CREATE POLICY tp_select_strict ON public.technician_profiles FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR has_role(auth.uid(), 'owner'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'manager'::app_role)
  );
