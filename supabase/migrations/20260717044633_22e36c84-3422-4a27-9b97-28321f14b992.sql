
-- 1) Revoke EXECUTE on internal trigger/guard SECURITY DEFINER functions from anon/authenticated
REVOKE EXECUTE ON FUNCTION public.guard_technician_profiles_approval_fields() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.guard_technicians_staff_only_fields() FROM anon, authenticated, PUBLIC;

-- 2) error_logs: tighten SELECT to admin/owner only
DO $$
DECLARE p RECORD;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='error_logs' AND cmd='SELECT'
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.error_logs', p.policyname); END LOOP;
END $$;

CREATE POLICY error_logs_admin_owner_read ON public.error_logs
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'owner'::app_role)
  );

-- 3) bot_sessions: tighten SELECT to admin/owner only (drop broad admin-only permissive that lets any admin read)
DO $$
DECLARE p RECORD;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='bot_sessions' AND cmd='SELECT'
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.bot_sessions', p.policyname); END LOOP;
END $$;

CREATE POLICY bot_sessions_admin_owner_read ON public.bot_sessions
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'owner'::app_role)
  );
