
-- rate_items: restrict SELECT to finance/staff/admin roles
DROP POLICY IF EXISTS rate_items_auth_read ON public.rate_items;
CREATE POLICY rate_items_staff_read ON public.rate_items
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'owner'::app_role)
    OR public.has_role(auth.uid(), 'manager'::app_role)
    OR public.has_role(auth.uid(), 'finance'::app_role)
    OR public.has_role(auth.uid(), 'staff'::app_role)
  );

-- technician_coverage: restrict SELECT to owning technician or staff
DROP POLICY IF EXISTS coverage_authenticated_read ON public.technician_coverage;
CREATE POLICY coverage_owner_or_staff_read ON public.technician_coverage
  FOR SELECT TO authenticated
  USING (
    technician_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'owner'::app_role)
    OR public.has_role(auth.uid(), 'manager'::app_role)
    OR public.has_role(auth.uid(), 'dispatcher'::app_role)
    OR public.has_role(auth.uid(), 'staff'::app_role)
  );

-- technician_services: restrict SELECT to owning technician or staff
DROP POLICY IF EXISTS tech_services_authenticated_read ON public.technician_services;
CREATE POLICY tech_services_owner_or_staff_read ON public.technician_services
  FOR SELECT TO authenticated
  USING (
    technician_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'owner'::app_role)
    OR public.has_role(auth.uid(), 'manager'::app_role)
    OR public.has_role(auth.uid(), 'dispatcher'::app_role)
    OR public.has_role(auth.uid(), 'staff'::app_role)
  );
