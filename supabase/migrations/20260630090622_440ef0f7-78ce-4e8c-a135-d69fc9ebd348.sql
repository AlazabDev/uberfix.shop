-- Mail messages cache (IMAP fetched + SMTP sent)
CREATE TABLE IF NOT EXISTS public.mail_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account text NOT NULL DEFAULT 'uf@alazab.com',
  folder text NOT NULL DEFAULT 'INBOX',
  uid bigint,
  message_id text,
  thread_id text,
  from_addr text,
  from_name text,
  to_addrs jsonb DEFAULT '[]'::jsonb,
  cc_addrs jsonb DEFAULT '[]'::jsonb,
  subject text,
  preview text,
  body_text text,
  body_html text,
  has_attachments boolean DEFAULT false,
  is_read boolean DEFAULT false,
  is_starred boolean DEFAULT false,
  is_sent boolean DEFAULT false,
  internal_date timestamptz,
  raw_size integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account, folder, uid)
);

CREATE INDEX IF NOT EXISTS idx_mail_messages_folder_date ON public.mail_messages (folder, internal_date DESC);
CREATE INDEX IF NOT EXISTS idx_mail_messages_unread ON public.mail_messages (folder, is_read) WHERE is_read = false;

-- Sync state
CREATE TABLE IF NOT EXISTS public.mail_sync_state (
  account text NOT NULL,
  folder text NOT NULL,
  last_uid bigint NOT NULL DEFAULT 0,
  last_synced_at timestamptz,
  last_error text,
  PRIMARY KEY (account, folder)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mail_messages TO authenticated;
GRANT ALL ON public.mail_messages TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mail_sync_state TO authenticated;
GRANT ALL ON public.mail_sync_state TO service_role;

ALTER TABLE public.mail_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mail_sync_state ENABLE ROW LEVEL SECURITY;

-- Only admin/manager can access mailbox
CREATE POLICY "mail_messages_admin_select" ON public.mail_messages FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

CREATE POLICY "mail_messages_admin_update" ON public.mail_messages FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

CREATE POLICY "mail_messages_admin_delete" ON public.mail_messages FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

CREATE POLICY "mail_sync_state_admin_select" ON public.mail_sync_state FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));