-- Tighten overly broad read access on WhatsApp, technician, chatbot, media, and archive tables

-- 1) WhatsApp module: restrict reads to owner/admin/manager only
DROP POLICY IF EXISTS "Staff read wa_api_keys" ON public.wa_api_keys;
CREATE POLICY "Admin read wa_api_keys"
ON public.wa_api_keys
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'owner'::public.app_role)
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'manager'::public.app_role)
);

DROP POLICY IF EXISTS "Staff read wa_contacts" ON public.wa_contacts;
CREATE POLICY "Admin read wa_contacts"
ON public.wa_contacts
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'owner'::public.app_role)
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'manager'::public.app_role)
);

DROP POLICY IF EXISTS "Staff read wa_conversations" ON public.wa_conversations;
CREATE POLICY "Admin read wa_conversations"
ON public.wa_conversations
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'owner'::public.app_role)
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'manager'::public.app_role)
);

DROP POLICY IF EXISTS "Staff read wa_messages" ON public.wa_messages;
CREATE POLICY "Admin read wa_messages"
ON public.wa_messages
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'owner'::public.app_role)
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'manager'::public.app_role)
);

DROP POLICY IF EXISTS "Staff read wa_webhooks" ON public.wa_webhooks;
CREATE POLICY "Admin read wa_webhooks"
ON public.wa_webhooks
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'owner'::public.app_role)
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'manager'::public.app_role)
);

DROP POLICY IF EXISTS "Authenticated read wa_numbers" ON public.wa_numbers;
CREATE POLICY "Admin read wa_numbers"
ON public.wa_numbers
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'owner'::public.app_role)
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'manager'::public.app_role)
);

DROP POLICY IF EXISTS "Authenticated users can read whatsapp media" ON public.whatsapp_media_storage;
CREATE POLICY "Admin read whatsapp_media_storage"
ON public.whatsapp_media_storage
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'owner'::public.app_role)
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'manager'::public.app_role)
);

DROP POLICY IF EXISTS "Staff read whatsapp_messages" ON public.whatsapp_messages;
CREATE POLICY "Admin read whatsapp_messages"
ON public.whatsapp_messages
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'owner'::public.app_role)
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'manager'::public.app_role)
);

-- 2) Technician documents/tasks: remove broad authenticated/public read policies
DROP POLICY IF EXISTS "technician_documents_select_authenticated" ON public.technician_documents;
DROP POLICY IF EXISTS "technician_documents_read_authenticated" ON public.technician_documents;

DROP POLICY IF EXISTS "technician_tasks_select_authenticated" ON public.technician_tasks;
DROP POLICY IF EXISTS "technician_tasks_read_authenticated" ON public.technician_tasks;

-- 3) Archive/media errors: replace broad read access with scoped access
DROP POLICY IF EXISTS "archive_auth_read" ON public.maintenance_requests_archive;
CREATE POLICY "archive_scoped_read"
ON public.maintenance_requests_archive
FOR SELECT
TO authenticated
USING (
  created_by = auth.uid()
  OR assigned_to = auth.uid()
  OR public.has_role(auth.uid(), 'owner'::public.app_role)
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'manager'::public.app_role)
);

DROP POLICY IF EXISTS "Authenticated users can read media errors" ON public.media_processing_errors;
DROP POLICY IF EXISTS "Admin view media_errors" ON public.media_processing_errors;
CREATE POLICY "Privileged read media_errors"
ON public.media_processing_errors
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'owner'::public.app_role)
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'manager'::public.app_role)
);

-- 4) Chatbot tables: remove unauthenticated direct DB access; keep authenticated owner/staff + service role
DROP POLICY IF EXISTS "Anon insert chatbot_conversations" ON public.chatbot_conversations;
DROP POLICY IF EXISTS "Anon read own session chatbot_conversations" ON public.chatbot_conversations;
DROP POLICY IF EXISTS "Users manage own chatbot_conversations" ON public.chatbot_conversations;
CREATE POLICY "Users manage own chatbot_conversations"
ON public.chatbot_conversations
FOR ALL
TO authenticated
USING (
  user_id = auth.uid() OR public.is_staff()
)
WITH CHECK (
  user_id = auth.uid() OR public.is_staff()
);
CREATE POLICY "Service role chatbot_conversations"
ON public.chatbot_conversations
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Anon insert chatbot_messages" ON public.chatbot_messages;
DROP POLICY IF EXISTS "Anon read chatbot_messages" ON public.chatbot_messages;
DROP POLICY IF EXISTS "Insert own chatbot_messages" ON public.chatbot_messages;
DROP POLICY IF EXISTS "Read own chatbot_messages" ON public.chatbot_messages;
CREATE POLICY "Users insert own chatbot_messages"
ON public.chatbot_messages
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.chatbot_conversations c
    WHERE c.id = chatbot_messages.conversation_id
      AND (c.user_id = auth.uid() OR public.is_staff())
  )
);
CREATE POLICY "Users read own chatbot_messages"
ON public.chatbot_messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.chatbot_conversations c
    WHERE c.id = chatbot_messages.conversation_id
      AND (c.user_id = auth.uid() OR public.is_staff())
  )
);
CREATE POLICY "Service role chatbot_messages"
ON public.chatbot_messages
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);