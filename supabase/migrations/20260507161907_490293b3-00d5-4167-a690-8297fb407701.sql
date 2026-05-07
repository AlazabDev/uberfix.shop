
-- MODULE #2 — TECHNICIANS
ALTER TABLE public.technician_profiles
  ADD COLUMN IF NOT EXISTS technician_code  text UNIQUE,
  ADD COLUMN IF NOT EXISTS approved_at      timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by      uuid,
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS rejected_at      timestamptz,
  ADD COLUMN IF NOT EXISTS rejected_by      uuid,
  ADD COLUMN IF NOT EXISTS w9_pdf_url       text,
  ADD COLUMN IF NOT EXISTS acord_pdf_url    text,
  ADD COLUMN IF NOT EXISTS terms_pdf_url    text,
  ADD COLUMN IF NOT EXISTS technician_id    uuid;

DROP TRIGGER IF EXISTS trg_tech_profiles_updated_at ON public.technician_profiles;
DROP TRIGGER IF EXISTS trigger_technician_profiles_updated_at ON public.technician_profiles;

CREATE OR REPLACE FUNCTION public.fn_handle_technician_approval()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_seq int; v_tech_id uuid;
BEGIN
  IF NEW.status = 'approved' AND COALESCE(OLD.status,'') <> 'approved' THEN
    IF NEW.technician_code IS NULL THEN
      SELECT COALESCE(MAX(NULLIF(regexp_replace(technician_code,'[^0-9]','','g'),'')::int),0)+1
        INTO v_seq FROM public.technician_profiles WHERE technician_code LIKE 'UF-TEC-%';
      NEW.technician_code := 'UF-TEC-' || lpad(v_seq::text, 5, '0');
    END IF;
    NEW.approved_at := COALESCE(NEW.approved_at, now());
    IF NEW.technician_id IS NULL THEN
      INSERT INTO public.technicians (name, phone, email, specialization, status, is_active, is_verified, application_id, created_by)
      VALUES (NEW.full_name, NEW.phone, NEW.email, COALESCE(NEW.company_type,'general'), 'available', true, true, NEW.id, NEW.user_id)
      RETURNING id INTO v_tech_id;
      NEW.technician_id := v_tech_id;
    END IF;
  END IF;
  IF NEW.status = 'rejected' AND COALESCE(OLD.status,'') <> 'rejected' THEN
    NEW.rejected_at := COALESCE(NEW.rejected_at, now());
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_handle_technician_approval ON public.technician_profiles;
CREATE TRIGGER trg_handle_technician_approval
BEFORE UPDATE OF status ON public.technician_profiles
FOR EACH ROW EXECUTE FUNCTION public.fn_handle_technician_approval();

CREATE INDEX IF NOT EXISTS idx_tp_status ON public.technician_profiles(status);
CREATE INDEX IF NOT EXISTS idx_tp_code ON public.technician_profiles(technician_code);
CREATE INDEX IF NOT EXISTS idx_tp_user ON public.technician_profiles(user_id);

DROP VIEW IF EXISTS public.v_technicians_dashboard;
CREATE VIEW public.v_technicians_dashboard
WITH (security_invoker=true) AS
SELECT
  tp.id AS profile_id, tp.technician_id, tp.technician_code,
  tp.full_name, tp.email, tp.phone, tp.company_name, tp.company_type,
  tp.status, tp.approved_at, tp.rejected_at, tp.created_at,
  t.is_active, t.is_verified, t.rating, t.total_reviews, t.hourly_rate,
  (SELECT count(*) FROM public.maintenance_requests mr WHERE mr.assigned_technician_id = t.id) AS total_jobs,
  (SELECT count(*) FROM public.maintenance_requests mr WHERE mr.assigned_technician_id = t.id AND mr.workflow_stage = 'closed') AS closed_jobs
FROM public.technician_profiles tp
LEFT JOIN public.technicians t ON t.id = tp.technician_id;

GRANT SELECT ON public.v_technicians_dashboard TO authenticated;

