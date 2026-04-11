
-- Fix documents bucket: remove broad public write/delete policies
DROP POLICY IF EXISTS "Allow authenticated delete on documents bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated update on documents bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated upload to documents bucket" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload documents" ON storage.objects;

-- Fix uploads bucket: remove broad read policies
DROP POLICY IF EXISTS "uploads_auth_select" ON storage.objects;
DROP POLICY IF EXISTS "authenticated read" ON storage.objects;

-- Create ownership-scoped read for uploads
CREATE POLICY "uploads_owner_or_staff_read" ON storage.objects
FOR SELECT USING (
  bucket_id = 'uploads'
  AND auth.uid() IS NOT NULL
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin', 'manager', 'staff')
    )
  )
);
