
-- ============================================================
-- Fix 1: Restore missing Data-API GRANTs on public schema.
-- Every public table currently has zero grants for authenticated
-- and anon roles, breaking the frontend across the board.
-- Only adds where missing; never widens anon.
-- ============================================================
DO $$
DECLARE
  tbl record;
  has_priv boolean;
BEGIN
  FOR tbl IN
    SELECT c.relname AS table_name
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE c.relkind = 'r' AND n.nspname = 'public'
  LOOP
    SELECT EXISTS (
      SELECT 1 FROM information_schema.role_table_grants
       WHERE grantee='authenticated' AND table_schema='public' AND table_name=tbl.table_name
         AND privilege_type IN ('SELECT','INSERT','UPDATE','DELETE')
    ) INTO has_priv;
    IF NOT has_priv THEN
      EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', tbl.table_name);
    END IF;

    SELECT EXISTS (
      SELECT 1 FROM information_schema.role_table_grants
       WHERE grantee='service_role' AND table_schema='public' AND table_name=tbl.table_name
         AND privilege_type IN ('SELECT','INSERT','UPDATE','DELETE')
    ) INTO has_priv;
    IF NOT has_priv THEN
      EXECUTE format('GRANT ALL ON public.%I TO service_role', tbl.table_name);
    END IF;
  END LOOP;
END $$;

-- Grant EXECUTE on frequently-called helper functions used by
-- hooks (dashboard stats, requests, notifications, technician id).
GRANT EXECUTE ON FUNCTION public.get_technician_id_for_user(uuid) TO authenticated;

-- ============================================================
-- Fix 2: ensure_current_user_onboarding — profiles.full_name is
-- a GENERATED column (COALESCE(first_name||' '||last_name, name))
-- Writing to it caused 428C9 on every OAuth sign-in refresh.
-- Now we only write to `name` and let full_name be computed.
-- ============================================================
CREATE OR REPLACE FUNCTION public.ensure_current_user_onboarding(
  p_requested_role app_role DEFAULT 'customer'::app_role,
  p_full_name text DEFAULT NULL::text,
  p_phone text DEFAULT NULL::text,
  p_avatar_url text DEFAULT NULL::text
)
RETURNS TABLE(roles app_role[], primary_role app_role, is_new_user boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_email text := coalesce(auth.jwt() ->> 'email', v_user_id::text || '@oauth.local');
  v_name text := nullif(trim(coalesce(p_full_name, auth.jwt() #>> '{user_metadata,full_name}', auth.jwt() #>> '{user_metadata,name}', v_email)), '');
  v_phone text := nullif(trim(coalesce(p_phone, auth.jwt() #>> '{user_metadata,phone}')), '');
  v_avatar text := nullif(trim(coalesce(p_avatar_url, auth.jwt() #>> '{user_metadata,avatar_url}', auth.jwt() #>> '{user_metadata,picture}')), '');
  v_existing_roles public.app_role[];
  v_profile_role text;
  v_is_new_user boolean := false;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  SELECT array_agg(ur.role ORDER BY
    CASE ur.role WHEN 'owner' THEN 1 WHEN 'admin' THEN 2 WHEN 'manager' THEN 3
                 WHEN 'dispatcher' THEN 4 WHEN 'finance' THEN 5 WHEN 'staff' THEN 6
                 WHEN 'technician' THEN 7 WHEN 'vendor' THEN 8 WHEN 'customer' THEN 9
                 ELSE 99 END)
    INTO v_existing_roles
    FROM public.user_roles ur
   WHERE ur.user_id = v_user_id;

  IF v_existing_roles IS NULL OR cardinality(v_existing_roles) = 0 THEN
    INSERT INTO public.user_roles (user_id, role, assigned_at)
    VALUES (v_user_id, 'customer'::public.app_role, now())
    ON CONFLICT (user_id, role) DO NOTHING;

    v_is_new_user := true;

    SELECT array_agg(ur.role ORDER BY
      CASE ur.role WHEN 'owner' THEN 1 WHEN 'admin' THEN 2 WHEN 'manager' THEN 3
                   WHEN 'dispatcher' THEN 4 WHEN 'finance' THEN 5 WHEN 'staff' THEN 6
                   WHEN 'technician' THEN 7 WHEN 'vendor' THEN 8 WHEN 'customer' THEN 9
                   ELSE 99 END)
      INTO v_existing_roles
      FROM public.user_roles ur
     WHERE ur.user_id = v_user_id;
  END IF;

  v_profile_role := coalesce((v_existing_roles[1])::text, 'customer');

  -- Do NOT write to full_name — it's a generated column.
  INSERT INTO public.profiles (id, email, name, phone, avatar_url, role, created_at, updated_at)
  VALUES (
    v_user_id, v_email,
    coalesce(v_name, v_email, 'UberFix User'),
    v_phone, v_avatar, v_profile_role, now(), now()
  )
  ON CONFLICT (id) DO UPDATE SET
    name       = coalesce(EXCLUDED.name, public.profiles.name),
    phone      = coalesce(EXCLUDED.phone, public.profiles.phone),
    avatar_url = coalesce(EXCLUDED.avatar_url, public.profiles.avatar_url),
    updated_at = now();

  RETURN QUERY
  SELECT coalesce(v_existing_roles, ARRAY['customer'::public.app_role]),
         coalesce(v_existing_roles[1], 'customer'::public.app_role),
         v_is_new_user;
END;
$function$;
