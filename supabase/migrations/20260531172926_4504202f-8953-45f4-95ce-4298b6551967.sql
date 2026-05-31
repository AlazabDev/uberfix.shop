-- Backfill: create one invoice per maintenance_request that doesn't have one yet
-- Price source: actual_cost, fallback estimated_cost, fallback 0
-- Date source: created_at::date
-- Status: paid if request is paid/closed, otherwise pending

INSERT INTO public.invoices (
  request_id,
  customer_name,
  customer_email,
  customer_phone,
  amount,
  subtotal,
  currency,
  issue_date,
  status,
  notes,
  created_at,
  updated_at
)
SELECT
  mr.id,
  COALESCE(NULLIF(TRIM(mr.client_name), ''), 'عميل غير معروف'),
  mr.client_email,
  mr.client_phone,
  COALESCE(mr.actual_cost, mr.estimated_cost, 0)::numeric,
  COALESCE(mr.actual_cost, mr.estimated_cost, 0)::numeric,
  'EGP',
  mr.created_at::date,
  CASE
    WHEN mr.workflow_stage_v2::text IN ('paid','closed') THEN 'paid'
    WHEN mr.workflow_stage_v2::text IN ('billed') THEN 'pending'
    ELSE 'pending'
  END,
  CONCAT('فاتورة آلية للطلب ', COALESCE(mr.request_number, mr.id::text)),
  mr.created_at,
  now()
FROM public.maintenance_requests mr
WHERE NOT EXISTS (
  SELECT 1 FROM public.invoices i WHERE i.request_id = mr.id
);