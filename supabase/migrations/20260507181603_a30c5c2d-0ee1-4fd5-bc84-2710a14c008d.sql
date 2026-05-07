
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS discount_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vat_rate numeric NOT NULL DEFAULT 14,
  ADD COLUMN IF NOT EXISTS withholding_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pdf_url text,
  ADD COLUMN IF NOT EXISTS sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz;

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS total_amount numeric
  GENERATED ALWAYS AS (
    COALESCE(subtotal, amount, 0)
    - COALESCE(discount_amount, 0)
    + COALESCE(tax_amount, 0)
    - COALESCE(withholding_amount, 0)
  ) STORED;

CREATE OR REPLACE FUNCTION public.fn_invoice_set_paid_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'paid' AND (OLD.status IS DISTINCT FROM 'paid') AND NEW.paid_at IS NULL THEN
    NEW.paid_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_invoice_paid_at ON public.invoices;
CREATE TRIGGER trg_invoice_paid_at
BEFORE UPDATE ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.fn_invoice_set_paid_at();

DROP POLICY IF EXISTS invoices_finance_insert ON public.invoices;
CREATE POLICY invoices_finance_insert ON public.invoices
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_role(auth.uid(), 'manager'::app_role) OR
    public.has_role(auth.uid(), 'finance'::app_role) OR
    public.has_role(auth.uid(), 'accounting'::app_role)
  );

DROP POLICY IF EXISTS invoices_finance_update ON public.invoices;
CREATE POLICY invoices_finance_update ON public.invoices
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_role(auth.uid(), 'manager'::app_role) OR
    public.has_role(auth.uid(), 'finance'::app_role) OR
    public.has_role(auth.uid(), 'accounting'::app_role)
  );

CREATE OR REPLACE VIEW public.v_invoices_dashboard
WITH (security_invoker = true) AS
SELECT
  i.id,
  i.invoice_number,
  i.customer_name,
  i.amount,
  i.subtotal,
  i.discount_amount,
  i.tax_amount,
  i.vat_rate,
  i.withholding_amount,
  i.total_amount,
  i.currency,
  i.status,
  i.issue_date,
  i.due_date,
  i.paid_at,
  i.sent_at,
  i.request_id,
  CASE
    WHEN i.status = 'paid' THEN 'paid'
    WHEN i.due_date IS NOT NULL AND i.due_date < CURRENT_DATE THEN 'overdue'
    WHEN i.status = 'pending' THEN 'pending'
    ELSE i.status
  END AS computed_status,
  COALESCE((
    SELECT SUM(pt.amount) FROM public.payment_transactions pt
    WHERE pt.invoice_id = i.id AND pt.status = 'paid'
  ), 0) AS paid_via_gateway,
  i.created_at
FROM public.invoices i;

CREATE OR REPLACE VIEW public.v_payments_dashboard
WITH (security_invoker = true) AS
SELECT
  pt.id,
  pt.cart_id,
  pt.tran_ref,
  pt.provider,
  pt.amount,
  pt.currency,
  pt.status,
  pt.paid_at,
  pt.invoice_id,
  pt.request_id,
  pt.customer_name,
  pt.customer_email,
  pt.customer_phone,
  i.invoice_number,
  pt.created_at
FROM public.payment_transactions pt
LEFT JOIN public.invoices i ON i.id = pt.invoice_id;
