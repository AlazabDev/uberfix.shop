---
name: Historical Requests Lifecycle Completion
description: 2,759 maintenance requests normalized (branch/trade/technician/items), driven through full lifecycle to closed with priced invoices; test requests deleted; no archiving concept — closed_at only
type: feature
---
- Archiving rejected by user: `fn_handle_request_closure` no longer sets `archived_at`; only `closed_at`. All `archived_at` cleared.
- `fn_backfill_lifecycle_batch(int)` (service_role only) walks requests: submitted→triaged→assigned→scheduled→in_progress→inspection→completed→billed→paid→handover_to_admin→closed, sets rating 5 default, disables WhatsApp + Daftra triggers during backfill.
- Deletion of maintenance_requests is blocked by `trg_block_mr_delete`; escape hatch only: `select set_config('app.allow_request_delete','on',false)` in the same transaction (used 2026-09-12 to remove 141 test requests whose invoices were zero-value draft/pending).
- Current state (2026-09-12): 2,759 requests, 2,759 invoices, all paid, total `5,256,635.00` EGP. No unpriced/pricing-gap rows remain — real figures live in the accounting system with minor variances.
- Abu Auf branches: matched by normalized Arabic location text; 13 missing branches created. Abu Auf company id 40e8ce3d-efc0-4141-a96e-198537fe46c9.
- Trade classification: keyword→specialization map sets `service_type`, `category_id`, and round-robin technician per specialization.
- ~2,296 legacy rows have no branch data → branch "سجلات سابقة - فرع غير محدد", customer "عميل سجلات سابقة".
- View `v_maintenance_requests_full` (security_invoker) + page `/requests-ledger` with server-side filters (branch, trade, stage, invoice status, search) and pagination.
