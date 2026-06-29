
-- 1) api_consumers: stop storing plaintext api_key
ALTER TABLE public.api_consumers ALTER COLUMN api_key DROP DEFAULT;
ALTER TABLE public.api_consumers ALTER COLUMN api_key DROP NOT NULL;
UPDATE public.api_consumers SET api_key = NULL WHERE api_key IS NOT NULL AND api_key_hash IS NOT NULL;

-- 2) documents: enforce ownership on INSERT
DROP POLICY IF EXISTS documents_insert_staff ON public.documents;
CREATE POLICY documents_insert_staff ON public.documents
  FOR INSERT TO authenticated
  WITH CHECK (
    is_staff(auth.uid())
    AND created_by = auth.uid()
  );

-- 3) wa_api_keys: restrict key_hash access to owner/admin only (remove manager)
DROP POLICY IF EXISTS "Admin read wa_api_keys" ON public.wa_api_keys;
DROP POLICY IF EXISTS wa_api_keys_admin_only ON public.wa_api_keys;

CREATE POLICY wa_api_keys_owner_admin_select ON public.wa_api_keys
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY wa_api_keys_owner_admin_write ON public.wa_api_keys
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
