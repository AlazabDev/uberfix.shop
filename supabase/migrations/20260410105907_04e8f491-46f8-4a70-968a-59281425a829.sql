-- C2: Make technician-registration-docs bucket private
UPDATE storage.buckets SET public = false WHERE id = 'technician-registration-docs';

-- Remove anonymous upload policy
DROP POLICY IF EXISTS "Allow public upload for technician registration" ON storage.objects;

-- Add authenticated-only upload with path ownership
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'tech_reg_docs_auth_upload' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "tech_reg_docs_auth_upload" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
      bucket_id = 'technician-registration-docs'
      AND (storage.foldername(name))[1] = auth.uid()::text
    );
  END IF;
END $$;

-- Add authenticated read for own docs only
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'tech_reg_docs_auth_read' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "tech_reg_docs_auth_read" ON storage.objects
    FOR SELECT TO authenticated
    USING (
      bucket_id = 'technician-registration-docs'
      AND (
        (storage.foldername(name))[1] = auth.uid()::text
        OR public.is_staff(auth.uid())
      )
    );
  END IF;
END $$;

-- C3: Make documents bucket private
UPDATE storage.buckets SET public = false WHERE id = 'documents';

-- Remove overly broad policies on documents bucket
DROP POLICY IF EXISTS "Allow authenticated upload to documents bucket" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload/update/delete documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read documents" ON storage.objects;
DROP POLICY IF EXISTS "Public read documents" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view documents" ON storage.objects;