
CREATE OR REPLACE FUNCTION public.get_active_requests_for_map()
RETURNS TABLE (
  id uuid, request_number text, workflow_stage text, priority text,
  latitude numeric, longitude numeric, customer_display text,
  assigned_technician_id uuid, branch_id uuid, property_id uuid,
  sla_due_date timestamptz, is_sla_breached boolean, created_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT mr.id, mr.request_number, mr.workflow_stage::text,
    COALESCE(mr.priority::text,'normal'),
    mr.latitude::numeric, mr.longitude::numeric,
    CASE WHEN public.has_role(auth.uid(),'admin')
              OR public.has_role(auth.uid(),'manager')
              OR public.has_role(auth.uid(),'staff')
              OR public.has_role(auth.uid(),'dispatcher')
         THEN COALESCE(mr.client_name,'عميل')
         ELSE 'عميل ' || substr(COALESCE(mr.request_number,'XXX'),-4)
    END,
    mr.assigned_technician_id, mr.branch_id, mr.property_id,
    mr.sla_due_date,
    (mr.sla_due_date IS NOT NULL AND mr.sla_due_date < now()
       AND mr.workflow_stage NOT IN ('closed','cancelled','rejected')),
    mr.created_at
  FROM public.maintenance_requests mr
  WHERE mr.latitude IS NOT NULL AND mr.longitude IS NOT NULL
    AND mr.workflow_stage NOT IN ('closed','cancelled','rejected','draft')
    AND mr.archived_at IS NULL;
$$;
REVOKE ALL ON FUNCTION public.get_active_requests_for_map() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_active_requests_for_map() TO authenticated;

CREATE OR REPLACE FUNCTION public.assign_technician_to_map_request(p_request_id uuid, p_technician_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_ok boolean;
BEGIN
  SELECT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager')
       OR public.has_role(auth.uid(),'staff') OR public.has_role(auth.uid(),'dispatcher')) INTO v_ok;
  IF NOT v_ok THEN RETURN jsonb_build_object('success',false,'error','unauthorized'); END IF;
  UPDATE public.maintenance_requests
    SET assigned_technician_id = p_technician_id,
        workflow_stage = CASE WHEN workflow_stage IN ('draft','submitted','acknowledged')
                              THEN 'assigned'::workflow_stage_t ELSE workflow_stage END,
        updated_at = now()
    WHERE id = p_request_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success',false,'error','request_not_found'); END IF;
  RETURN jsonb_build_object('success',true);
END $$;
REVOKE ALL ON FUNCTION public.assign_technician_to_map_request(uuid,uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.assign_technician_to_map_request(uuid,uuid) TO authenticated;

DROP VIEW IF EXISTS public.v_properties_for_map;
CREATE VIEW public.v_properties_for_map WITH (security_invoker=true) AS
SELECT id, code, name, type, status, address, latitude, longitude, qr_code_data
FROM public.properties
WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND status <> 'archived';
GRANT SELECT ON public.v_properties_for_map TO authenticated;

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.technicians;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.maintenance_requests;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;
ALTER TABLE public.technicians REPLICA IDENTITY FULL;
ALTER TABLE public.maintenance_requests REPLICA IDENTITY FULL;
