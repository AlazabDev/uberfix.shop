REVOKE ALL ON FUNCTION public.public_track_request(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_track_request(text) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.public_get_request_timeline_notes(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_get_request_timeline_notes(uuid) TO anon, authenticated;