
-- Function to track requests publicly (bypasses RLS safely)
CREATE OR REPLACE FUNCTION public.public_track_request(query_text text)
RETURNS TABLE(
  id uuid,
  request_number text,
  title text,
  description text,
  status text,
  workflow_stage text,
  created_at timestamptz,
  updated_at timestamptz,
  client_name text,
  location text,
  priority text,
  service_type text,
  sla_due_date timestamptz,
  rating numeric,
  channel text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  cleaned text;
BEGIN
  cleaned := trim(query_text);
  
  -- Try UUID match
  IF cleaned ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RETURN QUERY
    SELECT mr.id, mr.request_number, mr.title, mr.description, mr.status, mr.workflow_stage,
           mr.created_at, mr.updated_at, mr.client_name, mr.location, mr.priority,
           mr.service_type, mr.sla_due_date, mr.rating, mr.channel
    FROM maintenance_requests mr
    WHERE mr.id = cleaned::uuid
    LIMIT 1;
    IF FOUND THEN RETURN; END IF;
  END IF;

  -- Try request_number match (case-insensitive)
  RETURN QUERY
  SELECT mr.id, mr.request_number, mr.title, mr.description, mr.status, mr.workflow_stage,
         mr.created_at, mr.updated_at, mr.client_name, mr.location, mr.priority,
         mr.service_type, mr.sla_due_date, mr.rating, mr.channel
  FROM maintenance_requests mr
  WHERE upper(mr.request_number) = upper(cleaned)
  LIMIT 1;
  IF FOUND THEN RETURN; END IF;

  -- Try phone number match (return latest request)
  RETURN QUERY
  SELECT mr.id, mr.request_number, mr.title, mr.description, mr.status, mr.workflow_stage,
         mr.created_at, mr.updated_at, mr.client_name, mr.location, mr.priority,
         mr.service_type, mr.sla_due_date, mr.rating, mr.channel
  FROM maintenance_requests mr
  WHERE mr.client_phone = cleaned
     OR mr.client_phone = regexp_replace(cleaned, '^\+?20', '0')
     OR regexp_replace(mr.client_phone, '^\+?20', '0') = regexp_replace(cleaned, '^\+?20', '0')
  ORDER BY mr.created_at DESC
  LIMIT 5;
END;
$$;

-- Grant execute to anon and authenticated
GRANT EXECUTE ON FUNCTION public.public_track_request(text) TO anon, authenticated;
