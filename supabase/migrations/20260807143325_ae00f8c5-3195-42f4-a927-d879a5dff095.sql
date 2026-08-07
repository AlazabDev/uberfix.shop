DROP VIEW IF EXISTS public.invoices_safe;

CREATE VIEW public.invoices_safe
WITH (security_invoker = on) AS
SELECT id,
    invoice_number,
    customer_name,
    customer_email,
    customer_phone,
    amount,
    currency,
    due_date,
    issue_date,
    status,
    payment_method,
    notes,
    created_by,
    created_at,
    updated_at,
    version,
    is_locked,
    last_modified_by,
    payment_reference,
    eta_status,
    eta_uuid,
    eta_long_id,
    eta_submitted_at
FROM public.invoices;

GRANT SELECT ON public.invoices_safe TO authenticated;
GRANT ALL ON public.invoices_safe TO service_role;