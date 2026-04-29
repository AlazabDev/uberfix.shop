
-- 1) Add column to track which API consumer created the request (for scope-limited transitions)
ALTER TABLE public.maintenance_requests
  ADD COLUMN IF NOT EXISTS created_via_consumer_id uuid REFERENCES public.api_consumers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_maintenance_requests_consumer
  ON public.maintenance_requests(created_via_consumer_id)
  WHERE created_via_consumer_id IS NOT NULL;

-- 2) Wire the existing auto_notify_on_status_change trigger function to fire on real updates.
--    The function already exists but no trigger references it. Also fire on workflow_stage_v2 changes.
DROP TRIGGER IF EXISTS trg_auto_notify_on_status_change ON public.maintenance_requests;
CREATE TRIGGER trg_auto_notify_on_status_change
AFTER UPDATE OF status, workflow_stage, workflow_stage_v2 ON public.maintenance_requests
FOR EACH ROW
WHEN (
  OLD.status IS DISTINCT FROM NEW.status
  OR OLD.workflow_stage IS DISTINCT FROM NEW.workflow_stage
  OR OLD.workflow_stage_v2 IS DISTINCT FROM NEW.workflow_stage_v2
)
EXECUTE FUNCTION public.auto_notify_on_status_change();

-- 3) Optional: track API key id used in audit logs via a helper
--    (no schema change needed; gateway will write it)
