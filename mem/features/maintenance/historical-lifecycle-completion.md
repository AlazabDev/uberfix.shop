---
name: Historical Requests Lifecycle Completion
description: 2,900 maintenance requests normalized (branch/trade/technician/items), driven through full lifecycle to closed with invoices; no archiving concept — closed_at only
type: feature
---
- Archiving rejected by user: `fn_handle_request_closure` no longer sets `archived_at`; only `closed_at`. All `archived_at` cleared.
- `fn_backfill_lifecycle_batch(int)` (service_role only) walks requests: submitted→triaged→assigned→scheduled→in_progress→inspection→completed→billed→paid→handover_to_admin→closed, sets rating 5 default, disables WhatsApp + Daftra triggers during backfill.
- Result: 2,899 closed, 1 cancelled; 2,900 invoices (2,758 paid = 5,256,635 EGP; 136 draft with zero value = needs pricing).
- Abu Auf branches: matched by normalized Arabic location text; 13 missing branches created (المقر الإداري، زهران ماركت أكتوبر، فروع المنصورة/بنها...). Abu Auf company id 40e8ce3d-efc0-4141-a96e-198537fe46c9.
- Trade classification: keyword→specialization map (كهرباء/سباكة/نجارة/تكييف/دهانات/أرضيات/زجاج/حريق/شبكات/لافتات...) sets `service_type`, `category_id`, and round-robin technician per specialization.
- 2,296 legacy rows have no branch data → branch "سجلات سابقة - فرع غير محدد", customer "عميل سجلات سابقة".
- View `v_maintenance_requests_full` (security_invoker) + page `/requests-ledger` with server-side filters (branch, trade, stage, invoice status, search) and pagination.
