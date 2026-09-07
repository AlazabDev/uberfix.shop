-- 0) إعادة إنشاء السجلات المرجعية الأرشيفية المفقودة
INSERT INTO public.companies (id, name)
VALUES ('ebc1194a-f7bb-4af0-a03c-2d4fe7c27200', 'شركة الأرشيف التاريخي')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.branches (id, company_id, name)
VALUES ('a787c026-0216-435f-bef7-f1953ca03652', 'ebc1194a-f7bb-4af0-a03c-2d4fe7c27200', 'فرع الأرشيف التاريخي')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.customers (id, phone, name)
VALUES ('208e988f-c2f3-4fbc-8ff5-8bd01820bfe0', '+201000000000', 'أرشيف أبو عوف'),
       ('3df8417e-d2df-4d19-8fb4-bd82e84fb05f', '+200000000000', 'عميل أرشيفي')
ON CONFLICT (id) DO NOTHING;

-- 1) استعادة الأرشيف المحذوف من سجل التدقيق
ALTER TABLE public.maintenance_requests DISABLE TRIGGER maintenance_requests_capture_event_v2;
ALTER TABLE public.maintenance_requests DISABLE TRIGGER maintenance_requests_ensure_item_v2;
ALTER TABLE public.maintenance_requests DISABLE TRIGGER maintenance_requests_sync_assignment_v2;
ALTER TABLE public.maintenance_requests DISABLE TRIGGER maintenance_requests_sync_public_tracking;
ALTER TABLE public.maintenance_requests DISABLE TRIGGER trg_check_suspicious_requests;
ALTER TABLE public.maintenance_requests DISABLE TRIGGER trg_enforce_mr_phone;
ALTER TABLE public.maintenance_requests DISABLE TRIGGER trg_generate_request_number;
ALTER TABLE public.maintenance_requests DISABLE TRIGGER trg_mr_audit;
ALTER TABLE public.maintenance_requests DISABLE TRIGGER trg_mr_link_customer;
ALTER TABLE public.maintenance_requests DISABLE TRIGGER trigger_auto_calculate_sla;
ALTER TABLE public.maintenance_requests DISABLE TRIGGER trg_daftra_sync_on_billed;
ALTER TABLE public.maintenance_requests DISABLE TRIGGER trg_on_stage_transition_enqueue_wa;
ALTER TABLE public.maintenance_requests DISABLE TRIGGER trigger_notify_customer_on_stage_change;

DO $do$
DECLARE
  cols text;
BEGIN
  SELECT string_agg(quote_ident(column_name), ', ' ORDER BY ordinal_position)
  INTO cols
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'maintenance_requests'
    AND is_generated = 'NEVER'
    AND identity_generation IS NULL;

  EXECUTE format($f$
    WITH deleted AS (
      SELECT DISTINCT ON (a.old_values->>'id') a.old_values AS row_json
      FROM public.audit_logs a
      WHERE a.action = 'DELETE'
        AND a.table_name = 'maintenance_requests'
        AND a.old_values ? 'id'
      ORDER BY a.old_values->>'id', a.created_at DESC
    ), restored AS (
      SELECT (jsonb_populate_record(NULL::public.maintenance_requests, row_json)).*
      FROM deleted
    )
    INSERT INTO public.maintenance_requests (%1$s)
    SELECT %1$s
    FROM restored r
    WHERE r.id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM public.maintenance_requests m WHERE m.id = r.id)
  $f$, cols);
END
$do$;

UPDATE public.maintenance_requests m
SET archived_at = COALESCE(m.archived_at, now())
WHERE m.archived_at IS NULL
  AND EXISTS (
    SELECT 1 FROM public.audit_logs a
    WHERE a.action = 'DELETE' AND a.table_name = 'maintenance_requests'
      AND (a.old_values->>'id')::uuid = m.id
  );

ALTER TABLE public.maintenance_requests ENABLE TRIGGER maintenance_requests_capture_event_v2;
ALTER TABLE public.maintenance_requests ENABLE TRIGGER maintenance_requests_ensure_item_v2;
ALTER TABLE public.maintenance_requests ENABLE TRIGGER maintenance_requests_sync_assignment_v2;
ALTER TABLE public.maintenance_requests ENABLE TRIGGER maintenance_requests_sync_public_tracking;
ALTER TABLE public.maintenance_requests ENABLE TRIGGER trg_check_suspicious_requests;
ALTER TABLE public.maintenance_requests ENABLE TRIGGER trg_enforce_mr_phone;
ALTER TABLE public.maintenance_requests ENABLE TRIGGER trg_generate_request_number;
ALTER TABLE public.maintenance_requests ENABLE TRIGGER trg_mr_audit;
ALTER TABLE public.maintenance_requests ENABLE TRIGGER trg_mr_link_customer;
ALTER TABLE public.maintenance_requests ENABLE TRIGGER trigger_auto_calculate_sla;
ALTER TABLE public.maintenance_requests ENABLE TRIGGER trg_daftra_sync_on_billed;
ALTER TABLE public.maintenance_requests ENABLE TRIGGER trg_on_stage_transition_enqueue_wa;
ALTER TABLE public.maintenance_requests ENABLE TRIGGER trigger_notify_customer_on_stage_change;

-- 2) حماية دائمة ضد الحذف الفعلي
CREATE OR REPLACE FUNCTION public.fn_block_maintenance_request_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF COALESCE(current_setting('app.allow_request_delete', true), '') = 'on' THEN
    RETURN OLD;
  END IF;

  INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_values)
  VALUES (auth.uid(), 'DELETE_BLOCKED', 'maintenance_requests', OLD.id, to_jsonb(OLD));

  RAISE EXCEPTION 'حذف طلبات الصيانة غير مسموح. استخدم الأرشفة بدلاً من الحذف.'
    USING ERRCODE = 'check_violation';
END;
$$;

DROP TRIGGER IF EXISTS trg_block_mr_delete ON public.maintenance_requests;
CREATE TRIGGER trg_block_mr_delete
BEFORE DELETE ON public.maintenance_requests
FOR EACH ROW EXECUTE FUNCTION public.fn_block_maintenance_request_delete();

REVOKE ALL ON FUNCTION public.fn_block_maintenance_request_delete() FROM PUBLIC;

INSERT INTO public.audit_logs (user_id, action, table_name, record_id, new_values)
VALUES (NULL, 'ARCHIVE_RESTORE', 'maintenance_requests', NULL,
        jsonb_build_object('source', 'audit_logs.old_values',
                           'incident_date', '2026-07-29',
                           'total_requests_after_restore', (SELECT count(*) FROM public.maintenance_requests)));