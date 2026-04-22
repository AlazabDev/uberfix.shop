
-- Recreate legacy names as read-only views over the quarantined tables
-- This restores TypeScript types in the frontend without re-enabling writes.

DROP VIEW IF EXISTS public.message_logs CASCADE;
CREATE VIEW public.message_logs
WITH (security_invoker = on)
AS SELECT * FROM public._legacy_message_logs;
COMMENT ON VIEW public.message_logs IS
  'COMPAT VIEW. Read-only over _legacy_message_logs. New writes MUST use outbound_messages.';

DROP VIEW IF EXISTS public.whatsapp_messages CASCADE;
CREATE VIEW public.whatsapp_messages
WITH (security_invoker = on)
AS SELECT * FROM public._legacy_whatsapp_messages;
COMMENT ON VIEW public.whatsapp_messages IS
  'COMPAT VIEW. Read-only over _legacy_whatsapp_messages. New writes MUST use outbound_messages.';

DROP VIEW IF EXISTS public.messages CASCADE;
CREATE VIEW public.messages
WITH (security_invoker = on)
AS SELECT * FROM public._legacy_messages;
COMMENT ON VIEW public.messages IS
  'COMPAT VIEW. Read-only over _legacy_messages. Internal chat moved to chat_messages.';

DROP VIEW IF EXISTS public.notification CASCADE;
CREATE VIEW public.notification
WITH (security_invoker = on)
AS SELECT * FROM public._legacy_notification;
COMMENT ON VIEW public.notification IS
  'COMPAT VIEW. Read-only over _legacy_notification. Use notifications (plural) for new code.';
