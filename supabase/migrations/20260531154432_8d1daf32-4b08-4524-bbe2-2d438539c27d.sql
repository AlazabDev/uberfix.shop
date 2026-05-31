
CREATE OR REPLACE FUNCTION public.log_request_lifecycle()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_status_cast public.maintenance_status;
BEGIN
  -- Safe cast: workflow_stage text → maintenance_status enum
  BEGIN
    v_status_cast := NEW.workflow_stage::public.maintenance_status;
  EXCEPTION WHEN OTHERS THEN
    v_status_cast := 'submitted'::public.maintenance_status;
  END;

  IF TG_OP = 'UPDATE' AND OLD.workflow_stage_v2 IS DISTINCT FROM NEW.workflow_stage_v2 THEN
    INSERT INTO public.request_lifecycle (
      request_id, status, update_type, updated_by, update_notes, metadata
    ) VALUES (
      NEW.id, v_status_cast, 'status_change',
      COALESCE(auth.uid(), NEW.last_modified_by),
      CONCAT('Stage: ', OLD.workflow_stage_v2, ' → ', NEW.workflow_stage_v2),
      jsonb_build_object(
        'from_stage', OLD.workflow_stage_v2,
        'to_stage',   NEW.workflow_stage_v2,
        'from_status', OLD.status,
        'to_status',   NEW.status
      )
    );
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.assigned_technician_id IS DISTINCT FROM NEW.assigned_technician_id THEN
    INSERT INTO public.request_lifecycle (
      request_id, status, update_type, updated_by, update_notes, metadata
    ) VALUES (
      NEW.id, v_status_cast, 'assignment',
      COALESCE(auth.uid(), NEW.last_modified_by),
      'Technician assignment updated',
      jsonb_build_object(
        'old_technician', OLD.assigned_technician_id,
        'new_technician', NEW.assigned_technician_id
      )
    );
  END IF;
  RETURN NEW;
END;
$$;
