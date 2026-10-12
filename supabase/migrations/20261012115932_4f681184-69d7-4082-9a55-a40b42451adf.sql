DROP POLICY IF EXISTS "transitions readable by authenticated" ON public.workflow_transitions;
CREATE POLICY "transitions readable by staff" ON public.workflow_transitions FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
DROP POLICY IF EXISTS "sla_policies_read" ON public.sla_policies;
CREATE POLICY "sla_policies_read_staff" ON public.sla_policies FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));