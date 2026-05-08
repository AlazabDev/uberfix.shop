
-- =====================================================
-- Module #9: Users, Roles & Permissions — Dashboard Views
-- =====================================================

-- 1) Users Dashboard
CREATE OR REPLACE VIEW public.v_users_dashboard
WITH (security_invoker=true) AS
SELECT
  p.id AS user_id,
  COALESCE(p.full_name, NULLIF(TRIM(CONCAT(p.first_name,' ',p.last_name)),''), p.name, p.email) AS display_name,
  p.email,
  p.phone,
  p.position,
  p.department_id,
  p.avatar_url,
  COALESCE(p.is_deleted, false) AS is_deleted,
  COALESCE(
    (SELECT array_agg(ur.role::text ORDER BY ur.role::text)
       FROM public.user_roles ur WHERE ur.user_id = p.id),
    ARRAY[]::text[]
  ) AS roles,
  (SELECT count(*) FROM public.user_roles ur WHERE ur.user_id = p.id) AS role_count,
  CASE
    WHEN COALESCE(p.is_deleted,false) THEN 'deleted'
    WHEN p.updated_at > now() - interval '30 days' THEN 'active'
    WHEN p.updated_at > now() - interval '90 days' THEN 'idle'
    ELSE 'inactive'
  END AS activity_state,
  p.created_at AS joined_at,
  p.updated_at AS last_updated_at
FROM public.profiles p;

-- 2) User Roles Dashboard
CREATE OR REPLACE VIEW public.v_user_roles_dashboard
WITH (security_invoker=true) AS
SELECT
  ur.id,
  ur.user_id,
  COALESCE(p.full_name, p.name, p.email) AS user_name,
  p.email AS user_email,
  ur.role::text AS role,
  ur.assigned_at,
  ur.assigned_by,
  COALESCE(ap.full_name, ap.name, ap.email) AS assigned_by_name
FROM public.user_roles ur
LEFT JOIN public.profiles p  ON p.id  = ur.user_id
LEFT JOIN public.profiles ap ON ap.id = ur.assigned_by;

-- 3) Role Permissions Dashboard
CREATE OR REPLACE VIEW public.v_role_permissions_dashboard
WITH (security_invoker=true) AS
SELECT
  role,
  count(*) AS permission_count,
  count(DISTINCT resource) AS resource_count,
  array_agg(DISTINCT resource ORDER BY resource) AS resources,
  array_agg(DISTINCT action   ORDER BY action)   AS actions,
  min(created_at) AS first_granted_at,
  max(created_at) AS last_granted_at
FROM public.role_permissions
GROUP BY role;

-- 4) Module Permissions Dashboard
CREATE OR REPLACE VIEW public.v_module_permissions_dashboard
WITH (security_invoker=true) AS
SELECT
  id,
  role,
  module_key,
  module_name,
  is_enabled,
  CASE WHEN is_enabled THEN 'enabled' ELSE 'disabled' END AS state,
  created_at,
  updated_at
FROM public.module_permissions;
