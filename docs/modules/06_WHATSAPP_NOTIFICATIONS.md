# Module #6 — WhatsApp & Notifications (CLOSED 2026-05-07)

## Tables (existing)
- `notifications` — in-app notification center (recipient_id, entity_id, read_at, whatsapp_sent, sms_sent, message_log_id).
- `outbound_messages` — unified outbound delivery pipeline (channel, template_key, status, retry_count, sent/delivered/read/failed timestamps).
- `message_logs` — legacy/external delivery log per request (provider, channel, notification_stage).
- `wa_templates` — Meta WhatsApp template registry (status, quality, components, language).
- `wa_stage_template_map` — workflow stage → template binding (with fallback_template_key, priority).
- `wa_template_events`, `wa_messages`, `whatsapp_messages`, `whatsapp_media_storage` — WA inbox / media.

## Dashboards (security_invoker views) — NEW
- `v_notifications_dashboard` — read_state (unread/read), channel flags, entity link.
- `v_outbound_messages_dashboard` — derived `lifecycle_state` (pending → sent → delivered → read | failed).
- `v_wa_templates_dashboard` — template status + `used_last_30d` + `last_used_at`.

## Engine
- Edge function `send-maintenance-notification` resolves stage → `wa_stage_template_map` → template → `outbound_messages`.
- HMAC-validated Meta webhook updates `outbound_messages` lifecycle.
- See `mem://architecture/unified-notification-engine-spec`.

## RLS
- All four tables already enforce strict RLS (admin/manager + recipient self-read).
- New views inherit caller's RLS via `security_invoker = true`.
