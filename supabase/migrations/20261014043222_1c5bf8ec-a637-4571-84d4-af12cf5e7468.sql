REVOKE ALL ON FUNCTION public.link_preventive_request(), public.finish_preventive_request() FROM authenticated,anon;
GRANT INSERT ON public.preventive_plan_runs TO authenticated;
CREATE POLICY preventive_runs_claim ON public.preventive_plan_runs FOR INSERT TO authenticated WITH CHECK(claimed_by=auth.uid() AND status='pending' AND request_id IS NULL AND error_message IS NULL AND EXISTS(SELECT 1 FROM public.preventive_plans p WHERE p.id=plan_id AND p.is_active AND p.next_due_date=due_date AND p.next_due_date<=(now() AT TIME ZONE 'Africa/Cairo')::date));
CREATE OR REPLACE FUNCTION public.claim_preventive_run(p_plan_id uuid) RETURNS public.preventive_plan_runs LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_catalog AS $$
DECLARE p public.preventive_plans; r public.preventive_plan_runs;
BEGIN
 SELECT * INTO p FROM public.preventive_plans WHERE id=p_plan_id AND is_active AND next_due_date<=(now() AT TIME ZONE 'Africa/Cairo')::date;
 IF p.id IS NULL THEN RAISE EXCEPTION 'Plan not available or not due'; END IF;
 INSERT INTO public.preventive_plan_runs(plan_id,due_date,claimed_by) VALUES(p.id,p.next_due_date,auth.uid()) ON CONFLICT(plan_id,due_date) DO NOTHING;
 SELECT * INTO r FROM public.preventive_plan_runs WHERE plan_id=p.id AND due_date=p.next_due_date;
 RETURN r;
END $$;
REVOKE ALL ON FUNCTION public.claim_preventive_run(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.claim_preventive_run(uuid) TO authenticated;