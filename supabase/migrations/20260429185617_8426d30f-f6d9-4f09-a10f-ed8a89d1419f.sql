CREATE OR REPLACE FUNCTION public.fn_transition_request_stage(
  p_request_id uuid,
  p_to_stage public.workflow_stage_t,
  p_actor uuid DEFAULT auth.uid(),
  p_reason text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS public.workflow_stage_t
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_from public.workflow_stage_t;
  v_event_id uuid;
BEGIN
  PERFORM set_config('app.allow_stage_transition', 'on', true);

  SELECT workflow_stage_v2 INTO v_from
  FROM public.maintenance_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF v_from IS NULL THEN
    RAISE EXCEPTION 'request_not_found: %', p_request_id;
  END IF;

  IF v_from = p_to_stage THEN
    RETURN v_from;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.workflow_transitions
    WHERE from_stage = v_from AND to_stage = p_to_stage AND is_active = true
  ) THEN
    RAISE EXCEPTION 'illegal_transition: % -> %', v_from, p_to_stage
      USING HINT = 'Add transition to workflow_transitions if intentional';
  END IF;

  UPDATE public.maintenance_requests
  SET workflow_stage_v2 = p_to_stage,
      workflow_stage = p_to_stage::text,
      updated_at = now()
  WHERE id = p_request_id;

  INSERT INTO public.domain_events (
    aggregate_type, aggregate_id, event_type, event_payload, actor_id
  ) VALUES (
    'maintenance_request', p_request_id, 'stage.transitioned',
    jsonb_build_object('from', v_from, 'to', p_to_stage, 'reason', p_reason, 'metadata', p_metadata),
    p_actor
  ) RETURNING id INTO v_event_id;

  RETURN p_to_stage;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_transition_request_stage(uuid, public.workflow_stage_t, uuid, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_transition_request_stage(uuid, public.workflow_stage_t, uuid, text, jsonb) TO authenticated;