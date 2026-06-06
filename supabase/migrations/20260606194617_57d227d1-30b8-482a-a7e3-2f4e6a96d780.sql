-- Revoke EXECUTE on trigger-only SECURITY DEFINER functions
-- These should never be invoked via PostgREST RPC; they're called by table triggers only.
REVOKE EXECUTE ON FUNCTION public.fn_auto_create_invoice_on_billed() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_invoice_set_defaults() FROM PUBLIC, anon, authenticated;

-- Restrict public_get_request_timeline_notes from anon (intended for authenticated tracking only)
REVOKE EXECUTE ON FUNCTION public.public_get_request_timeline_notes(uuid) FROM anon;