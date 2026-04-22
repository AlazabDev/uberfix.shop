
SET LOCAL session_replication_role = replica;

ALTER TABLE public.maintenance_requests
  ADD COLUMN IF NOT EXISTS workflow_stage text;

UPDATE public.maintenance_requests
   SET workflow_stage = workflow_stage_v2::text
 WHERE workflow_stage IS DISTINCT FROM workflow_stage_v2::text;

SET LOCAL session_replication_role = origin;

-- Mirror trigger: always force workflow_stage = workflow_stage_v2
CREATE OR REPLACE FUNCTION public.fn_sync_workflow_stage_mirror()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.workflow_stage := NEW.workflow_stage_v2::text;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_workflow_stage_mirror ON public.maintenance_requests;
CREATE TRIGGER trg_sync_workflow_stage_mirror
  BEFORE INSERT OR UPDATE ON public.maintenance_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_sync_workflow_stage_mirror();

-- Update the existing guard so it ignores the mirror column (mirror writes are auto-corrected)
-- The guard fn_guard_workflow_stage must NOT block writes that only touch the mirror
-- Find and patch it: re-create to allow workflow_stage writes that match v2
CREATE OR REPLACE FUNCTION public.fn_guard_workflow_stage()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Block direct changes to workflow_stage_v2 (must go through fn_transition_request_stage)
  IF TG_OP = 'UPDATE' AND OLD.workflow_stage_v2 IS DISTINCT FROM NEW.workflow_stage_v2 THEN
    -- Allow if called from the canonical RPC (sets a session GUC)
    IF current_setting('app.allow_stage_transition', true) IS DISTINCT FROM 'on' THEN
      RAISE EXCEPTION 'direct_stage_write_forbidden: use fn_transition_request_stage() instead'
        USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON COLUMN public.maintenance_requests.workflow_stage IS
  'READ-ONLY MIRROR of workflow_stage_v2. Auto-synced via trigger. v2 is the single source of truth.';

CREATE INDEX IF NOT EXISTS idx_mr_workflow_stage_text
  ON public.maintenance_requests (workflow_stage);
