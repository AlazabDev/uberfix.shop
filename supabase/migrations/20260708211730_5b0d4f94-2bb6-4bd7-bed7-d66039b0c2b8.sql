
-- Remove overly broad SELECT policies on technician_trades
DROP POLICY IF EXISTS technician_trades_select_authenticated ON public.technician_trades;
DROP POLICY IF EXISTS "Authenticated can view technician_trades" ON public.technician_trades;

-- Remove overly broad SELECT policies on technician_coverage_areas
DROP POLICY IF EXISTS technician_coverage_areas_select_authenticated ON public.technician_coverage_areas;
DROP POLICY IF EXISTS "Authenticated can view technician_coverage_areas" ON public.technician_coverage_areas;

-- Restrict avatars bucket SELECT to owner folder (or staff)
DROP POLICY IF EXISTS avatars_read_authenticated ON storage.objects;
CREATE POLICY avatars_read_own_or_staff ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'avatars'
  AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'manager'::public.app_role)
    OR public.has_role(auth.uid(), 'staff'::public.app_role)
  )
);
