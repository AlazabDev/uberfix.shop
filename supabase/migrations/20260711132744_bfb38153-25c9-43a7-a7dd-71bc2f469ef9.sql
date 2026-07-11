
-- payment_events
CREATE POLICY "payment_events_service_only" ON public.payment_events FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "payment_events_admin_read" ON public.payment_events FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'owner'::app_role));

-- payment_audit_log
CREATE POLICY "payment_audit_log_service_only" ON public.payment_audit_log FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "payment_audit_log_admin_read" ON public.payment_audit_log FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'owner'::app_role));

-- payment_intents
CREATE POLICY "payment_intents_service_only" ON public.payment_intents FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "payment_intents_admin_read" ON public.payment_intents FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'owner'::app_role));
