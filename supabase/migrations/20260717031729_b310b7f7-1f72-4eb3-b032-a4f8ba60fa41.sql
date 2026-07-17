
-- 1) branches
DROP POLICY IF EXISTS branches_company_manage ON public.branches;
DROP POLICY IF EXISTS branches_company_read ON public.branches;
DROP POLICY IF EXISTS branches_staff_manage ON public.branches;
CREATE POLICY branches_company_read ON public.branches
  FOR SELECT TO authenticated
  USING (company_id = public.get_current_user_company_id());
CREATE POLICY branches_staff_manage ON public.branches
  FOR ALL TO authenticated
  USING (
    company_id = public.get_current_user_company_id()
    AND (public.has_role(auth.uid(),'owner'::app_role)
      OR public.has_role(auth.uid(),'admin'::app_role)
      OR public.has_role(auth.uid(),'manager'::app_role))
  )
  WITH CHECK (
    company_id = public.get_current_user_company_id()
    AND (public.has_role(auth.uid(),'owner'::app_role)
      OR public.has_role(auth.uid(),'admin'::app_role)
      OR public.has_role(auth.uid(),'manager'::app_role))
  );

-- 2) reviews
DROP POLICY IF EXISTS reviews_authenticated_read ON public.reviews;
CREATE POLICY reviews_authenticated_read ON public.reviews
  FOR SELECT TO authenticated
  USING (
    auth.uid() = customer_id
    OR public.has_role(auth.uid(),'owner'::app_role)
    OR public.has_role(auth.uid(),'admin'::app_role)
    OR public.has_role(auth.uid(),'manager'::app_role)
    OR public.has_role(auth.uid(),'staff'::app_role)
  );

-- 3) invoice_items
DROP POLICY IF EXISTS invoice_items_insert ON public.invoice_items;
DROP POLICY IF EXISTS invoice_items_read ON public.invoice_items;
DROP POLICY IF EXISTS invoice_items_insert_authenticated ON public.invoice_items;
CREATE POLICY invoice_items_insert_authenticated ON public.invoice_items
  FOR INSERT TO authenticated
  WITH CHECK (
    invoice_id IN (
      SELECT id FROM public.invoices
      WHERE created_by = auth.uid()
         OR public.has_role(auth.uid(),'admin'::app_role)
         OR public.has_role(auth.uid(),'owner'::app_role)
         OR public.has_role(auth.uid(),'manager'::app_role)
    )
  );

-- 4) daftra_sync_logs
DROP POLICY IF EXISTS "Admins can view all sync logs" ON public.daftra_sync_logs;
CREATE POLICY daftra_sync_logs_admin_read ON public.daftra_sync_logs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'owner'::app_role));

-- 5) technician_services
DROP POLICY IF EXISTS "Admins can manage technician services" ON public.technician_services;
CREATE POLICY technician_services_staff_manage ON public.technician_services
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'manager'::app_role) OR public.has_role(auth.uid(),'owner'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'manager'::app_role) OR public.has_role(auth.uid(),'owner'::app_role));

-- 6) wa_templates
DROP POLICY IF EXISTS "Admins can delete templates" ON public.wa_templates;
DROP POLICY IF EXISTS "Managers can create templates" ON public.wa_templates;
DROP POLICY IF EXISTS "Managers can update templates" ON public.wa_templates;
DROP POLICY IF EXISTS "Users can view own tenant templates" ON public.wa_templates;
CREATE POLICY wa_templates_tenant_read ON public.wa_templates
  FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT p.company_id FROM public.profiles p WHERE p.id = auth.uid()));

-- 7) wa_template_events
DROP POLICY IF EXISTS "Managers can insert events" ON public.wa_template_events;
DROP POLICY IF EXISTS "Users can view own tenant events" ON public.wa_template_events;
CREATE POLICY wa_template_events_tenant_read ON public.wa_template_events
  FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT p.company_id FROM public.profiles p WHERE p.id = auth.uid()));

-- 8) rate_items
DROP POLICY IF EXISTS rate_items_admin_delete ON public.rate_items;
DROP POLICY IF EXISTS rate_items_admin_insert ON public.rate_items;
DROP POLICY IF EXISTS rate_items_admin_update ON public.rate_items;
CREATE POLICY rate_items_admin_delete ON public.rate_items FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'owner'::app_role) OR public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'finance'::app_role));
CREATE POLICY rate_items_admin_insert ON public.rate_items FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'owner'::app_role) OR public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'finance'::app_role));
CREATE POLICY rate_items_admin_update ON public.rate_items FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'owner'::app_role) OR public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'finance'::app_role));

-- 9) malls
DROP POLICY IF EXISTS malls_admin_delete ON public.malls;
DROP POLICY IF EXISTS malls_admin_insert ON public.malls;
DROP POLICY IF EXISTS malls_admin_update ON public.malls;
CREATE POLICY malls_admin_delete ON public.malls FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'owner'::app_role) OR public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'manager'::app_role));
CREATE POLICY malls_admin_insert ON public.malls FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'owner'::app_role) OR public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'manager'::app_role));
CREATE POLICY malls_admin_update ON public.malls FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'owner'::app_role) OR public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'manager'::app_role));

-- 10) module_permissions (role column is text)
DROP POLICY IF EXISTS owner_manage_module_permissions ON public.module_permissions;
DROP POLICY IF EXISTS read_own_role_permissions ON public.module_permissions;
CREATE POLICY module_permissions_owner_manage ON public.module_permissions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'owner'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'owner'::app_role));
CREATE POLICY module_permissions_read_own ON public.module_permissions
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(),'owner'::app_role)
    OR public.has_role(auth.uid(),'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role::text = module_permissions.role
    )
  );
