---
name: Reports & SLA Closure
description: Module #8 sealed 2026-05-08 — SLA & reporting dashboard views over maintenance_requests, invoices, audit_logs
type: feature
---
Module #8 (Reports & SLA) closed on 2026-05-08.

Views (all security_invoker):
- v_sla_dashboard — per-request accept/arrive/complete/overall SLA state (on_time/at_risk/overdue/met/n/a)
- v_sla_compliance_summary — last 30d compliance rate by priority+workflow_stage
- v_reports_overview — last 12 months KPIs + revenue from paid invoices
- v_audit_dashboard — audit_logs joined with profiles.full_name (profiles.id = al.user_id)

Status values used: 'Completed','Closed','Cancelled','Rejected' (mr_status enum is PascalCase).
Completion = closed_at column. SLA columns: sla_accept_due / sla_arrive_due / sla_complete_due.
Indexes added: idx_mr_closed_at, idx_audit_logs_created_at.
