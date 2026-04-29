-- Add request linkage and tax fields to invoices
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS request_id uuid REFERENCES public.maintenance_requests(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS subtotal numeric,
  ADD COLUMN IF NOT EXISTS tax_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_rate numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS items jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS company_name text DEFAULT 'UberFix',
  ADD COLUMN IF NOT EXISTS company_address text,
  ADD COLUMN IF NOT EXISTS company_phone text,
  ADD COLUMN IF NOT EXISTS company_tax_id text;

CREATE INDEX IF NOT EXISTS idx_invoices_request_id ON public.invoices(request_id);

-- Public RPC to fetch invoice by maintenance request id (no auth required)
CREATE OR REPLACE FUNCTION public.public_get_invoice_by_request(p_request_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice jsonb;
  v_request jsonb;
BEGIN
  -- Fetch invoice linked to this request (latest)
  SELECT to_jsonb(i.*) INTO v_invoice
  FROM public.invoices i
  WHERE i.request_id = p_request_id
  ORDER BY i.created_at DESC
  LIMIT 1;

  -- Fetch sanitized request data
  SELECT jsonb_build_object(
    'id', mr.id,
    'request_number', mr.request_number,
    'title', mr.title,
    'service_type', mr.service_type,
    'client_name', mr.client_name,
    'client_phone', mr.client_phone,
    'location', mr.location,
    'workflow_stage', mr.workflow_stage,
    'created_at', mr.created_at,
    'estimated_cost', mr.estimated_cost,
    'actual_cost', mr.actual_cost
  ) INTO v_request
  FROM public.maintenance_requests mr
  WHERE mr.id = p_request_id;

  IF v_request IS NULL THEN
    RETURN jsonb_build_object('error', 'request_not_found');
  END IF;

  RETURN jsonb_build_object(
    'request', v_request,
    'invoice', v_invoice
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.public_get_invoice_by_request(uuid) TO anon, authenticated;