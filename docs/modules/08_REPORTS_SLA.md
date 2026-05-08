# Module #8 — Reports & SLA (CLOSED 2026-05-08)

## Views (security_invoker)
- **v_sla_dashboard** — per-request SLA state (accept/arrive/complete/overall): on_time | at_risk | overdue | met | n/a
- **v_sla_compliance_summary** — last 30 days, grouped by priority + workflow_stage; compliance_rate_pct
- **v_reports_overview** — monthly KPIs (12 months): total/completed/active/cancelled requests, avg_completion_hours, revenue (from paid invoices)
- **v_audit_dashboard** — recent audit_logs joined with profiles.full_name as actor_name

## SLA Source
- `maintenance_requests.sla_accept_due` / `sla_arrive_due` / `sla_complete_due` (auto-computed via existing trigger from `sla_policies`)
- Completion timestamp = `closed_at`
- Status enum values used: 'Completed','Closed','Cancelled','Rejected'

## At-risk thresholds
- Accept/Arrive: <1h to deadline
- Complete: <2h to deadline

## Indexes
- `idx_mr_closed_at`, `idx_audit_logs_created_at`

## Frontend integration points
- `/reports/sla` → SLADashboard.tsx (already wired to maintenance_requests; can switch to v_sla_dashboard)
- `/reports` → Reports.tsx (mock data; can switch to v_reports_overview)
