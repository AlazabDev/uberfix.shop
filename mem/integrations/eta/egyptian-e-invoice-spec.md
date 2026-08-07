---
name: Egyptian e-Invoice (ETA) Integration
description: ETA e-invoicing integration — env switch, local CMS signing service, EGS item code, eta_settings/eta_submissions tables, eta-invoice edge function
type: feature
---
# ETA (الفاتورة الإلكترونية المصرية)

- Scope: sales invoices only (documentType `I`, version `1.0`).
- Environments switchable from settings: `preprod` (id.preprod.eta.gov.eg / api.preprod.invoicing.eta.gov.eg) and `production` (id.eta.gov.eg / api.invoicing.eta.gov.eg).
- Credentials as secrets: `ETA_CLIENT_ID` / `ETA_CLIENT_SECRET` (preprod), `ETA_CLIENT_ID_PROD` / `ETA_CLIENT_SECRET_PROD`, `ETA_SIGNING_SERVICE_TOKEN`.
- Signing: local signing service (customer-hosted, e-Signature token). Edge function serializes the document with ETA canonical serialization (`supabase/functions/eta-invoice/serialize.ts`) and POSTs `{ serialized }` to `eta_settings.signing_service_url`, expecting `{ signature }` (CMS base64) → attached as `signatures: [{ signatureType: "I", value }]`.
- Default item code (EGS): `EG-577219804-1075`, name `Maintenance/Repair Services`, unit `EA`, tax T1 sub-type `V009`, VAT from `invoices.vat_rate` (default 14%).
- Tables: `eta_settings` (single config row, admin/owner write), `eta_submissions` (audit log, staff read only, service_role writes).
- Invoice tracking columns: `eta_status`, `eta_uuid`, `eta_long_id`, `eta_submission_uuid`, `eta_internal_id`, `eta_submitted_at`, `eta_error`, `eta_environment`. Exposed via `invoices_safe`.
- Edge function `eta-invoice` actions: `test_connection`, `submit`, `status`. Staff-only (admin/owner/manager/finance/accounting) validated in code (`verify_jwt = false`).
- UI: Settings → التكاملات → ETA panel; per-invoice submit button in `InvoiceCard`.