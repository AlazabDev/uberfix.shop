-- Drop the permissive policies
DROP POLICY IF EXISTS "Allow users to delete their uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to update their uploads" ON storage.objects;

-- Recreate with ownership scoping (folder name must equal auth.uid())
CREATE POLICY "tech_reg_docs_owner_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'technician-registration-docs'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "tech_reg_docs_owner_update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'technician-registration-docs'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'technician-registration-docs'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow admins/owners to manage any file in this bucket (review workflow)
CREATE POLICY "tech_reg_docs_admin_manage"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'technician-registration-docs'
  AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'owner'::app_role))
)
WITH CHECK (
  bucket_id = 'technician-registration-docs'
  AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'owner'::app_role))
);