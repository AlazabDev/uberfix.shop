ALTER TABLE public.maintenance_requests 
  ADD COLUMN IF NOT EXISTS legacy_store_id UUID,
  ADD COLUMN IF NOT EXISTS legacy_source TEXT,
  ADD COLUMN IF NOT EXISTS legacy_created_by UUID;

CREATE INDEX IF NOT EXISTS idx_mr_legacy_store ON public.maintenance_requests(legacy_store_id) WHERE legacy_store_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mr_archived_at ON public.maintenance_requests(archived_at) WHERE archived_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mr_workflow_stage ON public.maintenance_requests(workflow_stage);
CREATE INDEX IF NOT EXISTS idx_mr_created_at_desc ON public.maintenance_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mr_company_branch ON public.maintenance_requests(company_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_mr_legacy_source ON public.maintenance_requests(legacy_source) WHERE legacy_source IS NOT NULL;

CREATE SEQUENCE IF NOT EXISTS public.mr_legacy_seq START 1;

-- Disable user triggers explicitly (not ALL, to avoid system triggers)
ALTER TABLE public.maintenance_requests DISABLE TRIGGER trg_auto_notify_on_status_change;
ALTER TABLE public.maintenance_requests DISABLE TRIGGER trg_auto_notify_status_change;
ALTER TABLE public.maintenance_requests DISABLE TRIGGER trg_check_suspicious_requests;
ALTER TABLE public.maintenance_requests DISABLE TRIGGER trg_mr_audit;
ALTER TABLE public.maintenance_requests DISABLE TRIGGER trg_mr_closure;
ALTER TABLE public.maintenance_requests DISABLE TRIGGER trg_mr_lifecycle;
ALTER TABLE public.maintenance_requests DISABLE TRIGGER trg_mr_notify;
ALTER TABLE public.maintenance_requests DISABLE TRIGGER trg_mr_sla_due;
ALTER TABLE public.maintenance_requests DISABLE TRIGGER trg_on_stage_transition_enqueue_wa;
ALTER TABLE public.maintenance_requests DISABLE TRIGGER trigger_auto_calculate_sla;
ALTER TABLE public.maintenance_requests DISABLE TRIGGER trigger_notify_customer_on_status_change;
ALTER TABLE public.maintenance_requests DISABLE TRIGGER on_maintenance_completed_sync_daftra;
ALTER TABLE public.maintenance_requests DISABLE TRIGGER trg_guard_workflow_stage;
ALTER TABLE public.maintenance_requests DISABLE TRIGGER trg_enforce_mr_phone;

DO $$
DECLARE
  v_legacy_company_id UUID;
  v_legacy_branch_id UUID;
  v_migrated_count INT := 0;
  v_archive_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'maintenance_requests_archive'
  ) INTO v_archive_exists;
  
  IF NOT v_archive_exists THEN RETURN; END IF;

  SELECT id INTO v_legacy_company_id FROM public.companies 
  WHERE name = 'أرشيف تاريخي - ما قبل 2026' LIMIT 1;
  IF v_legacy_company_id IS NULL THEN
    INSERT INTO public.companies (name, created_at)
    VALUES ('أرشيف تاريخي - ما قبل 2026', NOW())
    RETURNING id INTO v_legacy_company_id;
  END IF;

  SELECT id INTO v_legacy_branch_id FROM public.branches 
  WHERE company_id = v_legacy_company_id AND name = 'أرشيف عام' LIMIT 1;
  IF v_legacy_branch_id IS NULL THEN
    INSERT INTO public.branches (company_id, name, code, city, created_at)
    VALUES (v_legacy_company_id, 'أرشيف عام', 'LEGACY-MAIN', 'القاهرة', NOW())
    RETURNING id INTO v_legacy_branch_id;
  END IF;

  INSERT INTO public.maintenance_requests (
    id, company_id, branch_id, title, description,
    status, priority, service_type, estimated_cost, actual_cost,
    workflow_stage, request_number,
    client_name, client_phone,
    legacy_store_id, legacy_source, legacy_created_by, archived_at,
    created_at, updated_at
  )
  SELECT
    a.id, v_legacy_company_id, v_legacy_branch_id,
    COALESCE(NULLIF(a.title, ''), 'طلب أرشيفي'),
    a.description,
    'Closed'::mr_status,
    COALESCE(a.priority, 'medium'),
    COALESCE(a.service_type, 'maintenance'),
    a.estimated_cost, a.actual_cost,
    'closed',
    'UF/MR/LEG/' || LPAD(nextval('public.mr_legacy_seq')::text, 6, '0'),
    'عميل أرشيفي', '00000000',
    a.store_id, 'maintenance_requests_archive', a.created_by,
    COALESCE(a.completion_date, a.updated_at, a.created_at, NOW()),
    COALESCE(a.created_at, NOW()),
    COALESCE(a.updated_at, NOW())
  FROM public.maintenance_requests_archive a
  WHERE NOT EXISTS (SELECT 1 FROM public.maintenance_requests m WHERE m.id = a.id);

  GET DIAGNOSTICS v_migrated_count = ROW_COUNT;
  RAISE NOTICE 'Migrated % records', v_migrated_count;

  IF v_migrated_count < 2000 THEN
    RAISE EXCEPTION 'Migration failed: expected ~2296, got %', v_migrated_count;
  END IF;

  DROP TABLE public.maintenance_requests_archive CASCADE;
