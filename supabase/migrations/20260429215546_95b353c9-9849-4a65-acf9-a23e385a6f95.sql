-- PayTabs payment transactions tracking
CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE,
  request_id UUID REFERENCES public.maintenance_requests(id) ON DELETE SET NULL,
  cart_id TEXT NOT NULL UNIQUE,
  provider TEXT NOT NULL DEFAULT 'paytabs',
  tran_ref TEXT,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EGP',
  status TEXT NOT NULL DEFAULT 'pending',
  payment_url TEXT,
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  raw_response JSONB,
  callback_payload JSONB,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_tx_invoice ON public.payment_transactions(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payment_tx_request ON public.payment_transactions(request_id);
CREATE INDEX IF NOT EXISTS idx_payment_tx_status ON public.payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_tx_tran_ref ON public.payment_transactions(tran_ref);

ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

-- Only admins can view all; service_role bypasses RLS
CREATE POLICY "Admins view payment transactions"
ON public.payment_transactions FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER trg_payment_tx_updated_at
BEFORE UPDATE ON public.payment_transactions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Public RPC: fetch latest payment status for invoice (used by PublicInvoice page polling)
CREATE OR REPLACE FUNCTION public.public_get_payment_status(p_request_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'status', pt.status,
    'tran_ref', pt.tran_ref,
    'amount', pt.amount,
    'paid_at', pt.paid_at,
    'cart_id', pt.cart_id
  ) INTO v_result
  FROM public.payment_transactions pt
  WHERE pt.request_id = p_request_id
  ORDER BY pt.created_at DESC
  LIMIT 1;

  RETURN COALESCE(v_result, '{"status":"none"}'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION public.public_get_payment_status(UUID) TO anon, authenticated;