
-- Fix 1: SLA due_date
CREATE OR REPLACE FUNCTION public.auto_calculate_sla()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  accept_hours INTEGER := 2;
  arrive_hours INTEGER := 4;
  complete_hours INTEGER := 24;
BEGIN
  IF NEW.priority IS NULL OR NEW.priority NOT IN ('high', 'medium', 'low') THEN
    NEW.priority := 'medium';
  END IF;
  CASE NEW.priority
    WHEN 'high' THEN accept_hours := 1; arrive_hours := 2; complete_hours := 8;
    WHEN 'medium' THEN accept_hours := 2; arrive_hours := 4; complete_hours := 24;
    WHEN 'low' THEN accept_hours := 4; arrive_hours := 8; complete_hours := 48;
    ELSE accept_hours := 2; arrive_hours := 4; complete_hours := 24;
  END CASE;
  NEW.sla_accept_due := COALESCE(NEW.created_at, NOW()) + (accept_hours || ' hours')::INTERVAL;
  NEW.sla_arrive_due := COALESCE(NEW.created_at, NOW()) + (arrive_hours || ' hours')::INTERVAL;
  NEW.sla_complete_due := COALESCE(NEW.created_at, NOW()) + (complete_hours || ' hours')::INTERVAL;
  NEW.sla_due_date := NEW.sla_complete_due;
  RETURN NEW;
END;
$function$;

-- Fix 2: Drop and recreate public_track_request with branch_name
DROP FUNCTION IF EXISTS public.public_track_request(text);

CREATE OR REPLACE FUNCTION public.public_track_request(query_text text)
RETURNS TABLE(
  id uuid, request_number text, title text, description text, status text,
  workflow_stage text, created_at timestamptz, updated_at timestamptz,
  client_name text, location text, priority text, service_type text,
  sla_due_date timestamptz, rating smallint, channel text, branch_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  cleaned text;
BEGIN
  cleaned := trim(query_text);
  IF cleaned ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RETURN QUERY
    SELECT mr.id, mr.request_number, mr.title, mr.description, mr.status::text, mr.workflow_stage,
           mr.created_at, mr.updated_at, mr.client_name, mr.location, mr.priority,
           mr.service_type, mr.sla_due_date, mr.rating, mr.channel, b.name as branch_name
    FROM maintenance_requests mr LEFT JOIN branches b ON b.id = mr.branch_id
    WHERE mr.id = cleaned::uuid LIMIT 1;
    IF FOUND THEN RETURN; END IF;
  END IF;
  RETURN QUERY
  SELECT mr.id, mr.request_number, mr.title, mr.description, mr.status::text, mr.workflow_stage,
         mr.created_at, mr.updated_at, mr.client_name, mr.location, mr.priority,
         mr.service_type, mr.sla_due_date, mr.rating, mr.channel, b.name as branch_name
  FROM maintenance_requests mr LEFT JOIN branches b ON b.id = mr.branch_id
  WHERE upper(mr.request_number) = upper(cleaned) LIMIT 1;
  IF FOUND THEN RETURN; END IF;
  RETURN QUERY
  SELECT mr.id, mr.request_number, mr.title, mr.description, mr.status::text, mr.workflow_stage,
         mr.created_at, mr.updated_at, mr.client_name, mr.location, mr.priority,
         mr.service_type, mr.sla_due_date, mr.rating, mr.channel, b.name as branch_name
  FROM maintenance_requests mr LEFT JOIN branches b ON b.id = mr.branch_id
  WHERE mr.client_phone = cleaned
     OR mr.client_phone = regexp_replace(cleaned, '^\+?20', '0')
     OR regexp_replace(mr.client_phone, '^\+?20', '0') = regexp_replace(cleaned, '^\+?20', '0')
  ORDER BY mr.created_at DESC LIMIT 5;
END;
$function$;

-- Fix 3: Backfill sla_due_date
UPDATE maintenance_requests SET sla_due_date = sla_complete_due WHERE sla_due_date IS NULL AND sla_complete_due IS NOT NULL;

-- Fix 4: Remove duplicate trigger
DO $$
DECLARE v_func_name text;
BEGIN
  SELECT p.proname INTO v_func_name FROM pg_trigger t JOIN pg_proc p ON p.oid = t.tgfoid
  WHERE t.tgname = 'maintenance_request_status_notification' AND t.tgrelid = 'maintenance_requests'::regclass;
  IF v_func_name = 'notify_on_status_change' THEN
    DROP TRIGGER IF EXISTS maintenance_request_status_notification ON maintenance_requests;
  END IF;
END $$;
