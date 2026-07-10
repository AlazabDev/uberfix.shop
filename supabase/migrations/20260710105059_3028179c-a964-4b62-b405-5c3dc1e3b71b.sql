
-- Fix: uploads bucket INSERT must be folder-scoped to auth.uid()
DROP POLICY IF EXISTS uploads_auth_insert ON storage.objects;
CREATE POLICY uploads_auth_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'uploads'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Fix: add explicit SELECT policies for public buckets (make public read intent explicit)
DROP POLICY IF EXISTS "public read property-images" ON storage.objects;
CREATE POLICY "public read property-images" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'property-images');

DROP POLICY IF EXISTS "public read review-images" ON storage.objects;
CREATE POLICY "public read review-images" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'review-images');

DROP POLICY IF EXISTS "public read downloud" ON storage.objects;
CREATE POLICY "public read downloud" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'downloud');

-- Fix: document_reviewers must allow external reviewer access via access_hash header
-- The access_hash is a secret token passed via request header (set by app / edge function).
DROP POLICY IF EXISTS doc_reviewers_select_by_hash ON public.document_reviewers;
CREATE POLICY doc_reviewers_select_by_hash ON public.document_reviewers
  FOR SELECT TO anon, authenticated
  USING (
    access_hash IS NOT NULL
    AND access_hash = current_setting('request.headers', true)::json->>'x-reviewer-access-hash'
  );

DROP POLICY IF EXISTS doc_reviewers_update_by_hash ON public.document_reviewers;
CREATE POLICY doc_reviewers_update_by_hash ON public.document_reviewers
  FOR UPDATE TO anon, authenticated
  USING (
    access_hash IS NOT NULL
    AND access_hash = current_setting('request.headers', true)::json->>'x-reviewer-access-hash'
  )
  WITH CHECK (
    access_hash IS NOT NULL
    AND access_hash = current_setting('request.headers', true)::json->>'x-reviewer-access-hash'
  );
