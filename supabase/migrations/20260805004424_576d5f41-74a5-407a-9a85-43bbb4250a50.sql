REVOKE ALL ON FUNCTION public.get_active_requests_for_map() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_active_requests_for_map() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.assign_technician_to_map_request(
  p_request_id uuid,
  p_technician_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ok boolean := false;
  v_user_id uuid := auth.uid();
  v_technician_exists boolean := false;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'authentication_required');
  END IF;

  SELECT public.has_role(v_user_id, 'admin')
      OR public.has_role(v_user_id, 'manager')
      OR public.has_role(v_user_id, 'staff')
      OR public.has_role(v_user_id, 'dispatcher')
    INTO v_ok;

  IF NOT v_ok THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized');
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.provider_public_profiles p
    WHERE p.legacy_id = p_technician_id
      AND p.provider_kind = 'technician'
      AND p.is_public = true
      AND p.is_active = true
  ) INTO v_technician_exists;

  IF NOT v_technician_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'technician_not_available');
  END IF;

  UPDATE public.maintenance_requests
     SET assigned_technician_id = p_technician_id,
         workflow_stage = CASE
           WHEN workflow_stage IN ('draft', 'submitted', 'acknowledged', 'triaged')
             THEN 'assigned'
           ELSE workflow_stage
         END,
         assigned_at = COALESCE(assigned_at, now()),
         assigned_by = v_user_id,
         last_modified_by = v_user_id,
         updated_at = now()
   WHERE id = p_request_id
     AND workflow_stage NOT IN ('closed', 'cancelled', 'rejected');

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'request_not_found_or_terminal');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'request_id', p_request_id,
    'technician_id', p_technician_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.assign_technician_to_map_request(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assign_technician_to_map_request(uuid, uuid) TO authenticated, service_role;