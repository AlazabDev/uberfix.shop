
CREATE OR REPLACE VIEW public.v_sla_dashboard
WITH (security_invoker = true) AS
SELECT
  mr.id, mr.request_number, mr.title, mr.priority, mr.workflow_stage, mr.status,
  mr.created_at, mr.sla_accept_due, mr.sla_arrive_due, mr.sla_complete_due,
  CASE
    WHEN mr.sla_accept_due IS NULL THEN 'n/a'
    WHEN mr.workflow_stage <> 'submitted' THEN 'met'
    WHEN mr.sla_accept_due < now() THEN 'overdue'
    WHEN mr.sla_accept_due < now() + interval '1 hour' THEN 'at_risk'
    ELSE 'on_time' END AS accept_state,
  CASE
    WHEN mr.sla_arrive_due IS NULL THEN 'n/a'
    WHEN mr.workflow_stage NOT IN ('assigned','accepted') THEN 'met'
    WHEN mr.sla_arrive_due < now() THEN 'overdue'
    WHEN mr.sla_arrive_due < now() + interval '1 hour' THEN 'at_risk'
    ELSE 'on_time' END AS arrive_state,
  CASE
    WHEN mr.sla_complete_due IS NULL THEN 'n/a'
    WHEN mr.status::text IN ('Completed','Cancelled','Closed','Rejected') THEN 'met'
    WHEN mr.sla_complete_due < now() THEN 'overdue'
    WHEN mr.sla_complete_due < now() + interval '2 hours' THEN 'at_risk'
    ELSE 'on_time' END AS complete_state,
  CASE
    WHEN (mr.sla_accept_due IS NOT NULL AND mr.sla_accept_due < now() AND mr.workflow_stage = 'submitted')
      OR (mr.sla_arrive_due IS NOT NULL AND mr.sla_arrive_due < now() AND mr.workflow_stage IN ('assigned','accepted'))
      OR (mr.sla_complete_due IS NOT NULL AND mr.sla_complete_due < now() AND mr.status::text NOT IN ('Completed','Cancelled','Closed','Rejected'))
    THEN 'overdue'
    WHEN (mr.sla_accept_due IS NOT NULL AND mr.sla_accept_due < now() + interval '1 hour' AND mr.workflow_stage = 'submitted')
      OR (mr.sla_arrive_due IS NOT NULL AND mr.sla_arrive_due < now() + interval '1 hour' AND mr.workflow_stage IN ('assigned','accepted'))
      OR (mr.sla_complete_due IS NOT NULL AND mr.sla_complete_due < now() + interval '2 hours' AND mr.status::text NOT IN ('Completed','Cancelled','Closed','Rejected'))
    THEN 'at_risk'
    ELSE 'on_time' END AS overall_sla_state
FROM public.maintenance_requests mr
WHERE mr.status::text NOT IN ('Cancelled','Closed');

CREATE OR REPLACE VIEW public.v_sla_compliance_summary
WITH (security_invoker = true) AS
SELECT
  COALESCE(mr.priority::text, 'unknown') AS priority,
  mr.workflow_stage,
  COUNT(*) AS total_requests,
  COUNT(*) FILTER (
    WHERE mr.sla_complete_due IS NOT NULL AND mr.status::text IN ('Completed','Closed')
      AND mr.closed_at IS NOT NULL AND mr.closed_at <= mr.sla_complete_due
  ) AS completed_on_time,
  COUNT(*) FILTER (
    WHERE mr.sla_complete_due IS NOT NULL AND mr.status::text IN ('Completed','Closed')
      AND mr.closed_at IS NOT NULL AND mr.closed_at > mr.sla_complete_due
  ) AS completed_late,
  ROUND(
    100.0 * NULLIF(COUNT(*) FILTER (
      WHERE mr.sla_complete_due IS NOT NULL AND mr.status::text IN ('Completed','Closed')
        AND mr.closed_at IS NOT NULL AND mr.closed_at <= mr.sla_complete_due
    ), 0) / NULLIF(COUNT(*) FILTER (WHERE mr.status::text IN ('Completed','Closed') AND mr.sla_complete_due IS NOT NULL), 0),
    2
  ) AS compliance_rate_pct
FROM public.maintenance_requests mr
WHERE mr.created_at >= now() - interval '30 days'
GROUP BY mr.priority, mr.workflow_stage;

CREATE OR REPLACE VIEW public.v_reports_overview
WITH (security_invoker = true) AS
WITH req_monthly AS (
  SELECT
    date_trunc('month', mr.created_at)::date AS month,
    COUNT(*) AS total_requests,
    COUNT(*) FILTER (WHERE mr.status::text IN ('Completed','Closed')) AS completed_requests,
    COUNT(*) FILTER (WHERE mr.status::text NOT IN ('Completed','Cancelled','Closed','Rejected')) AS active_requests,
    COUNT(*) FILTER (WHERE mr.status::text = 'Cancelled') AS cancelled_requests,
    ROUND(
      AVG(EXTRACT(EPOCH FROM (mr.closed_at - mr.created_at)) / 3600.0)
      FILTER (WHERE mr.status::text IN ('Completed','Closed') AND mr.closed_at IS NOT NULL),
      2
    ) AS avg_completion_hours
  FROM public.maintenance_requests mr
  WHERE mr.created_at >= now() - interval '12 months'
  GROUP BY date_trunc('month', mr.created_at)
),
rev_monthly AS (
  SELECT date_trunc('month', i.paid_at)::date AS month, SUM(i.total_amount) AS revenue
  FROM public.invoices i
  WHERE i.status = 'paid' AND i.paid_at IS NOT NULL
    AND i.paid_at >= now() - interval '12 months'
  GROUP BY date_trunc('month', i.paid_at)
)
SELECT r.month, r.total_requests, r.completed_requests, r.active_requests,
       r.cancelled_requests, r.avg_completion_hours, COALESCE(rv.revenue, 0) AS revenue
FROM req_monthly r
LEFT JOIN rev_monthly rv ON rv.month = r.month
ORDER BY r.month DESC;

CREATE OR REPLACE VIEW public.v_audit_dashboard
WITH (security_invoker = true) AS
SELECT
  al.id, al.created_at, al.action, al.table_name, al.record_id, al.user_id,
  p.full_name AS actor_name, al.old_values, al.new_values
FROM public.audit_logs al
LEFT JOIN public.profiles p ON p.id = al.user_id
ORDER BY al.created_at DESC;

CREATE INDEX IF NOT EXISTS idx_mr_closed_at ON public.maintenance_requests(closed_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
