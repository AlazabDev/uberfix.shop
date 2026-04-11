
-- 1. Remove public read policies from 'documents' bucket
DROP POLICY IF EXISTS "Allow public read on documents bucket" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for documents" ON storage.objects;

-- 2. Remove public read policy from 'technician-registration-docs' bucket
DROP POLICY IF EXISTS "Allow public read for technician docs" ON storage.objects;

-- 3. Fix technician-documents: replace broad auth policy with ownership-scoped
DROP POLICY IF EXISTS "Technicians and staff can view documents" ON storage.objects;

CREATE POLICY "technician_docs_owner_or_staff_read" ON storage.objects
FOR SELECT USING (
  bucket_id = 'technician-documents'
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

-- 4. Remove broad cross-tenant wa_templates policy
DROP POLICY IF EXISTS "Authenticated read wa_templates" ON public.wa_templates;

-- 5. Add RLS on realtime.messages if not already enabled
ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;
