
DROP POLICY IF EXISTS module_permissions_select_authenticated ON public.module_permissions;

CREATE POLICY module_permissions_select_admin_owner
ON public.module_permissions
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'owner'::app_role)
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

DROP POLICY IF EXISTS "Authenticated can view role_permissions" ON public.role_permissions;

CREATE POLICY role_permissions_select_admin_owner
ON public.role_permissions
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'owner'::app_role)
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY role_permissions_select_own_roles
ON public.role_permissions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role::text = role_permissions.role
  )
);

DROP POLICY IF EXISTS doc_reviewers_select_by_hash ON public.document_reviewers;
DROP POLICY IF EXISTS doc_reviewers_update_by_hash ON public.document_reviewers;

CREATE POLICY companies_owner_admin_insert
ON public.companies
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'owner'::app_role)
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY companies_own_update
ON public.companies
FOR UPDATE
TO authenticated
USING (
  id = public.get_current_user_company_id()
  AND (
    public.has_role(auth.uid(), 'owner'::app_role)
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'manager'::app_role)
  )
)
WITH CHECK (
  id = public.get_current_user_company_id()
);

CREATE POLICY companies_owner_admin_delete
ON public.companies
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'owner'::app_role)
  OR public.has_role(auth.uid(), 'admin'::app_role)
);
