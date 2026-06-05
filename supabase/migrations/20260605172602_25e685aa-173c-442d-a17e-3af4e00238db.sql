
-- 1) app_settings
DROP POLICY IF EXISTS app_settings_select_admin_auth ON public.app_settings;
DROP POLICY IF EXISTS app_settings_select_owner ON public.app_settings;
DROP POLICY IF EXISTS app_settings_update_admin_auth ON public.app_settings;
CREATE POLICY app_settings_select_owner_only
  ON public.app_settings FOR SELECT TO authenticated
  USING (public.is_owner_email());

CREATE OR REPLACE VIEW public.v_app_settings_safe
WITH (security_invoker = false) AS
SELECT
  id, app_name, app_logo_url, company_email, company_phone, company_address,
  default_currency, timezone, default_language, allow_self_registration,
  max_execution_time, allow_edit_after_start, require_manager_approval,
  show_technicians_on_map, enable_technician_rating, allow_technician_quotes,
  notification_types, enable_email_notifications, enable_sms_notifications,
  enable_in_app_notifications, enable_reminders, notification_templates,
  theme_mode, primary_color, secondary_color, background_color, map_style,
  show_footer, custom_css, google_maps_enabled, erpnext_enabled,
  enable_2fa, auto_backup_enabled, backup_frequency, lock_sensitive_settings, session_timeout,
  created_at, updated_at, updated_by
FROM public.app_settings;
REVOKE ALL ON public.v_app_settings_safe FROM PUBLIC;
GRANT SELECT ON public.v_app_settings_safe TO authenticated;

-- 2) inventory_*
DROP POLICY IF EXISTS items_read_auth ON public.inventory_items;
CREATE POLICY items_read_staff ON public.inventory_items FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager')
    OR public.has_role(auth.uid(),'warehouse') OR public.has_role(auth.uid(),'accounting')
    OR public.has_role(auth.uid(),'staff'));

DROP POLICY IF EXISTS stock_read_auth ON public.inventory_stock;
CREATE POLICY stock_read_staff ON public.inventory_stock FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager')
    OR public.has_role(auth.uid(),'warehouse') OR public.has_role(auth.uid(),'accounting')
    OR public.has_role(auth.uid(),'staff'));

DROP POLICY IF EXISTS mov_read_auth ON public.inventory_movements;
CREATE POLICY mov_read_staff ON public.inventory_movements FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager')
    OR public.has_role(auth.uid(),'warehouse') OR public.has_role(auth.uid(),'accounting')
    OR public.has_role(auth.uid(),'staff') OR public.has_role(auth.uid(),'technician'));

DROP POLICY IF EXISTS wh_read_auth ON public.inventory_warehouses;
CREATE POLICY wh_read_staff ON public.inventory_warehouses FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager')
    OR public.has_role(auth.uid(),'warehouse') OR public.has_role(auth.uid(),'accounting')
    OR public.has_role(auth.uid(),'staff'));

-- 3) projects
DROP POLICY IF EXISTS projects_public_read ON public.projects;
CREATE POLICY projects_authenticated_read ON public.projects FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE VIEW public.v_projects_public
WITH (security_invoker = false) AS
SELECT
  id, name, location, status, project_type, start_date, end_date, actual_end_date,
  magicplan_iframe_url, gallery_url, cover_image_url, progress,
  sketch_url, latitude, longitude, description, company_name, created_at, updated_at
FROM public.projects;
REVOKE ALL ON public.v_projects_public FROM PUBLIC;
GRANT SELECT ON public.v_projects_public TO anon, authenticated;

-- 4) reviews
DROP POLICY IF EXISTS "Anyone can view reviews" ON public.reviews;
CREATE POLICY reviews_authenticated_read ON public.reviews FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE VIEW public.v_reviews_public
WITH (security_invoker = false) AS
SELECT id, rating, comment, created_at FROM public.reviews;
REVOKE ALL ON public.v_reviews_public FROM PUBLIC;
GRANT SELECT ON public.v_reviews_public TO anon, authenticated;

-- 5) technician_badges
DROP POLICY IF EXISTS "Authenticated read badges" ON public.technician_badges;
CREATE POLICY badges_owner_or_staff_read ON public.technician_badges FOR SELECT TO authenticated
  USING (technician_id = public.get_technician_id_for_user(auth.uid())
    OR public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'manager')
    OR public.has_role(auth.uid(),'staff'));

-- 6) technician_levels
DROP POLICY IF EXISTS "Authenticated read levels" ON public.technician_levels;
CREATE POLICY levels_owner_or_staff_read ON public.technician_levels FOR SELECT TO authenticated
  USING (technician_id = public.get_technician_id_for_user(auth.uid())
    OR public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'manager')
    OR public.has_role(auth.uid(),'staff'));

-- 7) technician_coverage
DROP POLICY IF EXISTS "Users can view technician coverage" ON public.technician_coverage;
CREATE POLICY coverage_authenticated_read ON public.technician_coverage FOR SELECT TO authenticated USING (true);

-- 8) technician_services
DROP POLICY IF EXISTS "Users can view technician services" ON public.technician_services;
CREATE POLICY tech_services_authenticated_read ON public.technician_services FOR SELECT TO authenticated USING (true);
