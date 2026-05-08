-- Module #7: Bots Gateway — Operational dashboards & governance views

-- 1) API Consumers Dashboard
CREATE OR REPLACE VIEW public.v_api_consumers_dashboard
WITH (security_invoker = true) AS
SELECT
  c.id,
  c.name,
  c.channel,
  c.auth_type,
  c.api_key_prefix,
  c.is_active,
  c.rate_limit_per_minute,
  c.scopes,
  c.allowed_origins,
  c.storage_target,
  c.total_requests,
  c.last_used_at,
  c.last_rotated_at,
  c.created_at,
  c.updated_at,
  CASE
    WHEN c.is_active = false THEN 'disabled'
    WHEN c.last_used_at IS NULL THEN 'never_used'
    WHEN c.last_used_at < now() - interval '30 days' THEN 'idle'
    WHEN c.last_used_at < now() - interval '7 days' THEN 'low_activity'
    ELSE 'active'
  END AS activity_state,
  COALESCE((
    SELECT count(*) FROM public.api_gateway_logs l
    WHERE l.consumer_id = c.id AND l.created_at >= now() - interval '24 hours'
  ),0) AS requests_last_24h,
  COALESCE((
    SELECT count(*) FROM public.api_gateway_logs l
    WHERE l.consumer_id = c.id AND l.created_at >= now() - interval '7 days'
  ),0) AS requests_last_7d,
  COALESCE((
    SELECT count(*) FROM public.api_gateway_logs l
    WHERE l.consumer_id = c.id AND l.status_code >= 400 AND l.created_at >= now() - interval '24 hours'
  ),0) AS errors_last_24h
FROM public.api_consumers c;

-- 2) API Gateway Logs Dashboard
CREATE OR REPLACE VIEW public.v_api_gateway_logs_dashboard
WITH (security_invoker = true) AS
SELECT
  l.id,
  l.request_id,
  l.consumer_id,
  c.name AS consumer_name,
  c.channel AS consumer_channel,
  l.consumer_type,
  l.route,
  l.method,
  l.status_code,
  CASE
    WHEN l.status_code BETWEEN 200 AND 299 THEN 'success'
    WHEN l.status_code BETWEEN 300 AND 399 THEN 'redirect'
    WHEN l.status_code BETWEEN 400 AND 499 THEN 'client_error'
    WHEN l.status_code >= 500 THEN 'server_error'
    ELSE 'unknown'
  END AS outcome,
  l.duration_ms,
  CASE
    WHEN l.duration_ms IS NULL THEN 'n/a'
    WHEN l.duration_ms < 200 THEN 'fast'
    WHEN l.duration_ms < 1000 THEN 'normal'
    WHEN l.duration_ms < 3000 THEN 'slow'
    ELSE 'very_slow'
  END AS latency_band,
  l.client_ip,
  l.user_agent,
  l.response_size,
  l.created_at
FROM public.api_gateway_logs l
LEFT JOIN public.api_consumers c ON c.id = l.consumer_id;

-- 3) Webhook Subscriptions Dashboard
CREATE OR REPLACE VIEW public.v_api_webhooks_dashboard
WITH (security_invoker = true) AS
SELECT
  w.id,
  w.consumer_id,
  c.name AS consumer_name,
  w.endpoint_url,
  w.event_types,
  w.is_active,
  w.description,
  w.last_delivery_at,
  w.last_delivery_status,
  w.failure_count,
  CASE
    WHEN w.is_active = false THEN 'disabled'
    WHEN w.failure_count >= 10 THEN 'failing'
    WHEN w.failure_count >= 3 THEN 'degraded'
    WHEN w.last_delivery_at IS NULL THEN 'pending'
    ELSE 'healthy'
  END AS health_state,
  COALESCE((
    SELECT count(*) FROM public.api_webhook_deliveries d
    WHERE d.subscription_id = w.id AND d.created_at >= now() - interval '24 hours'
  ),0) AS deliveries_last_24h,
  COALESCE((
    SELECT count(*) FROM public.api_webhook_deliveries d
    WHERE d.subscription_id = w.id AND d.status = 'failed' AND d.created_at >= now() - interval '24 hours'
  ),0) AS failures_last_24h,
  w.created_at,
  w.updated_at
FROM public.api_webhook_subscriptions w
LEFT JOIN public.api_consumers c ON c.id = w.consumer_id;

-- 4) Bot Sessions Dashboard
CREATE OR REPLACE VIEW public.v_bot_sessions_dashboard
WITH (security_invoker = true) AS
SELECT
  s.id,
  s.session_id,
  s.bot_source,
  s.client_phone,
  s.last_request_id,
  s.created_at,
  s.updated_at,
  s.expires_at,
  CASE
    WHEN s.expires_at IS NOT NULL AND s.expires_at < now() THEN 'expired'
    WHEN s.updated_at >= now() - interval '1 hour' THEN 'active'
    WHEN s.updated_at >= now() - interval '24 hours' THEN 'idle'
    ELSE 'stale'
  END AS lifecycle_state
FROM public.bot_sessions s;

-- Indices for dashboards
CREATE INDEX IF NOT EXISTS idx_api_gateway_logs_consumer_created ON public.api_gateway_logs(consumer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_gateway_logs_status_created ON public.api_gateway_logs(status_code, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_webhook_deliveries_sub_created ON public.api_webhook_deliveries(subscription_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bot_sessions_updated_at ON public.bot_sessions(updated_at DESC);