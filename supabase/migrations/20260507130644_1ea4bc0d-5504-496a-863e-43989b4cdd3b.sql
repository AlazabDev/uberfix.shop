
-- ===== STORAGE: drop weak duplicate policies =====
DROP POLICY IF EXISTS "Users can upload invoices" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view documents" ON storage.objects;
DROP POLICY IF EXISTS "authenticated upload" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload property images" ON storage.objects;
DROP POLICY IF EXISTS "property_images_authenticated_insert" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload review images" ON storage.objects;
DROP POLICY IF EXISTS "Technicians can upload their documents" ON storage.objects;
DROP POLICY IF EXISTS "Technicians upload verification docs" ON storage.objects;

-- Replacement policies with folder-ownership checks
CREATE POLICY "property_images_owner_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'property-images'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );

CREATE POLICY "review_images_owner_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'review-images'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );

CREATE POLICY "verification_docs_owner_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'verification-documents'
    AND (storage.foldername(name))[1] = ANY (ARRAY['national-id-front','national-id-back','selfies'])
    AND (storage.foldername(name))[2] = (auth.uid())::text
  );

-- ===== PUBLIC TABLES =====

-- chatbot_knowledge: restrict to authenticated
DROP POLICY IF EXISTS "Anyone can read active knowledge" ON public.chatbot_knowledge;
CREATE POLICY "Authenticated can read active knowledge" ON public.chatbot_knowledge
  FOR SELECT TO authenticated
  USING (is_active = true);

-- wa_projects: restrict reads to owner/admin/manager
DROP POLICY IF EXISTS "Authenticated users can read wa_projects" ON public.wa_projects;
CREATE POLICY "wa_projects_admin_read" ON public.wa_projects
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'owner'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'manager'::app_role)
  );

-- media_files: drop broad authenticated read
DROP POLICY IF EXISTS "Authenticated users can read media files" ON public.media_files;

-- media_stats_daily: drop broad authenticated read
DROP POLICY IF EXISTS "Authenticated users can read media stats" ON public.media_stats_daily;

-- stores: restrict read to staff roles only
DROP POLICY IF EXISTS "stores_auth_read" ON public.stores;
CREATE POLICY "stores_staff_read" ON public.stores
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'owner'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'manager'::app_role)
    OR has_role(auth.uid(), 'staff'::app_role)
  );

-- pending_technician_registrations: restrict cleanup to service_role only
DROP POLICY IF EXISTS "Can delete expired registrations" ON public.pending_technician_registrations;

-- technician_performance: drop broad staff-read policy (admin/manager retain via other policies)
DROP POLICY IF EXISTS "Technicians view own performance" ON public.technician_performance;
DROP POLICY IF EXISTS "technician_performance_read_authenticated" ON public.technician_performance;

-- wa_webhooks: restrict reads to owner/admin (remove manager)
DROP POLICY IF EXISTS "Admin read wa_webhooks" ON public.wa_webhooks;
DROP POLICY IF EXISTS "wa_webhooks_admin_only" ON public.wa_webhooks;
CREATE POLICY "wa_webhooks_owner_admin_select" ON public.wa_webhooks
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'owner'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
  );
CREATE POLICY "wa_webhooks_owner_admin_modify" ON public.wa_webhooks
  FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'owner'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'owner'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- api_webhook_subscriptions: restrict to owner/admin
DROP POLICY IF EXISTS "Admins manage webhook subscriptions" ON public.api_webhook_subscriptions;
DROP POLICY IF EXISTS "webhook_subs_admin_all" ON public.api_webhook_subscriptions;
CREATE POLICY "webhook_subs_owner_admin_all" ON public.api_webhook_subscriptions
  FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'owner'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
    OR is_owner_email()
  )
  WITH CHECK (
    has_role(auth.uid(), 'owner'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
    OR is_owner_email()
  );

-- payment_transactions: add service_role policy for reconciliation
DROP POLICY IF EXISTS "payment_tx_service_role" ON public.payment_transactions;
CREATE POLICY "payment_tx_service_role" ON public.payment_transactions
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
