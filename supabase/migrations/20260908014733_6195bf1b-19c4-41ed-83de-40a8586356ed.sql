
CREATE OR REPLACE FUNCTION public.fn_handle_request_closure()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $function$
BEGIN
  IF NEW.workflow_stage_v2 = 'closed' AND (OLD.workflow_stage_v2 IS DISTINCT FROM 'closed') THEN
    NEW.closed_at := COALESCE(NEW.closed_at, now());
  END IF;

  IF NEW.rating IS NOT NULL AND OLD.rating IS DISTINCT FROM NEW.rating THEN
    NEW.rated_at := COALESCE(NEW.rated_at, now());
  END IF;

  IF NEW.workflow_stage_v2 = 'handover_to_admin' AND (OLD.workflow_stage_v2 IS DISTINCT FROM 'handover_to_admin') THEN
    NEW.handover_to_admin_at := COALESCE(NEW.handover_to_admin_at, now());
    NEW.handover_to_admin_by := COALESCE(NEW.handover_to_admin_by, auth.uid());
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_backfill_lifecycle_batch(p_limit integer DEFAULT 200)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  r record;
  v_stage public.workflow_stage_t;
  v_path public.workflow_stage_t[] := ARRAY[
    'submitted','triaged','assigned','scheduled','in_progress',
    'inspection','completed','billed','paid','handover_to_admin','closed'
  ]::public.workflow_stage_t[];
  s public.workflow_stage_t;
  v_count int := 0;
BEGIN
  PERFORM set_config('app.allow_stage_transition', 'on', true);
  ALTER TABLE public.maintenance_requests DISABLE TRIGGER trg_on_stage_transition_enqueue_wa;
  ALTER TABLE public.maintenance_requests DISABLE TRIGGER trg_daftra_sync_on_billed;

  FOR r IN
    SELECT id, workflow_stage_v2, rating
    FROM public.maintenance_requests
    WHERE workflow_stage_v2 <> 'closed'
      AND workflow_stage_v2 NOT IN ('cancelled','rejected')
    ORDER BY created_at
    LIMIT p_limit
  LOOP
    v_stage := r.workflow_stage_v2;

    UPDATE public.maintenance_requests
       SET rating = COALESCE(rating, 5), archived_at = NULL
     WHERE id = r.id;

    FOREACH s IN ARRAY v_path LOOP
      IF array_position(v_path, v_stage) IS NOT NULL
         AND array_position(v_path, s) <= array_position(v_path, v_stage) THEN
        CONTINUE;
      END IF;

      UPDATE public.maintenance_requests
         SET workflow_stage_v2 = s,
             updated_at = now()
       WHERE id = r.id;
      v_stage := s;
    END LOOP;

    v_count := v_count + 1;
  END LOOP;

  ALTER TABLE public.maintenance_requests ENABLE TRIGGER trg_on_stage_transition_enqueue_wa;
  ALTER TABLE public.maintenance_requests ENABLE TRIGGER trg_daftra_sync_on_billed;
  RETURN v_count;
END;
$function$;

REVOKE ALL ON FUNCTION public.fn_backfill_lifecycle_batch(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_backfill_lifecycle_batch(integer) TO service_role;