-- MODULE #3 — PROPERTIES & BRANCHES
ALTER TABLE public.branches
  ADD COLUMN IF NOT EXISTS updated_at  timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS is_active   boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS phone       text,
  ADD COLUMN IF NOT EXISTS manager_id  uuid,
  ADD COLUMN IF NOT EXISTS city_id     bigint,
  ADD COLUMN IF NOT EXISTS district_id bigint,
  ADD COLUMN IF NOT EXISTS latitude    double precision,
  ADD COLUMN IF NOT EXISTS longitude   double precision;

CREATE OR REPLACE FUNCTION public.fn_generate_branch_code()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_seq int;
BEGIN
  IF NEW.code IS NULL OR NEW.code = '' THEN
    SELECT COALESCE(MAX(NULLIF(regexp_replace(code,'[^0-9]','','g'),'')::int),0)+1
      INTO v_seq FROM public.branches WHERE code LIKE 'UF-BR-%';
    NEW.code := 'UF-BR-' || lpad(v_seq::text, 5, '0');
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_generate_branch_code ON public.branches;
CREATE TRIGGER trg_generate_branch_code
BEFORE INSERT ON public.branches
FOR EACH ROW EXECUTE FUNCTION public.fn_generate_branch_code();

CREATE OR REPLACE FUNCTION public.fn_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_branches_updated_at ON public.branches;
CREATE TRIGGER trg_branches_updated_at
BEFORE UPDATE ON public.branches
FOR EACH ROW EXECUTE FUNCTION public.fn_touch_updated_at();

CREATE OR REPLACE FUNCTION public.fn_generate_property_code()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_seq int;
BEGIN
  IF NEW.code IS NULL OR NEW.code = '' THEN
    SELECT COALESCE(MAX(NULLIF(regexp_replace(code,'[^0-9]','','g'),'')::int),0)+1
      INTO v_seq FROM public.properties WHERE code LIKE 'UF-PRP-%';
    NEW.code := 'UF-PRP-' || lpad(v_seq::text, 5, '0');
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_generate_property_code ON public.properties;
CREATE TRIGGER trg_generate_property_code
BEFORE INSERT ON public.properties
FOR EACH ROW EXECUTE FUNCTION public.fn_generate_property_code();

CREATE INDEX IF NOT EXISTS idx_branches_company ON public.branches(company_id);
CREATE INDEX IF NOT EXISTS idx_branches_active ON public.branches(is_active);
CREATE INDEX IF NOT EXISTS idx_branches_code ON public.branches(code);
CREATE INDEX IF NOT EXISTS idx_properties_code ON public.properties(code);
CREATE INDEX IF NOT EXISTS idx_properties_status ON public.properties(status);
CREATE INDEX IF NOT EXISTS idx_properties_city ON public.properties(city_id);

DROP VIEW IF EXISTS public.v_properties_dashboard;
CREATE VIEW public.v_properties_dashboard
WITH (security_invoker=true) AS
SELECT
  p.id, p.code, p.name, p.type, p.status, p.address,
  p.city_id, p.district_id, p.latitude, p.longitude,
  p.qr_code_data, p.created_at, p.updated_at,
  (SELECT count(*) FROM public.maintenance_requests mr WHERE mr.property_id = p.id) AS total_requests,
  (SELECT count(*) FROM public.maintenance_requests mr
     WHERE mr.property_id = p.id AND mr.workflow_stage NOT IN ('closed','cancelled')) AS active_requests,
  (SELECT max(mr.created_at) FROM public.maintenance_requests mr WHERE mr.property_id = p.id) AS last_request_at
FROM public.properties p;

GRANT SELECT ON public.v_properties_dashboard TO authenticated;

DROP VIEW IF EXISTS public.v_branches_dashboard;
CREATE VIEW public.v_branches_dashboard
WITH (security_invoker=true) AS
SELECT
  b.id, b.code, b.name, b.company_id, c.name AS company_name,
  b.city, b.address, b.is_active, b.created_at,
  (SELECT count(*) FROM public.maintenance_requests mr WHERE mr.branch_id = b.id) AS total_requests,
  (SELECT count(*) FROM public.maintenance_requests mr
     WHERE mr.branch_id = b.id AND mr.workflow_stage NOT IN ('closed','cancelled')) AS active_requests
FROM public.branches b
LEFT JOIN public.companies c ON c.id = b.company_id;

GRANT SELECT ON public.v_branches_dashboard TO authenticated;
