
-- Tighten uploads bucket INSERT to folder scope
DROP POLICY IF EXISTS "uploads_auth_insert" ON storage.objects;
CREATE POLICY "uploads_auth_insert" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'uploads'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = (auth.uid())::text
);

-- Restrict technician_levels & technician_badges SELECT to authenticated only
DROP POLICY IF EXISTS "Public read levels" ON public.technician_levels;
DROP POLICY IF EXISTS "Public view levels" ON public.technician_levels;
CREATE POLICY "Authenticated read levels" ON public.technician_levels
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Public read badges" ON public.technician_badges;
DROP POLICY IF EXISTS "Public view badges" ON public.technician_badges;
CREATE POLICY "Authenticated read badges" ON public.technician_badges
FOR SELECT TO authenticated USING (true);

REVOKE SELECT ON public.technician_levels FROM anon;
REVOKE SELECT ON public.technician_badges FROM anon;
