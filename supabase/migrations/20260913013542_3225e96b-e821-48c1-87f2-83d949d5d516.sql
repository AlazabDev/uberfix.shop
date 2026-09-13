-- lovable-cron-fallback-reviewed: 288 runs/day; missed-visit escalation must fire within 5 minutes, and the job is scheduled only while pending timers exist (wake-on-enqueue) and unscheduled on drain
-- =========================================================
-- Agent self-alarm (timers) + time-based escalation ladder
-- =========================================================

CREATE TABLE IF NOT EXISTS public.agent_escalation_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  level smallint NOT NULL UNIQUE,
  role_label text NOT NULL,
  waba_id text NOT NULL,
  phone_number_id text NOT NULL,
  notify_phone text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.agent_escalation_contacts TO authenticated;
GRANT ALL ON public.agent_escalation_contacts TO service_role;
ALTER TABLE public.agent_escalation_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "escalation_contacts_read_admin"
  ON public.agent_escalation_contacts FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'owner'));

CREATE POLICY "escalation_contacts_service_all"
  ON public.agent_escalation_contacts FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE TRIGGER trg_agent_escalation_contacts_touch
  BEFORE UPDATE ON public.agent_escalation_contacts
  FOR EACH ROW EXECUTE FUNCTION public.fn_touch_updated_at();


CREATE TABLE IF NOT EXISTS public.agent_runtime_config (
  key text PRIMARY KEY,
  value text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.agent_runtime_config TO service_role;
ALTER TABLE public.agent_runtime_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agent_runtime_config_service_all"
  ON public.agent_runtime_config FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE TRIGGER trg_agent_runtime_config_touch
  BEFORE UPDATE ON public.agent_runtime_config
  FOR EACH ROW EXECUTE FUNCTION public.fn_touch_updated_at();


CREATE TABLE IF NOT EXISTS public.agent_timers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.maintenance_requests(id) ON DELETE CASCADE,
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  timer_kind text NOT NULL,
  escalation_level smallint NOT NULL DEFAULT 0,
  scheduled_visit_at timestamptz,
  due_at timestamptz NOT NULL,
  state text NOT NULL DEFAULT 'pending',
  attempts smallint NOT NULL DEFAULT 0,
  max_attempts smallint NOT NULL DEFAULT 3,
  locked_at timestamptz,
  fired_at timestamptz,
  decision text,
  last_error text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT agent_timers_kind_chk CHECK (timer_kind IN ('pre_visit_reminder','start_check','escalate_l1','escalate_l2','escalate_l3','escalate_l4')),
  CONSTRAINT agent_timers_state_chk CHECK (state IN ('pending','processing','done','cancelled','failed')),
  CONSTRAINT agent_timers_unique_kind UNIQUE (request_id, timer_kind)
);

CREATE INDEX IF NOT EXISTS idx_agent_timers_due ON public.agent_timers (state, due_at) WHERE state = 'pending';
CREATE INDEX IF NOT EXISTS idx_agent_timers_request ON public.agent_timers (request_id);

GRANT SELECT ON public.agent_timers TO authenticated;
GRANT ALL ON public.agent_timers TO service_role;
ALTER TABLE public.agent_timers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agent_timers_read_admin"
  ON public.agent_timers FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'owner'));

CREATE POLICY "agent_timers_service_all"
  ON public.agent_timers FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE TRIGGER trg_agent_timers_touch
  BEFORE UPDATE ON public.agent_timers
  FOR EACH ROW EXECUTE FUNCTION public.fn_touch_updated_at();


-- ---------------------------------------------------------
-- Wake-on-enqueue / unschedule-on-drain for the dispatcher
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_agent_timers_sync_dispatcher()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, cron
AS $$
DECLARE
  v_pending boolean;
  v_job_exists boolean;
  v_url text;
  v_key text;
