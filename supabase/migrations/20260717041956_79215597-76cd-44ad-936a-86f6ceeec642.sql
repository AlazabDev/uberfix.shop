
-- Fix chat_conversations: require technician is actually assigned to the linked request
DROP POLICY IF EXISTS "Users can view their conversations" ON public.chat_conversations;
DROP POLICY IF EXISTS "Participants can update conversations" ON public.chat_conversations;

CREATE POLICY "Users can view their conversations"
ON public.chat_conversations
FOR SELECT
TO authenticated
USING (
  auth.uid() = customer_id
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'owner'::app_role)
  OR has_role(auth.uid(), 'manager'::app_role)
  OR EXISTS (
    SELECT 1
    FROM public.technician_profiles tp
    JOIN public.technicians t ON t.technician_profile_id = tp.id
    LEFT JOIN public.maintenance_requests mr ON mr.id = chat_conversations.request_id
    WHERE tp.user_id = auth.uid()
      AND t.id = chat_conversations.technician_id
      AND (
        chat_conversations.request_id IS NULL
        OR mr.assigned_technician_id = t.id
      )
  )
);

CREATE POLICY "Participants can update conversations"
ON public.chat_conversations
FOR UPDATE
TO authenticated
USING (
  auth.uid() = customer_id
  OR EXISTS (
    SELECT 1
    FROM public.technician_profiles tp
    JOIN public.technicians t ON t.technician_profile_id = tp.id
    LEFT JOIN public.maintenance_requests mr ON mr.id = chat_conversations.request_id
    WHERE tp.user_id = auth.uid()
      AND t.id = chat_conversations.technician_id
      AND (
        chat_conversations.request_id IS NULL
        OR mr.assigned_technician_id = t.id
      )
  )
);

-- Fix wa_template_events: prevent actor spoofing
DROP POLICY IF EXISTS "wa_template_events_insert_authenticated" ON public.wa_template_events;

CREATE POLICY "wa_template_events_insert_authenticated"
ON public.wa_template_events
FOR INSERT
TO authenticated
WITH CHECK (
  (actor_id = auth.uid())
  AND (
    tenant_id IN (
      SELECT p.company_id FROM public.profiles p WHERE p.id = auth.uid()
    )
  )
);
