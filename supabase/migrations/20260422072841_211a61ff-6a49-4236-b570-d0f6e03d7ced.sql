-- جدول جلسات البوت لحفظ سياق المحادثات (عزبوت + أي بوت آخر يستهلك bot-gateway)
CREATE TABLE IF NOT EXISTS public.bot_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL UNIQUE,
  client_phone TEXT,
  bot_source TEXT DEFAULT 'azabot',
  context JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_request_id UUID REFERENCES public.maintenance_requests(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days')
);

CREATE INDEX IF NOT EXISTS idx_bot_sessions_phone ON public.bot_sessions(client_phone);
CREATE INDEX IF NOT EXISTS idx_bot_sessions_expires ON public.bot_sessions(expires_at);

ALTER TABLE public.bot_sessions ENABLE ROW LEVEL SECURITY;

-- لا أحد من الواجهة يقرأ/يكتب — service_role فقط (عبر edge function)
CREATE POLICY "bot_sessions_service_only_select"
  ON public.bot_sessions FOR SELECT
  USING (false);

CREATE POLICY "bot_sessions_service_only_insert"
  ON public.bot_sessions FOR INSERT
  WITH CHECK (false);

CREATE POLICY "bot_sessions_admins_read"
  ON public.bot_sessions FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- trigger لتحديث updated_at
CREATE TRIGGER trg_bot_sessions_updated_at
  BEFORE UPDATE ON public.bot_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.bot_sessions IS 'جلسات البوت - يكتبها service_role فقط من bot-gateway. تنتهي تلقائياً بعد 7 أيام.';