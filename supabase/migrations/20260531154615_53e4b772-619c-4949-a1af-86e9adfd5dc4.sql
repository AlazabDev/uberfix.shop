
CREATE OR REPLACE FUNCTION public.fn_handle_request_closure()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_catalog'
AS $$
BEGIN
  IF NEW.workflow_stage_v2 = 'closed' AND (OLD.workflow_stage_v2 IS DISTINCT FROM 'closed') THEN
    NEW.closed_at   := COALESCE(NEW.closed_at, now());
    NEW.archived_at := COALESCE(NEW.archived_at, now());
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
$$;
