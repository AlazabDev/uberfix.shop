
-- 1) Documents: remove manager-wide SELECT exposure
DROP POLICY IF EXISTS "documents_select_restricted" ON public.documents;
-- documents_select_strict (creator + owner + admin) remains in place

-- 2) project_images: remove public/anon read
DROP POLICY IF EXISTS "Public read project_images" ON public.project_images;

CREATE POLICY "Authenticated read project_images"
ON public.project_images
FOR SELECT
TO authenticated
USING (true);

-- 3) user_roles: drop self-insert customer policy, harden onboarding via SECURITY DEFINER
DROP POLICY IF EXISTS "users_insert_own_customer_role" ON public.user_roles;

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
    CASE ur.role
      WHEN 'owner' THEN 1
      WHEN 'admin' THEN 2
      WHEN 'manager' THEN 3
      WHEN 'dispatcher' THEN 4
      WHEN 'finance' THEN 5
      WHEN 'staff' THEN 6
      WHEN 'technician' THEN 7
      WHEN 'vendor' THEN 8
      WHEN 'customer' THEN 9
      ELSE 99
    END)
  INTO v_existing_roles
  FROM public.user_roles ur
  WHERE ur.user_id = v_user_id;

  IF v_existing_roles IS NULL OR cardinality(v_existing_roles) = 0 THEN
    -- Server-side assignment of default 'customer' role (cannot be escalated by client)
    INSERT INTO public.user_roles (user_id, role, assigned_at)
    VALUES (v_user_id, 'customer'::public.app_role, now())
    ON CONFLICT (user_id, role) DO NOTHING;

    v_is_new_user := true;

    SELECT array_agg(ur.role ORDER BY
      CASE ur.role
        WHEN 'owner' THEN 1
        WHEN 'admin' THEN 2
        WHEN 'manager' THEN 3
        WHEN 'dispatcher' THEN 4
        WHEN 'finance' THEN 5
        WHEN 'staff' THEN 6
        WHEN 'technician' THEN 7
        WHEN 'vendor' THEN 8
        WHEN 'customer' THEN 9
        ELSE 99
      END)
    INTO v_existing_roles
    FROM public.user_roles ur
    WHERE ur.user_id = v_user_id;
  END IF;

  v_profile_role := coalesce((v_existing_roles[1])::text, 'customer');

  INSERT INTO public.profiles (id, email, name, full_name, phone, avatar_url, role, created_at, updated_at)
  VALUES (
    v_user_id,
    v_email,
    coalesce(v_name, v_email, 'UberFix User'),
    v_name,
    v_phone,
    v_avatar,
    v_profile_role,
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    name = coalesce(EXCLUDED.name, public.profiles.name),
    full_name = coalesce(EXCLUDED.full_name, public.profiles.full_name),
    phone = coalesce(EXCLUDED.phone, public.profiles.phone),
    avatar_url = coalesce(EXCLUDED.avatar_url, public.profiles.avatar_url),
    updated_at = now();

  RETURN QUERY
  SELECT
    coalesce(v_existing_roles, ARRAY['customer'::public.app_role]),
    coalesce(v_existing_roles[1], 'customer'::public.app_role),
    v_is_new_user;
END;
$function$;

REVOKE ALL ON FUNCTION public.ensure_current_user_onboarding(app_role, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_current_user_onboarding(app_role, text, text, text) TO authenticated, service_role;
