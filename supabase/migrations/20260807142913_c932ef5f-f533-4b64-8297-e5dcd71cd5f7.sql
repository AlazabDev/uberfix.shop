-- 1) invoices ETA tracking columns
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS eta_status text NOT NULL DEFAULT 'not_submitted',
  ADD COLUMN IF NOT EXISTS eta_uuid text,
  ADD COLUMN IF NOT EXISTS eta_long_id text,
  ADD COLUMN IF NOT EXISTS eta_submission_uuid text,
  ADD COLUMN IF NOT EXISTS eta_internal_id text,
  ADD COLUMN IF NOT EXISTS eta_submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS eta_error text,
  ADD COLUMN IF NOT EXISTS eta_environment text;

CREATE INDEX IF NOT EXISTS idx_invoices_eta_status ON public.invoices (eta_status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_eta_uuid ON public.invoices (eta_uuid) WHERE eta_uuid IS NOT NULL;

-- 2) eta_settings (singleton config)
CREATE TABLE IF NOT EXISTS public.eta_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_enabled boolean NOT NULL DEFAULT false,
  environment text NOT NULL DEFAULT 'preprod',
  taxpayer_tin text,
  taxpayer_name text,
  activity_code text,
  branch_id text NOT NULL DEFAULT '0',
  branch_country text NOT NULL DEFAULT 'EG',
  branch_governate text,
  branch_city text,
  branch_street text,
  branch_building_number text,
  branch_postal_code text,
  default_item_code text DEFAULT 'EG-577219804-1075',
  default_item_code_type text NOT NULL DEFAULT 'EGS',
  default_item_name text DEFAULT 'Maintenance/Repair Services',
  default_unit_type text NOT NULL DEFAULT 'EA',
  default_tax_subtype text NOT NULL DEFAULT 'T1',
  signing_enabled boolean NOT NULL DEFAULT true,
  signing_service_url text,
  auto_submit_on_paid boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  CONSTRAINT eta_settings_environment_chk CHECK (environment IN ('preprod','production'))
);

GRANT SELECT, INSERT, UPDATE ON public.eta_settings TO authenticated;
GRANT ALL ON public.eta_settings TO service_role;
ALTER TABLE public.eta_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "eta_settings_admin_select" ON public.eta_settings
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'manager'));

CREATE POLICY "eta_settings_admin_insert" ON public.eta_settings
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

CREATE POLICY "eta_settings_admin_update" ON public.eta_settings
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

CREATE TRIGGER trg_touch_updated_at_eta_settings
  BEFORE UPDATE ON public.eta_settings
  FOR EACH ROW EXECUTE FUNCTION public.fn_touch_updated_at();

-- 3) eta_submissions (audit log)
CREATE TABLE IF NOT EXISTS public.eta_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  action text NOT NULL,
  environment text,
  status text NOT NULL DEFAULT 'pending',
  http_status integer,
  submission_uuid text,
  document_uuid text,
  long_id text,
  request_payload jsonb,
  response_payload jsonb,
  error_message text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_eta_submissions_invoice ON public.eta_submissions (invoice_id, created_at DESC);

GRANT SELECT ON public.eta_submissions TO authenticated;
GRANT ALL ON public.eta_submissions TO service_role;
ALTER TABLE public.eta_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "eta_submissions_staff_select" ON public.eta_submissions
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'owner')
    OR public.has_role(auth.uid(), 'manager')
    OR public.has_role(auth.uid(), 'finance')
    OR public.has_role(auth.uid(), 'accounting')
  );

CREATE TRIGGER trg_touch_updated_at_eta_submissions
  BEFORE UPDATE ON public.eta_submissions
  FOR EACH ROW EXECUTE FUNCTION public.fn_touch_updated_at();

-- 4) seed one settings row if none
INSERT INTO public.eta_settings (taxpayer_name, default_item_code, default_item_name)
SELECT 'UberFix', 'EG-577219804-1075', 'Maintenance/Repair Services'
WHERE NOT EXISTS (SELECT 1 FROM public.eta_settings);