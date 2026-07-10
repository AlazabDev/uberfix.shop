
-- 1) app_settings: drop redundant duplicate SELECT policy; keep single owner-only guard
DROP POLICY IF EXISTS app_settings_select_owner_only ON public.app_settings;
-- settings_owner_only (ALL, is_owner_email()) remains as sole guard

-- 2) invoices: add SELECT for manager/staff/finance/accounting to close usability gap
DROP POLICY IF EXISTS invoices_select_staff ON public.invoices;
CREATE POLICY invoices_select_staff ON public.invoices
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'manager'::app_role)
    OR public.has_role(auth.uid(), 'staff'::app_role)
    OR public.has_role(auth.uid(), 'finance'::app_role)
    OR public.has_role(auth.uid(), 'accounting'::app_role)
    OR public.has_role(auth.uid(), 'owner'::app_role)
  );

-- 3) Remove legacy whatsapp table from realtime publication (avoid broadcasting PII)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = '_legacy_whatsapp_messages'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public._legacy_whatsapp_messages';
  END IF;
END $$;

-- 4) Revoke EXECUTE on anon-accessible SECURITY DEFINER helpers from PUBLIC/anon where not required.
--    Keep authenticated + service_role since RLS helpers must run for signed-in users.
DO $$
DECLARE
  fn record;
BEGIN
  FOR fn IN
    SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = true
      AND p.proname IN ('has_role','is_owner_email','get_smtp_config')
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM PUBLIC, anon',
                   fn.proname, fn.args);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO authenticated, service_role',
                   fn.proname, fn.args);
  END LOOP;
END $$;