BEGIN
  SELECT EXISTS (SELECT 1 FROM public.agent_timers WHERE state IN ('pending','processing')) INTO v_pending;
  SELECT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'agent-timers-tick') INTO v_job_exists;

  IF v_pending AND NOT v_job_exists THEN
    SELECT value INTO v_url FROM public.agent_runtime_config WHERE key = 'agent_tick_url';
    SELECT value INTO v_key FROM public.agent_runtime_config WHERE key = 'anon_key';
    IF v_url IS NULL OR v_key IS NULL THEN
      RETURN;
    END IF;
    PERFORM cron.schedule(
      'agent-timers-tick',
      '*/5 * * * *',
      format(
        $cmd$SELECT net.http_post(url := %L, headers := %L::jsonb, body := '{"source":"cron"}'::jsonb) AS request_id;$cmd$,
        v_url,
        json_build_object('Content-Type','application/json','apikey',v_key,'Authorization','Bearer '||v_key)::text
      )
    );
  ELSIF NOT v_pending AND v_job_exists THEN
    PERFORM cron.unschedule('agent-timers-tick');
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_agent_timers_sync_dispatcher() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_agent_timers_sync_dispatcher() TO service_role;


-- ---------------------------------------------------------
-- Schedule / cancel timers for a request
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_schedule_agent_timers(
  p_request_id uuid,
  p_appointment_id uuid,
  p_visit_at timestamptz
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
BEGIN
  IF p_request_id IS NULL OR p_visit_at IS NULL THEN
    RETURN;
  END IF;

  FOR r IN
    SELECT * FROM (VALUES
      ('pre_visit_reminder', -60, 0),
      ('start_check',         15, 0),
      ('escalate_l1',         45, 1),
      ('escalate_l2',        120, 2),
      ('escalate_l3',        180, 3),
      ('escalate_l4',        240, 4)
    ) AS t(kind, offset_min, lvl)
  LOOP
    INSERT INTO public.agent_timers (
      request_id, appointment_id, timer_kind, escalation_level, scheduled_visit_at, due_at, state, attempts, fired_at, last_error
    ) VALUES (
      p_request_id, p_appointment_id, r.kind, r.lvl, p_visit_at,
      p_visit_at + make_interval(mins => r.offset_min), 'pending', 0, NULL, NULL
    )
    ON CONFLICT (request_id, timer_kind) DO UPDATE
      SET appointment_id     = EXCLUDED.appointment_id,
          scheduled_visit_at = EXCLUDED.scheduled_visit_at,
          due_at             = EXCLUDED.due_at,
          escalation_level   = EXCLUDED.escalation_level,
          state              = 'pending',
          attempts           = 0,
          locked_at          = NULL,
          fired_at           = NULL,
          decision           = NULL,
          last_error         = NULL;
  END LOOP;

  PERFORM public.fn_agent_timers_sync_dispatcher();
END;
$$;

REVOKE ALL ON FUNCTION public.fn_schedule_agent_timers(uuid, uuid, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_schedule_agent_timers(uuid, uuid, timestamptz) TO service_role;


CREATE OR REPLACE FUNCTION public.fn_cancel_agent_timers(p_request_id uuid, p_reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.agent_timers
     SET state = 'cancelled',
         decision = COALESCE(p_reason, 'cancelled'),
         locked_at = NULL
   WHERE request_id = p_request_id
     AND state IN ('pending','processing');

  PERFORM public.fn_agent_timers_sync_dispatcher();
END;
$$;

REVOKE ALL ON FUNCTION public.fn_cancel_agent_timers(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_cancel_agent_timers(uuid, text) TO service_role;


-- ---------------------------------------------------------
-- Triggers: appointment scheduling drives the timers
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_appointment_agent_timers()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request uuid;
  v_visit timestamptz;
BEGIN
  v_request := COALESCE(NEW.maintenance_request_id, NEW.request_id);
  IF v_request IS NULL THEN
    RETURN NEW;
  END IF;

  IF lower(COALESCE(NEW.status, 'scheduled')) IN ('cancelled','canceled','completed','done') THEN
    PERFORM public.fn_cancel_agent_timers(v_request, 'appointment_' || lower(NEW.status));
    RETURN NEW;
  END IF;

  IF NEW.appointment_date IS NULL THEN
    RETURN NEW;
  END IF;

  v_visit := timezone(
    'Africa/Cairo',
    (NEW.appointment_date::timestamp + COALESCE(NEW.appointment_time, '09:00'::time))
  );

  PERFORM public.fn_schedule_agent_timers(v_request, NEW.id, v_visit);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_appointment_agent_timers ON public.appointments;
CREATE TRIGGER trg_appointment_agent_timers
  AFTER INSERT OR UPDATE OF appointment_date, appointment_time, status, maintenance_request_id, request_id
  ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.fn_appointment_agent_timers();


CREATE OR REPLACE FUNCTION public.fn_request_stage_agent_timers()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF COALESCE(NEW.workflow_stage, '') = COALESCE(OLD.workflow_stage, '') THEN
    RETURN NEW;
  END IF;

  IF lower(COALESCE(NEW.workflow_stage, '')) IN
     ('in_progress','inspection','completed','billed','paid','handover_to_admin','closed','cancelled','rejected') THEN
    PERFORM public.fn_cancel_agent_timers(NEW.id, 'stage_' || lower(NEW.workflow_stage));
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mr_agent_timers ON public.maintenance_requests;
CREATE TRIGGER trg_mr_agent_timers
  AFTER UPDATE OF workflow_stage ON public.maintenance_requests
  FOR EACH ROW EXECUTE FUNCTION public.fn_request_stage_agent_timers();


-- ---------------------------------------------------------
-- Claim + settle timers (used by the agent-tick edge function)
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_claim_due_agent_timers(p_limit integer DEFAULT 20)
RETURNS TABLE (
  timer_id uuid,
  request_id uuid,
  appointment_id uuid,
  timer_kind text,
  escalation_level smallint,
  scheduled_visit_at timestamptz,
  due_at timestamptz,
  attempts smallint,
  request_number text,
  workflow_stage text,
  title text,
  description text,
  priority text,
  client_name text,
  client_phone text,
  location text,
  assigned_technician_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH claimed AS (
    SELECT t.id
      FROM public.agent_timers t
     WHERE t.state = 'pending'
       AND t.due_at <= now()
       AND t.attempts < t.max_attempts
     ORDER BY t.due_at
     LIMIT GREATEST(COALESCE(p_limit, 20), 1)
     FOR UPDATE SKIP LOCKED
  ), upd AS (
    UPDATE public.agent_timers t
       SET state = 'processing', locked_at = now(), attempts = t.attempts + 1
      FROM claimed c
     WHERE t.id = c.id
     RETURNING t.*
  )
  SELECT u.id, u.request_id, u.appointment_id, u.timer_kind, u.escalation_level,
         u.scheduled_visit_at, u.due_at, u.attempts,
         m.request_number, m.workflow_stage, m.title, m.description,
         m.priority::text, m.client_name, m.client_phone, m.location, m.assigned_technician_id
    FROM upd u
    JOIN public.maintenance_requests m ON m.id = u.request_id;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_claim_due_agent_timers(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_claim_due_agent_timers(integer) TO service_role;


CREATE OR REPLACE FUNCTION public.fn_settle_agent_timer(
  p_timer_id uuid,
  p_state text,
  p_decision text DEFAULT NULL,
  p_error text DEFAULT NULL,
  p_retry_in_minutes integer DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attempts smallint;
  v_max smallint;
BEGIN
  IF p_state = 'retry' THEN
    SELECT attempts, max_attempts INTO v_attempts, v_max FROM public.agent_timers WHERE id = p_timer_id;
    IF v_attempts >= v_max THEN
      UPDATE public.agent_timers
         SET state = 'failed', last_error = p_error, locked_at = NULL, fired_at = now()
       WHERE id = p_timer_id;
    ELSE
      UPDATE public.agent_timers
         SET state = 'pending',
             due_at = now() + make_interval(mins => GREATEST(COALESCE(p_retry_in_minutes, 5), 1)),
             last_error = p_error,
             locked_at = NULL
       WHERE id = p_timer_id;
    END IF;
  ELSE
    UPDATE public.agent_timers
       SET state = CASE WHEN p_state IN ('done','cancelled','failed') THEN p_state ELSE 'done' END,
           decision = p_decision,
           last_error = p_error,
           fired_at = now(),
           locked_at = NULL
     WHERE id = p_timer_id;
  END IF;

  PERFORM public.fn_agent_timers_sync_dispatcher();
END;
$$;

REVOKE ALL ON FUNCTION public.fn_settle_agent_timer(uuid, text, text, text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_settle_agent_timer(uuid, text, text, text, integer) TO service_role;
