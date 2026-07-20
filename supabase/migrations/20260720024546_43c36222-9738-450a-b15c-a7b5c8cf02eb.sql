DROP POLICY IF EXISTS contracts_insert ON public.maintenance_contracts;
DROP POLICY IF EXISTS contracts_update ON public.maintenance_contracts;

CREATE POLICY contracts_insert ON public.maintenance_contracts
FOR INSERT TO authenticated
WITH CHECK (
  company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  AND (
    public.has_role(auth.uid(), 'owner')
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'manager')
    OR public.has_role(auth.uid(), 'staff')
  )
);

CREATE POLICY contracts_update ON public.maintenance_contracts
FOR UPDATE TO authenticated
USING (
  company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  AND (
    public.has_role(auth.uid(), 'owner')
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'manager')
    OR public.has_role(auth.uid(), 'staff')
  )
)
WITH CHECK (
  company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  AND (
    public.has_role(auth.uid(), 'owner')
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'manager')
    OR public.has_role(auth.uid(), 'staff')
  )
);