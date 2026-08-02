-- منع anon تمامًا على الجداول المنشورة في Realtime والتي تحتوي بيانات شخصية
DROP POLICY IF EXISTS appointments_deny_anon ON public.appointments;
CREATE POLICY appointments_deny_anon ON public.appointments AS RESTRICTIVE FOR ALL TO anon USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS chat_conversations_deny_anon ON public.chat_conversations;
CREATE POLICY chat_conversations_deny_anon ON public.chat_conversations AS RESTRICTIVE FOR ALL TO anon USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS chat_messages_deny_anon ON public.chat_messages;
CREATE POLICY chat_messages_deny_anon ON public.chat_messages AS RESTRICTIVE FOR ALL TO anon USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS legacy_messages_deny_anon ON public._legacy_messages;
CREATE POLICY legacy_messages_deny_anon ON public._legacy_messages AS RESTRICTIVE FOR ALL TO anon USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS legacy_whatsapp_messages_deny_anon ON public._legacy_whatsapp_messages;
CREATE POLICY legacy_whatsapp_messages_deny_anon ON public._legacy_whatsapp_messages AS RESTRICTIVE FOR ALL TO anon USING (false) WITH CHECK (false);

-- سحب أي صلاحيات Data API من anon على هذه الجداول
REVOKE ALL ON public.appointments FROM anon;
REVOKE ALL ON public.chat_conversations FROM anon;
REVOKE ALL ON public.chat_messages FROM anon;
REVOKE ALL ON public._legacy_messages FROM anon;
REVOKE ALL ON public._legacy_whatsapp_messages FROM anon;
REVOKE ALL ON public.properties FROM anon;