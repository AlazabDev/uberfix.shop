
-- ═══════════════════════════════════════════════════════════════════════
-- Module #1 Final Closure (retry) — bypass broken updated_at trigger
-- ═══════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.fn_sync_workflow_stage_mirror()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  NEW.workflow_stage := NEW.workflow_stage_v2::text;
  NEW.status := CASE NEW.workflow_stage_v2
    WHEN 'draft' THEN 'Open'::mr_status
    WHEN 'submitted' THEN 'Open'::mr_status
    WHEN 'triaged' THEN 'Open'::mr_status
    WHEN 'assigned' THEN 'Assigned'::mr_status
    WHEN 'scheduled' THEN 'Assigned'::mr_status
    WHEN 'in_progress' THEN 'InProgress'::mr_status
    WHEN 'inspection' THEN 'InProgress'::mr_status
    WHEN 'waiting_parts' THEN 'Waiting'::mr_status
    WHEN 'on_hold' THEN 'On Hold'::mr_status
    WHEN 'completed' THEN 'Completed'::mr_status
    WHEN 'billed' THEN 'Completed'::mr_status
    WHEN 'paid' THEN 'Completed'::mr_status
    WHEN 'handover_to_admin' THEN 'Completed'::mr_status
    WHEN 'closed' THEN 'Closed'::mr_status
    WHEN 'cancelled' THEN 'Cancelled'::mr_status
    WHEN 'rejected' THEN 'Rejected'::mr_status
    ELSE NEW.status
  END;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_request_lifecycle()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.workflow_stage_v2 IS DISTINCT FROM NEW.workflow_stage_v2 THEN
    INSERT INTO public.request_lifecycle (
      request_id, status, update_type, updated_by, update_notes, metadata
    ) VALUES (
      NEW.id, NEW.workflow_stage, 'status_change',
      COALESCE(auth.uid(), NEW.last_modified_by),
      CONCAT('Stage: ', OLD.workflow_stage_v2, ' → ', NEW.workflow_stage_v2),
      jsonb_build_object(
        'from_stage', OLD.workflow_stage_v2,
        'to_stage',   NEW.workflow_stage_v2,
        'from_status', OLD.status,
        'to_status',   NEW.status
      )
    );
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.assigned_technician_id IS DISTINCT FROM NEW.assigned_technician_id THEN
    INSERT INTO public.request_lifecycle (
      request_id, status, update_type, updated_by, update_notes, metadata
    ) VALUES (
      NEW.id, NEW.workflow_stage, 'assignment',
      COALESCE(auth.uid(), NEW.last_modified_by),
      'Technician assignment updated',
      jsonb_build_object(
        'old_technician', OLD.assigned_technician_id,
        'new_technician', NEW.assigned_technician_id
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Workflow transitions: DELETE + INSERT to avoid broken set_updated_at trigger
ALTER TABLE public.workflow_transitions DISABLE TRIGGER USER;

DELETE FROM public.workflow_transitions
WHERE to_stage = 'closed' AND from_stage IN ('completed','billed','paid');

INSERT INTO public.workflow_transitions (from_stage, to_stage, is_active)
VALUES
  ('completed',         'handover_to_admin', true),
  ('billed',            'handover_to_admin', true),
  ('paid',              'handover_to_admin', true),
  ('handover_to_admin', 'closed',            true)
ON CONFLICT (from_stage, to_stage) DO NOTHING;

ALTER TABLE public.workflow_transitions ENABLE TRIGGER USER;

-- Enforce rating before close
CREATE OR REPLACE FUNCTION public.fn_transition_request_stage(
  p_request_id uuid,
  p_to_stage workflow_stage_t,
  p_actor uuid DEFAULT auth.uid(),
  p_reason text DEFAULT NULL::text,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS workflow_stage_t LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_from public.workflow_stage_t;
  v_rating int;
  v_event_id uuid;
BEGIN
  PERFORM set_config('app.allow_stage_transition', 'on', true);

  SELECT workflow_stage_v2, rating INTO v_from, v_rating
  FROM public.maintenance_requests WHERE id = p_request_id FOR UPDATE;

  IF v_from IS NULL THEN
    RAISE EXCEPTION 'request_not_found: %', p_request_id;
  END IF;

  IF v_from = p_to_stage THEN RETURN v_from; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.workflow_transitions
    WHERE from_stage = v_from AND to_stage = p_to_stage AND is_active = true
  ) THEN
    RAISE EXCEPTION 'illegal_transition: % -> %', v_from, p_to_stage
      USING HINT = 'Path must follow: completed/billed/paid → handover_to_admin → closed';
  END IF;

  IF p_to_stage = 'closed' AND (v_rating IS NULL OR v_rating < 1 OR v_rating > 5) THEN
    RAISE EXCEPTION 'rating_required: cannot close request without rating (1-5)'
      USING HINT = 'Set maintenance_requests.rating before transitioning to closed';
  END IF;

  UPDATE public.maintenance_requests
  SET workflow_stage_v2 = p_to_stage,
      last_modified_by  = COALESCE(p_actor, last_modified_by),
      updated_at        = now()
  WHERE id = p_request_id;

  INSERT INTO public.domain_events (
    aggregate_type, aggregate_id, event_type, event_payload, actor_id
  ) VALUES (
    'maintenance_request', p_request_id, 'stage.transitioned',
    jsonb_build_object('from', v_from, 'to', p_to_stage, 'reason', p_reason, 'metadata', p_metadata),
    p_actor
  ) RETURNING id INTO v_event_id;

  RETURN p_to_stage;
END;
$$;

-- Auto-create invoice on billed
CREATE OR REPLACE FUNCTION public.fn_auto_create_invoice_on_billed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_existing uuid;
  v_amount   numeric;
BEGIN
  IF NEW.workflow_stage_v2 = 'billed'
     AND (OLD.workflow_stage_v2 IS DISTINCT FROM 'billed') THEN
    SELECT id INTO v_existing FROM public.invoices WHERE request_id = NEW.id LIMIT 1;
    IF v_existing IS NOT NULL THEN RETURN NEW; END IF;

    v_amount := COALESCE(NEW.actual_cost, NEW.estimated_cost, 0);

    INSERT INTO public.invoices (
      request_id, customer_name, customer_email, customer_phone,
      amount, subtotal, currency, status, issue_date, due_date, notes
    ) VALUES (
      NEW.id,
      COALESCE(NEW.client_name, 'عميل'),
      NEW.client_email,
      NEW.client_phone,
      v_amount, v_amount,
      'EGP', 'pending',
      CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days',
      CONCAT('فاتورة تلقائية للطلب ', COALESCE(NEW.request_number, NEW.id::text))
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mr_auto_invoice ON public.maintenance_requests;
CREATE TRIGGER trg_mr_auto_invoice
AFTER UPDATE ON public.maintenance_requests
FOR EACH ROW EXECUTE FUNCTION public.fn_auto_create_invoice_on_billed();

-- Backfill status
UPDATE public.maintenance_requests
SET status = CASE workflow_stage_v2
  WHEN 'draft' THEN 'Open'::mr_status
  WHEN 'submitted' THEN 'Open'::mr_status
  WHEN 'triaged' THEN 'Open'::mr_status
  WHEN 'assigned' THEN 'Assigned'::mr_status
  WHEN 'scheduled' THEN 'Assigned'::mr_status
  WHEN 'in_progress' THEN 'InProgress'::mr_status
  WHEN 'inspection' THEN 'InProgress'::mr_status
  WHEN 'waiting_parts' THEN 'Waiting'::mr_status
  WHEN 'on_hold' THEN 'On Hold'::mr_status
  WHEN 'completed' THEN 'Completed'::mr_status
  WHEN 'billed' THEN 'Completed'::mr_status
  WHEN 'paid' THEN 'Completed'::mr_status
  WHEN 'handover_to_admin' THEN 'Completed'::mr_status
  WHEN 'closed' THEN 'Closed'::mr_status
  WHEN 'cancelled' THEN 'Cancelled'::mr_status
  WHEN 'rejected' THEN 'Rejected'::mr_status
  ELSE status
END
WHERE workflow_stage_v2 IS NOT NULL;
