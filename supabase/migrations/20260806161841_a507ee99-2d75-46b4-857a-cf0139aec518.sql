DROP POLICY IF EXISTS invoice_items_select_authenticated ON public.invoice_items;

CREATE POLICY invoice_items_select_authenticated
ON public.invoice_items
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.invoices i
    WHERE i.id = invoice_items.invoice_id
      AND (
        i.created_by = auth.uid()
        OR public.is_staff(auth.uid())
        OR public.has_role(auth.uid(), 'owner'::app_role)
      )
  )
);

REVOKE ALL ON public.invoice_items FROM anon;