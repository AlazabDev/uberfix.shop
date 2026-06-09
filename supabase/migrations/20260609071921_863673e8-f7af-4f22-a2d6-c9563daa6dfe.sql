-- Remove broken RLS policies that compare technicians.id (a technician row id) directly to auth.uid()
-- These never matched legitimate technicians; correct ownership policies remain via get_technician_id_for_user.

DROP POLICY IF EXISTS "Technicians manage their tests" ON public.technician_skill_tests;
DROP POLICY IF EXISTS "Technicians view training" ON public.technician_training;
DROP POLICY IF EXISTS "pol_tech_training_view" ON public.technician_training;

-- Re-create a correct SELECT policy for technician_training using helper function
CREATE POLICY "tech_training_owner_select"
ON public.technician_training
FOR SELECT
TO authenticated
USING (technician_id = public.get_technician_id_for_user(auth.uid()));