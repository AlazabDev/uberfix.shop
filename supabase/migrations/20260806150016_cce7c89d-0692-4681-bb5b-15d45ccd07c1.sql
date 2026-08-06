-- Public tracking must go through the scoped RPCs only, never blanket table reads.
DROP POLICY IF EXISTS invoice_public_summaries_read ON public.invoice_public_summaries;
DROP POLICY IF EXISTS request_public_tracking_read ON public.request_public_tracking;
DROP POLICY IF EXISTS request_public_events_read ON public.request_public_events;

REVOKE ALL ON public.invoice_public_summaries FROM anon, authenticated;
REVOKE ALL ON public.request_public_tracking FROM anon, authenticated;
REVOKE ALL ON public.request_public_events FROM anon, authenticated;

GRANT ALL ON public.invoice_public_summaries TO service_role;
GRANT ALL ON public.request_public_tracking TO service_role;
GRANT ALL ON public.request_public_events TO service_role;

ALTER TABLE public.invoice_public_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.request_public_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.request_public_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can read public invoice summaries"
ON public.invoice_public_summaries FOR SELECT TO authenticated
USING (public.is_staff() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Staff can read public request tracking"
ON public.request_public_tracking FOR SELECT TO authenticated
USING (public.is_staff() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Staff can read public request events"
ON public.request_public_events FOR SELECT TO authenticated
USING (public.is_staff() OR public.has_role(auth.uid(), 'admin'));

GRANT SELECT ON public.invoice_public_summaries TO authenticated;
GRANT SELECT ON public.request_public_tracking TO authenticated;
GRANT SELECT ON public.request_public_events TO authenticated;

-- The scoped tracking RPCs already require an exact request id / request number,
-- so they run as definer to read the now-restricted source tables.
ALTER FUNCTION public.public_track_request(text) SECURITY DEFINER SET search_path = public;
ALTER FUNCTION public.public_get_invoice_by_request(uuid) SECURITY DEFINER SET search_path = public;
ALTER FUNCTION public.public_get_request_timeline_notes(uuid) SECURITY DEFINER SET search_path = public;