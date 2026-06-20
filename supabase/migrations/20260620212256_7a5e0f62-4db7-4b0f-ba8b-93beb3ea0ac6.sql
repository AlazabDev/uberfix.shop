
-- 1. Add manager to documents SELECT policy
DROP POLICY IF EXISTS "documents_select_strict" ON public.documents;
CREATE POLICY "documents_select_strict" ON public.documents
FOR SELECT
USING (
  created_by = auth.uid()
  OR public.has_role(auth.uid(), 'owner'::app_role)
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'manager'::app_role)
);

-- 2. logo bucket: admin/owner-only writes
DROP POLICY IF EXISTS "logo_admin_insert" ON storage.objects;
CREATE POLICY "logo_admin_insert" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'logo'
  AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'owner'::app_role))
);

DROP POLICY IF EXISTS "logo_admin_update" ON storage.objects;
CREATE POLICY "logo_admin_update" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'logo'
  AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'owner'::app_role))
);

DROP POLICY IF EXISTS "logo_admin_delete" ON storage.objects;
CREATE POLICY "logo_admin_delete" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'logo'
  AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'owner'::app_role))
);

-- 3. az_gallery bucket: admin/staff-only writes
DROP POLICY IF EXISTS "az_gallery_staff_insert" ON storage.objects;
CREATE POLICY "az_gallery_staff_insert" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'az_gallery'
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'owner'::app_role)
    OR public.has_role(auth.uid(), 'manager'::app_role)
    OR public.has_role(auth.uid(), 'staff'::app_role)
  )
);

DROP POLICY IF EXISTS "az_gallery_staff_update" ON storage.objects;
CREATE POLICY "az_gallery_staff_update" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'az_gallery'
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'owner'::app_role)
    OR public.has_role(auth.uid(), 'manager'::app_role)
    OR public.has_role(auth.uid(), 'staff'::app_role)
  )
);

DROP POLICY IF EXISTS "az_gallery_staff_delete" ON storage.objects;
CREATE POLICY "az_gallery_staff_delete" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'az_gallery'
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'owner'::app_role)
    OR public.has_role(auth.uid(), 'manager'::app_role)
    OR public.has_role(auth.uid(), 'staff'::app_role)
  )
);
