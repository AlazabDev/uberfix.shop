
-- Grant EXECUTE on has_role and related role-check functions to authenticated/anon
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, anon, service_role;

-- Re-grant on any other commonly-called role helpers if present
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('has_role','is_admin','is_owner','get_user_roles','assign_user_role','confirm_user_role')
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION %I.%I(%s) TO authenticated, anon, service_role',
                   r.nspname, r.proname, r.args);
  END LOOP;
END $$;

-- Ensure user_roles table allows authenticated users to insert their own role (confirm-role flow)
GRANT SELECT, INSERT ON public.user_roles TO authenticated;

-- Policy: allow authenticated users to insert their own role row if they don't already have one
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='user_roles' AND policyname='users_insert_own_initial_role'
  ) THEN
    CREATE POLICY users_insert_own_initial_role
      ON public.user_roles
      FOR INSERT
      TO authenticated
      WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='user_roles' AND policyname='users_select_own_roles'
  ) THEN
    CREATE POLICY users_select_own_roles
      ON public.user_roles
      FOR SELECT
      TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;
