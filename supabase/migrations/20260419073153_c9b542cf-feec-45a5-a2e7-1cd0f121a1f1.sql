
-- 1. إزالة سياسات SELECT الفضفاضة على technician_performance
DROP POLICY IF EXISTS "Authenticated can view technician_performance" ON public.technician_performance;
DROP POLICY IF EXISTS "technician_performance_select_authenticated" ON public.technician_performance;

-- 2. إزالة سياسات update/delete الفضفاضة على uploads bucket
DROP POLICY IF EXISTS "authenticated update" ON storage.objects;
DROP POLICY IF EXISTS "authenticated delete" ON storage.objects;

-- 3. إضافة سياسة UPDATE مقيدة بالملكية لـ uploads
CREATE POLICY "uploads_owner_or_staff_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'uploads'
  AND auth.uid() IS NOT NULL
  AND (
    (storage.foldername(name))[1] = (auth.uid())::text
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = ANY (ARRAY['admin'::app_role, 'manager'::app_role, 'owner'::app_role])
    )
  )
)
WITH CHECK (
  bucket_id = 'uploads'
  AND auth.uid() IS NOT NULL
  AND (
    (storage.foldername(name))[1] = (auth.uid())::text
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = ANY (ARRAY['admin'::app_role, 'manager'::app_role, 'owner'::app_role])
    )
  )
);
