-- 1) Lock down API gateway logs (remove public read)
DROP POLICY IF EXISTS "Enable read access for all users" ON public.api_gateway_logs;

CREATE POLICY "api_gateway_logs_admin_read"
ON public.api_gateway_logs
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'owner'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'manager'::app_role)
  OR has_role(auth.uid(), 'staff'::app_role)
);

-- 2) Prevent owner privilege escalation by using auth.users email (not profiles.email)
CREATE OR REPLACE FUNCTION public.is_owner_email()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.authorized_owners ao
    JOIN auth.users u ON lower(u.email) = lower(ao.email)
    WHERE u.id = auth.uid()
      AND ao.is_active = true
  )
$$;

CREATE OR REPLACE FUNCTION public.is_authorized_owner(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.authorized_owners ao
    JOIN auth.users u ON lower(u.email) = lower(ao.email)
    WHERE u.id = _user_id
      AND ao.is_active = true
  )
$$;

-- Harden profile updates: user can update own row but cannot spoof profile email
DROP POLICY IF EXISTS "profiles_self_update" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own_secure" ON public.profiles;

CREATE POLICY "profiles_update_own_secure"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  AND (
    (SELECT u.email FROM auth.users u WHERE u.id = auth.uid()) IS NULL
    OR lower(coalesce(email, '')) = lower(coalesce((SELECT u.email FROM auth.users u WHERE u.id = auth.uid()), ''))
  )
);

-- 3) Remove direct anon/authenticated access to sensitive views that contain PII
REVOKE ALL ON TABLE public.vw_maintenance_requests_public FROM anon;
REVOKE ALL ON TABLE public.vw_maintenance_requests_public FROM authenticated;

REVOKE ALL ON TABLE public.technician_profiles_public_safe FROM anon;
REVOKE ALL ON TABLE public.technician_profiles_public_safe FROM authenticated;

-- keep backend/service access for controlled server-side usage
GRANT SELECT ON TABLE public.vw_maintenance_requests_public TO service_role;
GRANT SELECT ON TABLE public.technician_profiles_public_safe TO service_role;