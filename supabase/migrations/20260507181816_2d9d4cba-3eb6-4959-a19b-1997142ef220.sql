
CREATE OR REPLACE VIEW public.v_notifications_dashboard
WITH (security_invoker = true) AS
SELECT
  n.id,
  n.title,
  n.type,
  n.entity_type,
  n.entity_id,
  n.recipient_id,
  n.sender_id,
  n.whatsapp_sent,
  n.sms_sent,
  n.read_at,
  CASE WHEN n.read_at IS NULL THEN 'unread' ELSE 'read' END AS read_state,
  n.created_at
FROM public.notifications n;

CREATE OR REPLACE VIEW public.v_outbound_messages_dashboard
WITH (security_invoker = true) AS
SELECT
  om.id,
  om.channel,
  om.recipient,
  om.template_key,
  om.status,
  om.provider,
  om.provider_message_id,
  om.related_aggregate_type,
  om.related_aggregate_id,
  om.retry_count,
  om.last_error,
  om.scheduled_at,
  om.sent_at,
  om.delivered_at,
  om.read_at,
  om.failed_at,
  CASE
    WHEN om.failed_at IS NOT NULL THEN 'failed'
    WHEN om.read_at IS NOT NULL THEN 'read'
    WHEN om.delivered_at IS NOT NULL THEN 'delivered'
    WHEN om.sent_at IS NOT NULL THEN 'sent'
    ELSE 'pending'
  END AS lifecycle_state,
  om.created_at
FROM public.outbound_messages om;

CREATE OR REPLACE VIEW public.v_wa_templates_dashboard
WITH (security_invoker = true) AS
SELECT
  t.id,
  t.name,
  t.meta_template_name,
  t.category,
  t.language,
  t.status,
  t.quality,
  t.rejection_reason,
  t.approved_at,
  t.submitted_at,
  (
    SELECT COUNT(*) FROM public.outbound_messages om
    WHERE om.template_key = t.name
      AND om.created_at > NOW() - INTERVAL '30 days'
  ) AS used_last_30d,
  (
    SELECT MAX(om.created_at) FROM public.outbound_messages om
    WHERE om.template_key = t.name
  ) AS last_used_at,
  t.created_at,
  t.updated_at
FROM public.wa_templates t;
