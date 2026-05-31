---
name: Customers Module Closure
description: Module #10 sealed 2026-05-31 — customers table with UF-CUS-{SEQ}, auto-link triggers on requests/invoices via normalized phone, v_customers_dashboard, /customers + /customers/:id
type: feature
---
- Table: public.customers (phone UNIQUE E.164, customer_code UF-CUS-{SEQ:6})
- normalize_phone() helper enforces +20 prefix
- maintenance_requests.customer_id + invoices.customer_id FKs added
- Triggers: trg_mr_link_customer (BEFORE INS/UPD on client_phone) → upserts customer; trg_inv_link_customer mirrors from request or upserts via customer_phone
- Backfill complete: 10 customers, 2357/2358 requests linked, 2358/2359 invoices linked
- View: v_customers_dashboard (requests_count, invoices_count, total_billed/paid/outstanding, avg_rating, last_request_at)
- RLS: select for admin/manager/staff/accounting/finance/dispatcher/owner; modify admin/manager only
- Routes: /customers (list), /customers/:id (full record)
