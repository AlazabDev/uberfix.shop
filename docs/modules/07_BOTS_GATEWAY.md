# Module #7 — Bots Gateway (Closed)

Sealed: 2026-05-08

## Scope
Single entry point for all 5 bots (azabot, uberfix_bot, laban_alasfour_bot, brands_identity_bot, luxury_finishing_bot) via `bot-gateway` Edge Function authenticated by `x-api-key`.

## Tables
- `api_consumers` — bot identities, hashed keys, rate limits, scopes
- `api_gateway_logs` — every request (PII masked via `api_gateway_logs_masked`)
- `api_idempotency_keys` — replay protection
- `api_webhook_subscriptions` / `api_webhook_deliveries` — outbound events with HMAC
- `bot_sessions` — short-lived conversational context

## Operational Dashboards (security_invoker)
- `v_api_consumers_dashboard` — activity_state + 24h/7d request & error counts
- `v_api_gateway_logs_dashboard` — outcome + latency_band + consumer name
- `v_api_webhooks_dashboard` — health_state + 24h delivery/failure counts
- `v_bot_sessions_dashboard` — lifecycle_state (active/idle/stale/expired)

## Edge Function
`supabase/functions/bot-gateway/index.ts` — 14 actions (create_request, check_status, list_technicians, list_services, get_branches, get_quote, …) routed by `action` field.

## Admin UI
`/admin/api-gateway` — `ApiGatewayPortal` with tabs: Consumers, Webhooks, Logs, OpenAPI, Docs.

## Governance
- Rate limit: 120 req/min per key
- All requests logged with phone redaction
- HMAC SHA-256 signing for outbound webhooks
- Keys stored as `api_key_hash` + 8-char prefix only

See `docs/UF_API_ENDPOINTS.md` and `docs/BOTS_API_INTEGRATION_GUIDE.md`.