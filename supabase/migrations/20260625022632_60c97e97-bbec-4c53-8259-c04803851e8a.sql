
CREATE TABLE IF NOT EXISTS public.ai_sessions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id         text,
  channel           text NOT NULL,
  consumer_id       uuid REFERENCES public.api_consumers(id) ON DELETE SET NULL,
  user_id           uuid,
  request_id        uuid REFERENCES public.maintenance_requests(id) ON DELETE SET NULL,
  model             text NOT NULL,
  prompt_tokens     integer NOT NULL DEFAULT 0,
  completion_tokens integer NOT NULL DEFAULT 0,
  total_tokens      integer NOT NULL DEFAULT 0,
  tool_calls        jsonb  NOT NULL DEFAULT '[]'::jsonb,
  metadata          jsonb  NOT NULL DEFAULT '{}'::jsonb,
  status            text   NOT NULL DEFAULT 'ok',
  error             text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_sessions_user_idx     ON public.ai_sessions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ai_sessions_consumer_idx ON public.ai_sessions(consumer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ai_sessions_channel_idx  ON public.ai_sessions(channel, created_at DESC);
CREATE INDEX IF NOT EXISTS ai_sessions_thread_idx   ON public.ai_sessions(thread_id);

GRANT SELECT, INSERT, UPDATE ON public.ai_sessions TO authenticated;
GRANT ALL ON public.ai_sessions TO service_role;

ALTER TABLE public.ai_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_sessions_user_select_own"
  ON public.ai_sessions FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "ai_sessions_user_insert_own"
  ON public.ai_sessions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "ai_sessions_admin_all_select"
  ON public.ai_sessions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'finance'));

CREATE POLICY "ai_sessions_admin_all_update"
  ON public.ai_sessions FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE VIEW public.v_ai_usage_dashboard
WITH (security_invoker = true) AS
SELECT
  date_trunc('day', created_at)::date AS day,
  channel,
  model,
  count(*)                              AS sessions,
  sum(prompt_tokens)::bigint            AS prompt_tokens,
  sum(completion_tokens)::bigint        AS completion_tokens,
  sum(total_tokens)::bigint             AS total_tokens,
  sum(jsonb_array_length(coalesce(tool_calls,'[]'::jsonb)))::bigint AS tool_invocations,
  count(*) FILTER (WHERE status <> 'ok') AS errors
FROM public.ai_sessions
GROUP BY 1, 2, 3
ORDER BY 1 DESC, 4 DESC;

GRANT SELECT ON public.v_ai_usage_dashboard TO authenticated;
GRANT SELECT ON public.v_ai_usage_dashboard TO service_role;
