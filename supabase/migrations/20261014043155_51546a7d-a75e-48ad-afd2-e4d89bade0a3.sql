CREATE TABLE public.preventive_plans (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES public.companies(id), property_id uuid NOT NULL REFERENCES public.properties(id), service_id uuid REFERENCES public.services(id), contract_id uuid REFERENCES public.maintenance_contracts(id), title text NOT NULL, description text NOT NULL DEFAULT '', service_type text NOT NULL DEFAULT 'general', priority text NOT NULL DEFAULT 'medium', client_name text NOT NULL, client_phone text NOT NULL, frequency text NOT NULL DEFAULT 'monthly', interval_count integer NOT NULL DEFAULT 1, start_date date NOT NULL, next_due_date date NOT NULL, is_active boolean NOT NULL DEFAULT true, created_by uuid NOT NULL DEFAULT auth.uid(), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT,INSERT,UPDATE,DELETE ON public.preventive_plans TO authenticated;
GRANT ALL ON public.preventive_plans TO service_role;
ALTER TABLE public.preventive_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY preventive_plans_company ON public.preventive_plans FOR ALL TO authenticated USING (company_id=public.get_current_user_company_id() AND public.has_any_role(ARRAY['owner','admin','manager','staff','dispatcher']::public.app_role[]) AND EXISTS(SELECT 1 FROM public.properties p WHERE p.id=property_id AND p.company_id=preventive_plans.company_id)) WITH CHECK(company_id=public.get_current_user_company_id() AND public.has_any_role(ARRAY['owner','admin','manager','staff','dispatcher']::public.app_role[]) AND EXISTS(SELECT 1 FROM public.properties p WHERE p.id=property_id AND p.company_id=preventive_plans.company_id));
CREATE TABLE public.preventive_plan_runs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), plan_id uuid NOT NULL REFERENCES public.preventive_plans(id) ON DELETE RESTRICT, due_date date NOT NULL, status text NOT NULL DEFAULT 'pending', request_id uuid REFERENCES public.maintenance_requests(id), claimed_by uuid NOT NULL, error_message text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(plan_id,due_date)
);
GRANT SELECT ON public.preventive_plan_runs TO authenticated;
GRANT ALL ON public.preventive_plan_runs TO service_role;
ALTER TABLE public.preventive_plan_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY preventive_runs_read ON public.preventive_plan_runs FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.preventive_plans p WHERE p.id=plan_id));
CREATE INDEX preventive_plans_due_idx ON public.preventive_plans(company_id,next_due_date) WHERE is_active;
CREATE INDEX preventive_runs_plan_idx ON public.preventive_plan_runs(plan_id,created_at DESC);
ALTER TABLE public.maintenance_requests ADD COLUMN preventive_run_id uuid UNIQUE REFERENCES public.preventive_plan_runs(id);
CREATE OR REPLACE FUNCTION public.validate_preventive_plan() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_catalog AS $$
BEGIN
 IF length(trim(NEW.title)) NOT BETWEEN 1 AND 200 OR length(NEW.description)>2000 OR length(trim(NEW.client_name)) NOT BETWEEN 1 AND 100 OR NEW.client_phone !~ '^\+?[0-9]{8,15}$' OR NEW.frequency NOT IN ('daily','weekly','monthly','yearly') OR NEW.interval_count NOT BETWEEN 1 AND 365 OR NEW.priority NOT IN ('low','medium','high') OR NEW.next_due_date<NEW.start_date THEN RAISE EXCEPTION 'Invalid preventive plan fields'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.properties WHERE id=NEW.property_id AND company_id=NEW.company_id) THEN RAISE EXCEPTION 'Property not available in company'; END IF;
 IF NEW.contract_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.maintenance_contracts WHERE id=NEW.contract_id AND company_id=NEW.company_id) THEN RAISE EXCEPTION 'Contract not available in company'; END IF;
 IF NEW.service_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.services WHERE id=NEW.service_id AND is_active) THEN RAISE EXCEPTION 'Service not available'; END IF;
 IF TG_OP='INSERT' THEN NEW.created_by=auth.uid(); ELSIF NEW.company_id IS DISTINCT FROM OLD.company_id OR NEW.created_by IS DISTINCT FROM OLD.created_by THEN RAISE EXCEPTION 'Plan ownership is immutable'; END IF;
 NEW.updated_at=now(); RETURN NEW;
