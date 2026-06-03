GRANT EXECUTE ON FUNCTION public.get_public_technicians_for_map() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_active_requests_for_map() TO authenticated;
GRANT EXECUTE ON FUNCTION public.assign_technician_to_map_request(uuid, uuid) TO authenticated;