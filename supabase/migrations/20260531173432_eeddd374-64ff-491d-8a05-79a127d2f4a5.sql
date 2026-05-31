-- ========================================
-- INVOICES OPERATIONAL HARDENING MIGRATION
-- ========================================

-- 1) Set due_date for pending invoices (Net-30 standard term)
UPDATE public.invoices
SET due_date = issue_date + INTERVAL '30 days'
WHERE status = 'pending' AND due_date IS NULL;

-- 2) Convert zero-amount invoices to draft (awaiting pricing)
UPDATE public.invoices
SET status = 'draft',
    notes = COALESCE(notes,'') || ' — بانتظار تسعير من الفني'
WHERE COALESCE(amount, 0) = 0 AND status IN ('pending','paid');

-- 3) Stamp paid_at for paid invoices missing it
UPDATE public.invoices
SET paid_at = COALESCE(updated_at, created_at, now())
WHERE status = 'paid' AND paid_at IS NULL;

-- 4) Sync subtotal where missing
UPDATE public.invoices
SET subtotal = amount
WHERE subtotal IS NULL;

-- 5) Sync invoice status with closed/paid maintenance requests
UPDATE public.invoices i
SET status = 'paid',
    paid_at = COALESCE(i.paid_at, now())
FROM public.maintenance_requests mr
WHERE i.request_id = mr.id
  AND mr.workflow_stage_v2::text IN ('paid','closed')
  AND i.status = 'pending'
  AND COALESCE(i.amount,0) > 0;

-- 6) Cancel invoices for cancelled/rejected requests
UPDATE public.invoices i
SET status = 'cancelled',
    notes = COALESCE(i.notes,'') || ' — أُلغي الطلب الأصلي'
FROM public.maintenance_requests mr
WHERE i.request_id = mr.id
  AND mr.workflow_stage_v2::text IN ('cancelled','rejected')
  AND i.status NOT IN ('cancelled','void','paid');

-- ========================================
-- PREVENTIVE TRIGGERS (forward-looking)
-- ========================================

-- 7) Auto-set due_date = issue_date + 30 days on insert if null
CREATE OR REPLACE FUNCTION public.fn_invoice_set_defaults()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.due_date IS NULL AND NEW.issue_date IS NOT NULL THEN
    NEW.due_date := NEW.issue_date + INTERVAL '30 days';
  END IF;

  IF NEW.subtotal IS NULL THEN
    NEW.subtotal := NEW.amount;
  END IF;

  -- Zero-amount invoices start as draft
  IF COALESCE(NEW.amount,0) = 0 AND NEW.status IS NULL THEN
    NEW.status := 'draft';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_invoice_defaults ON public.invoices;
CREATE TRIGGER trg_invoice_defaults
BEFORE INSERT ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.fn_invoice_set_defaults();