END $$;
CREATE TRIGGER validate_preventive_plan BEFORE INSERT OR UPDATE ON public.preventive_plans FOR EACH ROW EXECUTE FUNCTION public.validate_preventive_plan();
CREATE OR REPLACE FUNCTION public.claim_preventive_run(p_plan_id uuid) RETURNS public.preventive_plan_runs LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_catalog AS $$
DECLARE p public.preventive_plans; r public.preventive_plan_runs;
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_any_role(ARRAY['owner','admin','manager','staff','dispatcher']::public.app_role[]) THEN RAISE EXCEPTION 'Forbidden'; END IF;
 SELECT * INTO p FROM public.preventive_plans WHERE id=p_plan_id AND company_id=public.get_current_user_company_id() FOR UPDATE;
 IF p.id IS NULL OR NOT p.is_active OR p.next_due_date>(now() AT TIME ZONE 'Africa/Cairo')::date THEN RAISE EXCEPTION 'Plan not available or not due'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.properties WHERE id=p.property_id AND company_id=p.company_id) THEN RAISE EXCEPTION 'Property not available'; END IF;
 INSERT INTO public.preventive_plan_runs(plan_id,due_date,claimed_by) VALUES(p.id,p.next_due_date,auth.uid()) ON CONFLICT(plan_id,due_date) DO UPDATE SET claimed_by=auth.uid(),updated_at=now() RETURNING * INTO r;
 RETURN r;
END $$;
REVOKE ALL ON FUNCTION public.claim_preventive_run(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.claim_preventive_run(uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.link_preventive_request() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_catalog AS $$
DECLARE r public.preventive_plan_runs; p public.preventive_plans; next_date date; steps integer;
BEGIN
 IF NEW.preventive_run_id IS NULL THEN RETURN NEW; END IF;
 SELECT * INTO r FROM public.preventive_plan_runs WHERE id=NEW.preventive_run_id FOR UPDATE;
 SELECT * INTO p FROM public.preventive_plans WHERE id=r.plan_id FOR UPDATE;
 IF p.id IS NULL OR p.company_id<>NEW.company_id OR p.property_id IS DISTINCT FROM NEW.property_id OR NOT p.is_active OR r.request_id IS NOT NULL THEN RAISE EXCEPTION 'Invalid or completed preventive occurrence'; END IF;
 IF TG_OP='INSERT' THEN
  NEW.contract_id=p.contract_id; NEW.created_by=r.claimed_by; NEW.title=p.title; NEW.priority=p.priority; NEW.category_id=(SELECT category_id FROM public.services WHERE id=p.service_id);
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER link_preventive_request BEFORE INSERT ON public.maintenance_requests FOR EACH ROW EXECUTE FUNCTION public.link_preventive_request();
CREATE OR REPLACE FUNCTION public.finish_preventive_request() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_catalog AS $$
DECLARE r public.preventive_plan_runs; p public.preventive_plans; d date;
BEGIN
 IF NEW.preventive_run_id IS NULL THEN RETURN NEW; END IF;
 SELECT * INTO r FROM public.preventive_plan_runs WHERE id=NEW.preventive_run_id;
 SELECT * INTO p FROM public.preventive_plans WHERE id=r.plan_id;
 d=CASE p.frequency WHEN 'daily' THEN r.due_date+p.interval_count WHEN 'weekly' THEN r.due_date+7*p.interval_count WHEN 'monthly' THEN (r.due_date+make_interval(months=>p.interval_count))::date ELSE (r.due_date+make_interval(years=>p.interval_count))::date END;
 UPDATE public.preventive_plan_runs SET status='success',request_id=NEW.id,error_message=NULL,updated_at=now() WHERE id=r.id;
 UPDATE public.preventive_plans SET next_due_date=d,updated_at=now() WHERE id=p.id;
 RETURN NEW;
END $$;
CREATE TRIGGER finish_preventive_request AFTER INSERT ON public.maintenance_requests FOR EACH ROW EXECUTE FUNCTION public.finish_preventive_request();
REVOKE ALL ON FUNCTION public.link_preventive_request(),public.finish_preventive_request(),public.validate_preventive_plan() FROM PUBLIC;
