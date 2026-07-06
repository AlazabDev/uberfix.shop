
DROP POLICY IF EXISTS "cities_admin" ON public.cities;
CREATE POLICY "cities_admin" ON public.cities
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "All users can view role_permissions" ON public.role_permissions;
CREATE POLICY "Authenticated can view role_permissions" ON public.role_permissions
  FOR SELECT TO authenticated
  USING (true);
