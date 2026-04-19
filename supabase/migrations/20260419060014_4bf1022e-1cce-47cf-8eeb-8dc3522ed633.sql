
-- =====================================================
-- 1) FIX wa_media: drop overly permissive read policy
-- =====================================================
DROP POLICY IF EXISTS "Authenticated read wa_media" ON public.wa_media;
-- The remaining "wa_media_admin_only" policy already restricts to owner/admin/manager.

-- =====================================================
-- 2) FIX storage.objects: uploads bucket delete policy
-- =====================================================
DROP POLICY IF EXISTS "uploads_auth_delete" ON storage.objects;

CREATE POLICY "uploads_owner_or_staff_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'uploads'
  AND auth.uid() IS NOT NULL
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin'::app_role, 'manager'::app_role, 'owner'::app_role)
    )
  )
);

-- =====================================================
-- 3) FIX whatsapp-media bucket: make private + restrict reads
-- =====================================================
UPDATE storage.buckets SET public = false WHERE id = 'whatsapp-media';

-- Drop any pre-existing public read policies on this bucket (defensive)
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT polname FROM pg_policy
    WHERE polrelid = 'storage.objects'::regclass
      AND (
        pg_get_expr(polqual, polrelid) ILIKE '%whatsapp-media%'
        OR pg_get_expr(polwithcheck, polrelid) ILIKE '%whatsapp-media%'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.polname);
  END LOOP;
END $$;

CREATE POLICY "whatsapp_media_admin_read"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'whatsapp-media'
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin'::app_role, 'manager'::app_role, 'owner'::app_role)
  )
);

CREATE POLICY "whatsapp_media_admin_write"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'whatsapp-media'
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin'::app_role, 'manager'::app_role, 'owner'::app_role)
  )
);

CREATE POLICY "whatsapp_media_admin_update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'whatsapp-media'
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin'::app_role, 'manager'::app_role, 'owner'::app_role)
  )
);

CREATE POLICY "whatsapp_media_admin_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'whatsapp-media'
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin'::app_role, 'manager'::app_role, 'owner'::app_role)
  )
);

-- =====================================================
-- 4) FIX realtime.messages: restrict channel subscriptions
-- =====================================================
ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;

-- Drop any prior permissive policies we may have added
DROP POLICY IF EXISTS "realtime_authenticated_all" ON realtime.messages;
DROP POLICY IF EXISTS "realtime_chat_participants_read" ON realtime.messages;
DROP POLICY IF EXISTS "realtime_chat_participants_write" ON realtime.messages;

-- Helper: is the current user a chat participant for the given conversation?
CREATE OR REPLACE FUNCTION public.is_chat_participant(_conversation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.chat_conversations c
    WHERE c.id = _conversation_id
      AND (
        c.customer_id = auth.uid()
        OR c.technician_id = auth.uid()
      )
  )
  OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin'::app_role, 'manager'::app_role, 'staff'::app_role, 'owner'::app_role)
  );
$$;

-- Helper: can the current user receive realtime events for the given topic?
-- Topic conventions:
--   chat:<conversation_id>       -> chat_messages / chat_conversations
--   messages:<user_id>           -> direct messages addressed to user
--   whatsapp:admin               -> whatsapp_messages (admins only)
CREATE OR REPLACE FUNCTION public.can_subscribe_realtime_topic(_topic text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_is_staff boolean;
BEGIN
  IF v_uid IS NULL THEN
    RETURN false;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = v_uid
      AND ur.role IN ('admin'::app_role, 'manager'::app_role, 'staff'::app_role, 'owner'::app_role)
  ) INTO v_is_staff;

  -- Staff/admin/owner can subscribe to any topic
  IF v_is_staff THEN
    RETURN true;
  END IF;

  -- Chat conversation topics: chat:<uuid>
  IF _topic LIKE 'chat:%' THEN
    BEGIN
      RETURN public.is_chat_participant(substring(_topic FROM 6)::uuid);
    EXCEPTION WHEN OTHERS THEN
      RETURN false;
    END;
  END IF;

  -- Direct message topics: messages:<user_id>
  IF _topic LIKE 'messages:%' THEN
    RETURN substring(_topic FROM 10) = v_uid::text;
  END IF;

  -- WhatsApp admin channel reserved to staff (already returned true above)
  IF _topic LIKE 'whatsapp:%' THEN
    RETURN false;
  END IF;

  -- Default deny for any unknown topic
  RETURN false;
END;
$$;

-- RLS policy on realtime.messages
CREATE POLICY "realtime_topic_authorization_select"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  public.can_subscribe_realtime_topic(realtime.topic())
);

CREATE POLICY "realtime_topic_authorization_insert"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  public.can_subscribe_realtime_topic(realtime.topic())
);
