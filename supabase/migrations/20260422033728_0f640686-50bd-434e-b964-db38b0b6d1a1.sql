
SET LOCAL session_replication_role = replica;

-- 0) Map orphan legacy stage value
UPDATE public.maintenance_requests
   SET workflow_stage = 'triaged'
 WHERE workflow_stage = 'in_review';

-- 1) Backfill workflow_stage_v2
UPDATE public.maintenance_requests m
   SET workflow_stage_v2 = m.workflow_stage::public.workflow_stage_t
 WHERE m.workflow_stage IS NOT NULL
   AND (m.workflow_stage_v2::text) IS DISTINCT FROM m.workflow_stage;

SET LOCAL session_replication_role = origin;

-- 2) Migrate message_logs → outbound_messages
INSERT INTO public.outbound_messages (
  id, channel, recipient, body, status, provider, provider_message_id,
  related_aggregate_type, related_aggregate_id,
  sent_at, delivered_at, read_at, retry_count, created_at, updated_at
)
SELECT
  ml.id,
  CASE
    WHEN lower(coalesce(ml.message_type, ml.channel, 'sms')) LIKE '%whatsapp%' THEN 'whatsapp'::public.message_channel_t
    WHEN lower(coalesce(ml.message_type, ml.channel, 'sms')) LIKE '%email%'    THEN 'email'::public.message_channel_t
    WHEN lower(coalesce(ml.message_type, ml.channel, 'sms')) LIKE '%push%'     THEN 'push'::public.message_channel_t
    WHEN lower(coalesce(ml.message_type, ml.channel, 'sms')) LIKE '%in_app%'   THEN 'in_app'::public.message_channel_t
    ELSE 'sms'::public.message_channel_t
  END,
  ml.recipient,
  ml.message_content,
  CASE lower(coalesce(ml.status,'queued'))
    WHEN 'sent'      THEN 'sent'::public.message_status_t
    WHEN 'delivered' THEN 'delivered'::public.message_status_t
    WHEN 'read'      THEN 'read'::public.message_status_t
    WHEN 'failed'    THEN 'failed'::public.message_status_t
    WHEN 'rejected'  THEN 'rejected'::public.message_status_t
    WHEN 'expired'   THEN 'expired'::public.message_status_t
    WHEN 'sending'   THEN 'sending'::public.message_status_t
    ELSE 'queued'::public.message_status_t
  END,
  ml.provider, ml.external_id,
  CASE WHEN ml.request_id IS NOT NULL THEN 'maintenance_request' ELSE NULL END,
  ml.request_id,
  ml.sent_at, ml.delivered_at, ml.read_at,
  COALESCE(ml.retry_count, 0),
  COALESCE(ml.created_at, now()),
  COALESCE(ml.updated_at, now())
FROM public.message_logs ml
WHERE NOT EXISTS (SELECT 1 FROM public.outbound_messages om WHERE om.id = ml.id);

-- 3) Freeze legacy tables
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='message_logs') THEN
    EXECUTE 'ALTER TABLE public.message_logs RENAME TO _legacy_message_logs';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='whatsapp_messages') THEN
    EXECUTE 'ALTER TABLE public.whatsapp_messages RENAME TO _legacy_whatsapp_messages';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='messages') THEN
    EXECUTE 'ALTER TABLE public.messages RENAME TO _legacy_messages';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='notification') THEN
    EXECUTE 'ALTER TABLE public.notification RENAME TO _legacy_notification';
  END IF;
END $$;

COMMENT ON TABLE public._legacy_message_logs      IS 'FROZEN 2026-04-22. Replaced by outbound_messages. Read-only archive.';
COMMENT ON TABLE public._legacy_whatsapp_messages IS 'FROZEN 2026-04-22. Replaced by outbound_messages. Read-only archive.';
COMMENT ON TABLE public._legacy_messages          IS 'FROZEN 2026-04-22. Replaced by outbound_messages. Read-only archive.';
COMMENT ON TABLE public._legacy_notification      IS 'FROZEN 2026-04-22. Use notifications (plural) for in-app only.';

