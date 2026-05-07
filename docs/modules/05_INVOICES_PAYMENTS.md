# Module #5 — Invoices & Payments (CLOSED 2026-05-07)

## Schema additions on `invoices`
- `discount_amount` numeric default 0
- `vat_rate` numeric default 14 (قانون 67/2016)
- `withholding_amount` numeric default 0 (خصم وإضافة)
- `total_amount` GENERATED = subtotal − discount + tax − withholding (fallback to `amount`)
- `pdf_url`, `sent_at`, `paid_at`

## Triggers
- `fn_invoice_set_paid_at` → stamps `paid_at = now()` whenever status flips to `paid`.
- `set_invoice_number` auto-generates `UF-INV-YY-NNNN` via `generate_unified_serial`.

## RLS
- Read: `invoices_select_strict` (authenticated).
- Write: admins, managers, finance, accounting (new policies `invoices_finance_insert/update`).
- `payment_transactions`: admin + service_role only.

## Dashboards (security_invoker)
- `v_invoices_dashboard`: per-invoice totals + computed_status (paid/overdue/pending) + paid_via_gateway.
- `v_payments_dashboard`: gateway transactions joined to invoice_number.

## Payment gateway
- PayTabs Egypt: `paytabs-create-payment` + `paytabs-callback` (HMAC SHA-256, `PAYTABS_SERVER_KEY`).
- Callback: invoice→paid → request stage billed→paid via `transition_request_stage` → `payment_received` notification.

## Numbering
- Invoices: `UF-INV-{YY}-{SEQ4}`. PayTabs cart_id: `UF-{invoice_number}-{ts}`.
