# Module #4 — Service Catalog & Inventory (CLOSED 2026-05-07)

## Schema additions
- `services`: `vat_rate` (default 14%), `withholding_rate` (default 1%), `sku`, `barcode`, auto code `UF-SVC-{SEQ}`.
- `inventory_warehouses`: `UF-WH-{SEQ}`, branch link, manager, geo, active flag.
- `inventory_items`: `UF-INV-{SEQ}`, AR/EN names, category, unit, cost/sell, VAT/WHT, barcode, reorder_level, image.
- `inventory_stock`: per (item, warehouse) running balance.
- `inventory_movements`: `UF/MOV/{YYMMDD}/{SEQ}`, types `in/out/adjust/transfer`, optional `request_id` link, generated `total_cost`.

## Triggers
- Auto-codes for services / warehouses / items / movements.
- `fn_apply_inventory_movement`: keeps `inventory_stock` in sync after each movement.

## RLS
- Read for all authenticated users.
- Write for `admin / manager / warehouse`.
- Movement INSERT also allowed for `technician` (consume parts on-site).
- UPDATE / DELETE on movements restricted to `admin`.

## Dashboards (security_invoker views)
- `v_inventory_dashboard`: per-item totals, warehouse count, stock_status (`out_of_stock | low_stock | ok`).
- `v_service_catalog_dashboard`: per-service usage count and total revenue from invoices.

## Tax compliance
- VAT default 14% — قانون 67/2016 / 206/2020.
- Withholding (خصم وإضافة) default 1%.
- Both fields editable per service / item.