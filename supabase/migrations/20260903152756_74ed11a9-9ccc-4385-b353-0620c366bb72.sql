ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz;

-- Existing real users are considered onboarded (never re-prompt them)
UPDATE public.profiles SET onboarding_completed_at = COALESCE(onboarding_completed_at, created_at, now())
WHERE auth_user_id IS NOT NULL AND onboarding_completed_at IS NULL;

-- Allow the onboarding RPC (and only it) to set profiles.role once
CREATE OR REPLACE FUNCTION public.prevent_profile_role_self_escalation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_catalog' AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;
  IF current_setting('app.onboarding_bypass', true) = '1' THEN RETURN NEW; END IF;
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    IF NOT (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'owner'::app_role)) THEN
      RAISE EXCEPTION 'غير مسموح: لا يمكنك تغيير دورك بنفسك (Privilege Escalation Blocked)';
    END IF;
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.get_my_onboarding_state()
RETURNS TABLE(roles app_role[], primary_role app_role, needs_role_selection boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_catalog' AS $$
DECLARE v_uid uuid := auth.uid(); v_roles app_role[]; v_done timestamptz;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required' USING errcode='28000'; END IF;
  SELECT array_agg(ur.role ORDER BY CASE ur.role WHEN 'owner' THEN 1 WHEN 'admin' THEN 2 WHEN 'manager' THEN 3 WHEN 'dispatcher' THEN 4 WHEN 'finance' THEN 5 WHEN 'staff' THEN 6 WHEN 'technician' THEN 7 WHEN 'vendor' THEN 8 ELSE 9 END)
    INTO v_roles FROM public.user_roles ur WHERE ur.user_id = v_uid;
  SELECT p.onboarding_completed_at INTO v_done FROM public.profiles p WHERE p.auth_user_id = v_uid OR p.id = v_uid ORDER BY (p.auth_user_id = v_uid) DESC LIMIT 1;
  -- privileged users never need selection
  IF v_roles IS NOT NULL AND EXISTS (SELECT 1 FROM unnest(v_roles) r WHERE r NOT IN ('customer','technician','vendor')) THEN
    v_done := COALESCE(v_done, now());
  END IF;
  RETURN QUERY SELECT COALESCE(v_roles, ARRAY[]::app_role[]), COALESCE(v_roles[1], 'customer'::app_role), (v_done IS NULL);
END; $$;

CREATE OR REPLACE FUNCTION public.complete_first_time_onboarding(
  p_requested_role app_role DEFAULT 'customer', p_full_name text DEFAULT NULL, p_phone text DEFAULT NULL, p_avatar_url text DEFAULT NULL)
RETURNS TABLE(roles app_role[], primary_role app_role, is_new_user boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_catalog' AS $$
DECLARE v_uid uuid := auth.uid(); v_state record; v_role app_role; v_roles app_role[];
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Authentication required' USING errcode='28000'; END IF;
  -- make sure profile + base role exist
  PERFORM * FROM public.ensure_current_user_onboarding('customer', p_full_name, p_phone, p_avatar_url);
  SELECT * INTO v_state FROM public.get_my_onboarding_state();

  IF NOT v_state.needs_role_selection THEN
    RETURN QUERY SELECT v_state.roles, v_state.primary_role, false; RETURN;
  END IF;

  v_role := CASE WHEN p_requested_role IN ('customer','technician','vendor') THEN p_requested_role ELSE 'customer' END;

  IF v_role <> 'customer' THEN
    INSERT INTO public.user_roles(user_id, role, assigned_at) VALUES (v_uid, v_role, now()) ON CONFLICT (user_id, role) DO NOTHING;
    DELETE FROM public.user_roles WHERE user_id = v_uid AND role = 'customer';
  END IF;

  PERFORM set_config('app.onboarding_bypass', '1', true);
  UPDATE public.profiles SET role = v_role::text, onboarding_completed_at = now(),
    name = COALESCE(NULLIF(trim(p_full_name),''), name),
    phone = COALESCE(NULLIF(trim(p_phone),''), phone),
    updated_at = now()
  WHERE auth_user_id = v_uid OR id = v_uid;
  PERFORM set_config('app.onboarding_bypass', '0', true);

  SELECT array_agg(ur.role) INTO v_roles FROM public.user_roles ur WHERE ur.user_id = v_uid;
  RETURN QUERY SELECT v_roles, v_role, true;
END; $$;

REVOKE ALL ON FUNCTION public.get_my_onboarding_state() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.complete_first_time_onboarding(app_role, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_onboarding_state() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.complete_first_time_onboarding(app_role, text, text, text) TO authenticated, service_role;