-- 4) Drop legacy column workflow_stage
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='maintenance_requests' AND column_name='workflow_stage'
  ) THEN
    EXECUTE 'ALTER TABLE public.maintenance_requests DROP COLUMN workflow_stage CASCADE';
  END IF;
END $$;

-- 5) Drop dependent admin view, then strip operational keys from app_settings
DROP VIEW IF EXISTS public.app_settings_admin_safe CASCADE;

ALTER TABLE public.app_settings
  DROP COLUMN IF EXISTS order_stages CASCADE,
  DROP COLUMN IF EXISTS technician_statuses CASCADE;

-- Recreate the admin-safe view (without legacy operational keys)
CREATE VIEW public.app_settings_admin_safe
WITH (security_invoker = on)
AS
SELECT
  id, app_name, app_logo_url, company_email, company_phone, company_address,
  default_currency, timezone, default_language, allow_self_registration,
  max_execution_time, allow_edit_after_start, require_manager_approval,
  show_technicians_on_map, enable_technician_rating, allow_technician_quotes,
  notification_types, enable_email_notifications, enable_sms_notifications,
  enable_in_app_notifications, enable_reminders, notification_templates,
  theme_mode, primary_color, secondary_color, background_color, map_style,
  show_footer, custom_css, google_maps_enabled, erpnext_enabled, erpnext_url,
  enable_2fa, auto_backup_enabled, backup_frequency, lock_sensitive_settings,
  session_timeout, created_at, updated_at, updated_by
FROM public.app_settings;

COMMENT ON VIEW public.app_settings_admin_safe IS
  'Admin-safe view of app_settings. Excludes SMTP secrets and legacy operational keys.';

-- 6) Hardening: api_consumers
ALTER TABLE public.api_consumers
  ADD COLUMN IF NOT EXISTS api_key_hash    text,
  ADD COLUMN IF NOT EXISTS api_key_prefix  text,
  ADD COLUMN IF NOT EXISTS last_rotated_at timestamptz;

UPDATE public.api_consumers
   SET api_key_prefix = COALESCE(api_key_prefix, left(api_key, 8))
 WHERE api_key IS NOT NULL AND api_key_prefix IS NULL;

COMMENT ON COLUMN public.api_consumers.api_key IS 'DEPRECATED 2026-04-22. Migrate to api_key_hash. Will be dropped after rotation.';

-- 7) Mandatory indexes
CREATE INDEX IF NOT EXISTS idx_mr_stage_company
  ON public.maintenance_requests (workflow_stage_v2, company_id);

CREATE INDEX IF NOT EXISTS idx_outbound_status_schedule
  ON public.outbound_messages (status, scheduled_at, next_retry_at);

CREATE INDEX IF NOT EXISTS idx_outbound_aggregate
  ON public.outbound_messages (related_aggregate_type, related_aggregate_id);

CREATE INDEX IF NOT EXISTS idx_domain_events_aggregate
  ON public.domain_events (aggregate_type, aggregate_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_wa_map_stage_active
  ON public.wa_stage_template_map (stage, is_active);

CREATE INDEX IF NOT EXISTS idx_wf_transitions_from_to
  ON public.workflow_transitions (from_stage, to_stage);

-- 8) Universal updated_at trigger
DO $$
DECLARE t text;
BEGIN
  FOR t IN
    SELECT unnest(ARRAY['outbound_messages','wa_stage_template_map','workflow_transitions','api_consumers'])
  LOOP
    EXECUTE format($f$
      DROP TRIGGER IF EXISTS trg_set_updated_at ON public.%I;
      CREATE TRIGGER trg_set_updated_at BEFORE UPDATE ON public.%I
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
    $f$, t, t);
  END LOOP;
END $$;
