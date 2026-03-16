
-- ============================================================
-- Phase 1: Fix 13 RLS vulnerabilities in one migration
-- ============================================================

-- 1. whatsapp_messages: Remove public read policy, add staff-only
DROP POLICY IF EXISTS "Allow public read for realtime" ON public.whatsapp_messages;
CREATE POLICY "Staff read whatsapp_messages"
  ON public.whatsapp_messages FOR SELECT TO authenticated
  USING (public.is_staff());

-- 2. pending_technician_registrations: Remove open read, scope to own or staff
DROP POLICY IF EXISTS "Can read own pending registration" ON public.pending_technician_registrations;
CREATE POLICY "Own or staff read pending_registrations"
  ON public.pending_technician_registrations FOR SELECT TO authenticated
  USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
    OR public.is_staff()
  );

-- 3. facebook_users: Fix the OR leak on access_token
DROP POLICY IF EXISTS "Users can view own facebook profile" ON public.facebook_users;
CREATE POLICY "Users view own facebook profile"
  ON public.facebook_users FOR SELECT TO authenticated
  USING (supabase_user_id = auth.uid());

-- 4. chatbot_conversations: Remove public ALL, add scoped policies
DROP POLICY IF EXISTS "Anyone can manage conversations" ON public.chatbot_conversations;
CREATE POLICY "Users manage own chatbot_conversations"
  ON public.chatbot_conversations FOR ALL TO authenticated
  USING (user_id = auth.uid() OR session_id = auth.uid()::text OR public.is_staff())
  WITH CHECK (user_id = auth.uid() OR session_id = auth.uid()::text OR public.is_staff());
CREATE POLICY "Anon insert chatbot_conversations"
  ON public.chatbot_conversations FOR INSERT TO anon
  WITH CHECK (user_id IS NULL);
CREATE POLICY "Anon read own session chatbot_conversations"
  ON public.chatbot_conversations FOR SELECT TO anon
  USING (user_id IS NULL);

-- 5. chatbot_messages: Remove public read/insert, add scoped
DROP POLICY IF EXISTS "Anyone can read messages" ON public.chatbot_messages;
DROP POLICY IF EXISTS "Anyone can insert messages" ON public.chatbot_messages;
CREATE POLICY "Read own chatbot_messages"
  ON public.chatbot_messages FOR SELECT TO authenticated
  USING (
    conversation_id IN (
      SELECT id FROM public.chatbot_conversations 
      WHERE user_id = auth.uid() OR session_id = auth.uid()::text
    )
    OR public.is_staff()
  );
CREATE POLICY "Insert own chatbot_messages"
  ON public.chatbot_messages FOR INSERT TO authenticated
  WITH CHECK (
    conversation_id IN (
      SELECT id FROM public.chatbot_conversations 
      WHERE user_id = auth.uid() OR session_id = auth.uid()::text
    )
    OR public.is_staff()
  );
CREATE POLICY "Anon read chatbot_messages"
  ON public.chatbot_messages FOR SELECT TO anon
  USING (
    conversation_id IN (
      SELECT id FROM public.chatbot_conversations WHERE user_id IS NULL
    )
  );
CREATE POLICY "Anon insert chatbot_messages"
  ON public.chatbot_messages FOR INSERT TO anon
  WITH CHECK (
    conversation_id IN (
      SELECT id FROM public.chatbot_conversations WHERE user_id IS NULL
    )
  );

-- 6. wa_webhooks: Remove broad authenticated read, restrict to staff
DROP POLICY IF EXISTS "Authenticated read wa_webhooks" ON public.wa_webhooks;
CREATE POLICY "Staff read wa_webhooks"
  ON public.wa_webhooks FOR SELECT TO authenticated
  USING (public.is_staff());

-- 7. wa_messages: Remove broad authenticated read, restrict to staff
DROP POLICY IF EXISTS "Authenticated read wa_messages" ON public.wa_messages;
CREATE POLICY "Staff read wa_messages"
  ON public.wa_messages FOR SELECT TO authenticated
  USING (public.is_staff());

-- 8. wa_contacts: Remove broad authenticated read, restrict to staff
DROP POLICY IF EXISTS "Authenticated read wa_contacts" ON public.wa_contacts;
CREATE POLICY "Staff read wa_contacts"
  ON public.wa_contacts FOR SELECT TO authenticated
  USING (public.is_staff());

-- 9. wa_conversations: Remove broad authenticated read, restrict to staff
DROP POLICY IF EXISTS "Authenticated read wa_conversations" ON public.wa_conversations;
CREATE POLICY "Staff read wa_conversations"
  ON public.wa_conversations FOR SELECT TO authenticated
  USING (public.is_staff());

-- 10. technician_tasks: Remove the broad policy, keep scoped one
DROP POLICY IF EXISTS "Authenticated can view technician_tasks" ON public.technician_tasks;

-- 11. technician_documents: Remove the broad policy, keep scoped one
DROP POLICY IF EXISTS "Authenticated can view technician_documents" ON public.technician_documents;

-- 12. technician_performance: Remove public read, keep scoped one
DROP POLICY IF EXISTS "Public read performance" ON public.technician_performance;

-- 13. wa_api_keys: Remove broad authenticated read, restrict to staff
DROP POLICY IF EXISTS "Authenticated read wa_api_keys" ON public.wa_api_keys;
CREATE POLICY "Staff read wa_api_keys"
  ON public.wa_api_keys FOR SELECT TO authenticated
  USING (public.is_staff());
