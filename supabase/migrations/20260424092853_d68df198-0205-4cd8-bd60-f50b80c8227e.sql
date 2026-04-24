-- =========================================================
-- إصلاح ثغرة أمنية: سياسات الفنيين تستخدم auth.uid() خطأً
-- بدلاً من get_technician_id_for_user(auth.uid())
-- =========================================================

-- 1) technician_withdrawals
DROP POLICY IF EXISTS "Restricted read technician_withdrawals" ON public.technician_withdrawals;
CREATE POLICY "Restricted read technician_withdrawals"
ON public.technician_withdrawals
FOR SELECT
TO authenticated
USING (
  technician_id = public.get_technician_id_for_user(auth.uid())
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'manager'::app_role)
);

-- 2) technician_monthly_bonuses
DROP POLICY IF EXISTS "Technicians view own bonuses" ON public.technician_monthly_bonuses;
CREATE POLICY "Technicians view own bonuses"
ON public.technician_monthly_bonuses
FOR SELECT
TO authenticated
USING (
  technician_id = public.get_technician_id_for_user(auth.uid())
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'manager'::app_role)
);

-- 3) technician_daily_stats
DROP POLICY IF EXISTS "Technicians view own stats" ON public.technician_daily_stats;
CREATE POLICY "Technicians view own stats"
ON public.technician_daily_stats
FOR SELECT
TO authenticated
USING (
  technician_id = public.get_technician_id_for_user(auth.uid())
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'manager'::app_role)
);

-- 4) technician_coverage
DROP POLICY IF EXISTS "Technicians can manage their coverage" ON public.technician_coverage;
CREATE POLICY "Technicians can manage their coverage"
ON public.technician_coverage
FOR ALL
TO authenticated
USING (
  technician_id = public.get_technician_id_for_user(auth.uid())
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'manager'::app_role)
)
WITH CHECK (
  technician_id = public.get_technician_id_for_user(auth.uid())
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'manager'::app_role)
);

-- 5) technician_skill_tests
DROP POLICY IF EXISTS "pol_skill_tests_own" ON public.technician_skill_tests;
CREATE POLICY "pol_skill_tests_own"
ON public.technician_skill_tests
FOR SELECT
TO authenticated
USING (
  technician_id = public.get_technician_id_for_user(auth.uid())
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'manager'::app_role)
);

-- 6) technician_training
DROP POLICY IF EXISTS "pol_tech_training_update" ON public.technician_training;
CREATE POLICY "pol_tech_training_update"
ON public.technician_training
FOR UPDATE
TO authenticated
USING (
  technician_id = public.get_technician_id_for_user(auth.uid())
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'manager'::app_role)
)
WITH CHECK (
  technician_id = public.get_technician_id_for_user(auth.uid())
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'manager'::app_role)
);

-- 7) technician_location
DROP POLICY IF EXISTS "Technicians can update own location" ON public.technician_location;
CREATE POLICY "Technicians can update own location"
ON public.technician_location
FOR ALL
TO authenticated
USING (
  technician_id = public.get_technician_id_for_user(auth.uid())
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'manager'::app_role)
)
WITH CHECK (
  technician_id = public.get_technician_id_for_user(auth.uid())
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'manager'::app_role)
);