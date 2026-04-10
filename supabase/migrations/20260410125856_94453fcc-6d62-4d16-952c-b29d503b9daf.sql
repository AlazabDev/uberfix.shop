
-- ===== wa_flows: restrict by project_id =====
DROP POLICY IF EXISTS "Authenticated read wa_flows" ON public.wa_flows;
DROP POLICY IF EXISTS "wa_flows_admin_only" ON public.wa_flows;

CREATE POLICY "wa_flows_staff_select" ON public.wa_flows
  FOR SELECT TO authenticated
  USING (public.is_staff());

CREATE POLICY "wa_flows_staff_manage" ON public.wa_flows
  FOR ALL TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- ===== technician_service_prices: remove public access =====
DROP POLICY IF EXISTS "Public view service prices" ON public.technician_service_prices;
DROP POLICY IF EXISTS "Authenticated can view technician_service_prices" ON public.technician_service_prices;
DROP POLICY IF EXISTS "technician_service_prices_read_authenticated" ON public.technician_service_prices;
DROP POLICY IF EXISTS "technician_service_prices_select_authenticated" ON public.technician_service_prices;
DROP POLICY IF EXISTS "Staff view all service prices" ON public.technician_service_prices;
DROP POLICY IF EXISTS "Technicians manage own service prices" ON public.technician_service_prices;
DROP POLICY IF EXISTS "Users can manage their own service prices" ON public.technician_service_prices;

-- Staff can see all prices
CREATE POLICY "tech_prices_staff_read" ON public.technician_service_prices
  FOR SELECT TO authenticated
  USING (
    public.is_staff()
    OR technician_id IN (
      SELECT t.id FROM public.technicians t
      JOIN public.technician_profiles tp ON t.technician_profile_id = tp.id
      WHERE tp.user_id = auth.uid()
    )
  );

-- Technicians manage own prices only
CREATE POLICY "tech_prices_own_manage" ON public.technician_service_prices
  FOR ALL TO authenticated
  USING (
    public.is_staff()
    OR technician_id IN (
      SELECT t.id FROM public.technicians t
      JOIN public.technician_profiles tp ON t.technician_profile_id = tp.id
      WHERE tp.user_id = auth.uid()
    )
  )
  WITH CHECK (
    public.is_staff()
    OR technician_id IN (
      SELECT t.id FROM public.technicians t
      JOIN public.technician_profiles tp ON t.technician_profile_id = tp.id
      WHERE tp.user_id = auth.uid()
    )
  );
