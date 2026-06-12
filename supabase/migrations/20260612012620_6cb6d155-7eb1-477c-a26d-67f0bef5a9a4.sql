
-- 1) Tighten user_roles self-insert: only allow 'customer'
DROP POLICY IF EXISTS users_insert_own_initial_role ON public.user_roles;
CREATE POLICY users_insert_own_customer_role ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND role = 'customer'::public.app_role
    AND NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid())
  );

-- 2) OTP hashing: add hash column, drop plaintext
ALTER TABLE public.otp_verifications ADD COLUMN IF NOT EXISTS otp_code_hash text;
ALTER TABLE public.otp_verifications ALTER COLUMN otp_code DROP NOT NULL;
-- Invalidate any existing plaintext OTPs
UPDATE public.otp_verifications SET verified = true WHERE verified = false;
ALTER TABLE public.otp_verifications DROP COLUMN IF EXISTS otp_code;

-- 3) Storage policies
-- 'downloud' is public: allow public read, restrict writes to admin/owner
DROP POLICY IF EXISTS "downloud_public_read" ON storage.objects;
CREATE POLICY "downloud_public_read" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'downloud');
DROP POLICY IF EXISTS "downloud_admin_write" ON storage.objects;
CREATE POLICY "downloud_admin_write" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'downloud' AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner')));
DROP POLICY IF EXISTS "downloud_admin_update" ON storage.objects;
CREATE POLICY "downloud_admin_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'downloud' AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner')));
DROP POLICY IF EXISTS "downloud_admin_delete" ON storage.objects;
CREATE POLICY "downloud_admin_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'downloud' AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner')));

-- 'docs-secret' private: admin/owner only
DROP POLICY IF EXISTS "docs_secret_admin_all" ON storage.objects;
CREATE POLICY "docs_secret_admin_all" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'docs-secret' AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner')))
  WITH CHECK (bucket_id = 'docs-secret' AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner')));

-- technician-documents: explicit UPDATE policy for owning technician
DROP POLICY IF EXISTS "tech_docs_owner_update" ON storage.objects;
CREATE POLICY "tech_docs_owner_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'technician-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'technician-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
