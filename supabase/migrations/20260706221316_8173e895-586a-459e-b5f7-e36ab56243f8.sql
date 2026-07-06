
DROP POLICY IF EXISTS ur_insert ON public.user_roles;
DROP POLICY IF EXISTS ur_update ON public.user_roles;
DROP POLICY IF EXISTS ur_delete ON public.user_roles;

-- Only owner can assign/modify elevated roles (owner, admin, finance, accounting, warehouse, dispatcher).
-- Admins may only assign non-elevated operational roles.
CREATE POLICY ur_insert ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'owner'::app_role)
    OR (
      has_role(auth.uid(), 'admin'::app_role)
      AND role NOT IN ('owner'::app_role, 'admin'::app_role, 'finance'::app_role, 'accounting'::app_role, 'warehouse'::app_role, 'dispatcher'::app_role)
    )
  );

CREATE POLICY ur_update ON public.user_roles FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (
    has_role(auth.uid(), 'owner'::app_role)
    OR (
      has_role(auth.uid(), 'admin'::app_role)
      AND role NOT IN ('owner'::app_role, 'admin'::app_role, 'finance'::app_role, 'accounting'::app_role, 'warehouse'::app_role, 'dispatcher'::app_role)
    )
  );

CREATE POLICY ur_delete ON public.user_roles FOR DELETE TO authenticated
  USING (
    has_role(auth.uid(), 'owner'::app_role)
    OR (
      has_role(auth.uid(), 'admin'::app_role)
      AND role NOT IN ('owner'::app_role, 'admin'::app_role, 'finance'::app_role, 'accounting'::app_role, 'warehouse'::app_role, 'dispatcher'::app_role)
    )
  );