END $$;

-- Re-enable triggers
ALTER TABLE public.maintenance_requests ENABLE TRIGGER trg_auto_notify_on_status_change;
ALTER TABLE public.maintenance_requests ENABLE TRIGGER trg_auto_notify_status_change;
ALTER TABLE public.maintenance_requests ENABLE TRIGGER trg_check_suspicious_requests;
ALTER TABLE public.maintenance_requests ENABLE TRIGGER trg_mr_audit;
ALTER TABLE public.maintenance_requests ENABLE TRIGGER trg_mr_closure;
ALTER TABLE public.maintenance_requests ENABLE TRIGGER trg_mr_lifecycle;
ALTER TABLE public.maintenance_requests ENABLE TRIGGER trg_mr_notify;
ALTER TABLE public.maintenance_requests ENABLE TRIGGER trg_mr_sla_due;
ALTER TABLE public.maintenance_requests ENABLE TRIGGER trg_on_stage_transition_enqueue_wa;
ALTER TABLE public.maintenance_requests ENABLE TRIGGER trigger_auto_calculate_sla;
ALTER TABLE public.maintenance_requests ENABLE TRIGGER trigger_notify_customer_on_status_change;
ALTER TABLE public.maintenance_requests ENABLE TRIGGER on_maintenance_completed_sync_daftra;
ALTER TABLE public.maintenance_requests ENABLE TRIGGER trg_guard_workflow_stage;
ALTER TABLE public.maintenance_requests ENABLE TRIGGER trg_enforce_mr_phone;

DROP VIEW IF EXISTS public.v_maintenance_mirror CASCADE;

CREATE VIEW public.v_maintenance_mirror 
WITH (security_invoker = true)
AS
SELECT 
  m.id, m.request_number, m.title, m.description,
  m.status, m.workflow_stage, m.priority, m.service_type, m.channel,
  m.client_name, m.client_phone, m.client_email, m.location,
  m.company_id, m.branch_id,
  m.assigned_vendor_id, m.assigned_technician_id,
  m.estimated_cost, m.actual_cost, m.rating,
  m.created_at, m.updated_at, m.archived_at, m.sla_due_date,
  m.legacy_store_id, m.legacy_source, m.legacy_created_by,
  (m.archived_at IS NOT NULL) AS is_archived,
  (m.sla_due_date IS NOT NULL AND m.sla_due_date < NOW() AND COALESCE(m.workflow_stage, '') NOT IN ('closed', 'cancelled')) AS is_sla_breached,
  (m.legacy_source IS NOT NULL) AS is_legacy,
  EXTRACT(EPOCH FROM (COALESCE(m.archived_at, NOW()) - m.created_at))/86400 AS age_days,
  b.name AS branch_name,
  c.name AS company_name
FROM public.maintenance_requests m
LEFT JOIN public.branches b ON b.id = m.branch_id
LEFT JOIN public.companies c ON c.id = m.company_id;

COMMENT ON VIEW public.v_maintenance_mirror IS 'Unified mirror dashboard - single source for all maintenance requests';