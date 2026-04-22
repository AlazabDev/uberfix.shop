
-- Fix mutable search_path on derived status function
CREATE OR REPLACE FUNCTION public.fn_derived_request_status(p_stage public.workflow_stage_t)
RETURNS public.request_status_canonical
LANGUAGE sql IMMUTABLE
SET search_path = public, pg_catalog
AS $$
  SELECT CASE p_stage
    WHEN 'draft' THEN 'open'
    WHEN 'submitted' THEN 'open'
    WHEN 'triaged' THEN 'open'
    WHEN 'assigned' THEN 'active'
    WHEN 'scheduled' THEN 'active'
    WHEN 'in_progress' THEN 'active'
    WHEN 'inspection' THEN 'active'
    WHEN 'waiting_parts' THEN 'blocked'
    WHEN 'on_hold' THEN 'blocked'
    WHEN 'completed' THEN 'done'
    WHEN 'billed' THEN 'done'
    WHEN 'paid' THEN 'done'
    WHEN 'closed' THEN 'terminal'
    WHEN 'cancelled' THEN 'terminal'
    WHEN 'rejected' THEN 'terminal'
  END::public.request_status_canonical
$$;

-- Explicit deny-all-client-writes policies (silences "RLS no policy" lints
-- and locks the tables to backend / service_role only writes)

-- outbound_messages: deny client writes
DROP POLICY IF EXISTS "outbound deny client insert" ON public.outbound_messages;
CREATE POLICY "outbound deny client insert" ON public.outbound_messages
  FOR INSERT TO authenticated WITH CHECK (false);
DROP POLICY IF EXISTS "outbound deny client update" ON public.outbound_messages;
CREATE POLICY "outbound deny client update" ON public.outbound_messages
  FOR UPDATE TO authenticated USING (false) WITH CHECK (false);
DROP POLICY IF EXISTS "outbound deny client delete" ON public.outbound_messages;
CREATE POLICY "outbound deny client delete" ON public.outbound_messages
  FOR DELETE TO authenticated USING (false);

-- outbound_message_events: deny client writes
DROP POLICY IF EXISTS "outbound events deny client insert" ON public.outbound_message_events;
CREATE POLICY "outbound events deny client insert" ON public.outbound_message_events
  FOR INSERT TO authenticated WITH CHECK (false);
DROP POLICY IF EXISTS "outbound events deny client update" ON public.outbound_message_events;
CREATE POLICY "outbound events deny client update" ON public.outbound_message_events
  FOR UPDATE TO authenticated USING (false) WITH CHECK (false);
DROP POLICY IF EXISTS "outbound events deny client delete" ON public.outbound_message_events;
CREATE POLICY "outbound events deny client delete" ON public.outbound_message_events
  FOR DELETE TO authenticated USING (false);

-- workflow_transitions: deny all client writes (admin-only via SQL migrations)
DROP POLICY IF EXISTS "transitions deny client insert" ON public.workflow_transitions;
CREATE POLICY "transitions deny client insert" ON public.workflow_transitions
  FOR INSERT TO authenticated WITH CHECK (false);
DROP POLICY IF EXISTS "transitions deny client update" ON public.workflow_transitions;
CREATE POLICY "transitions deny client update" ON public.workflow_transitions
  FOR UPDATE TO authenticated USING (false) WITH CHECK (false);
DROP POLICY IF EXISTS "transitions deny client delete" ON public.workflow_transitions;
CREATE POLICY "transitions deny client delete" ON public.workflow_transitions
  FOR DELETE TO authenticated USING (false);

-- domain_events: deny client direct writes (must go through SECURITY DEFINER fns)
DROP POLICY IF EXISTS "events deny client insert" ON public.domain_events;
CREATE POLICY "events deny client insert" ON public.domain_events
  FOR INSERT TO authenticated WITH CHECK (false);
DROP POLICY IF EXISTS "events deny client update" ON public.domain_events;
CREATE POLICY "events deny client update" ON public.domain_events
  FOR UPDATE TO authenticated USING (false) WITH CHECK (false);
DROP POLICY IF EXISTS "events deny client delete" ON public.domain_events;
CREATE POLICY "events deny client delete" ON public.domain_events
  FOR DELETE TO authenticated USING (false);
