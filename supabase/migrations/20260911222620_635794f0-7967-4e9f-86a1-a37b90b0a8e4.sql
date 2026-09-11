
CREATE INDEX IF NOT EXISTS idx_mr_branch_id ON public.maintenance_requests(branch_id);
CREATE INDEX IF NOT EXISTS idx_mr_assigned_tech ON public.maintenance_requests(assigned_technician_id);
CREATE INDEX IF NOT EXISTS idx_mr_category ON public.maintenance_requests(category_id);
CREATE INDEX IF NOT EXISTS idx_mr_service_type ON public.maintenance_requests(service_type);
CREATE INDEX IF NOT EXISTS idx_mr_stage_v2 ON public.maintenance_requests(workflow_stage_v2);

CREATE OR REPLACE VIEW public.v_maintenance_requests_full
WITH (security_invoker = true) AS
SELECT
  m.id,
  m.request_number,
  m.title,
  m.description,
  m.priority,
  m.status,
  m.workflow_stage_v2 AS stage,
  m.request_status_derived AS status_group,
  m.service_type,
  sc.name              AS category_name,
  m.company_id,
  co.name              AS company_name,
  m.branch_id,
  b.name               AS branch_name,
  b.city               AS branch_city,
  m.customer_id,
  m.client_name,
  m.location,
  m.assigned_technician_id,
  t.name               AS technician_name,
  t.specialization     AS technician_specialization,
  m.rating,
  m.estimated_cost,
  m.actual_cost,
  COALESCE(it.items_count, 0)  AS items_count,
  COALESCE(it.items_total, 0)  AS items_total,
  i.id                 AS invoice_id,
  i.invoice_number,
  i.status             AS invoice_status,
  COALESCE(i.total_amount, i.amount, 0) AS invoice_amount,
  i.paid_at,
  m.created_at,
  m.closed_at,
  m.updated_at,
  date_trunc('month', m.created_at)::date AS created_month
FROM public.maintenance_requests m
LEFT JOIN public.branches b          ON b.id = m.branch_id
LEFT JOIN public.companies co        ON co.id = m.company_id
LEFT JOIN public.service_categories sc ON sc.id = m.category_id
LEFT JOIN public.technicians t       ON t.id = m.assigned_technician_id
LEFT JOIN LATERAL (
  SELECT count(*) AS items_count, sum(COALESCE(mi.line_total, mi.quantity * mi.unit_price, 0)) AS items_total
  FROM public.maintenance_request_items mi WHERE mi.request_id = m.id
) it ON true
LEFT JOIN LATERAL (
  SELECT inv.* FROM public.invoices inv WHERE inv.request_id = m.id
  ORDER BY inv.created_at DESC LIMIT 1
) i ON true;

GRANT SELECT ON public.v_maintenance_requests_full TO authenticated;
