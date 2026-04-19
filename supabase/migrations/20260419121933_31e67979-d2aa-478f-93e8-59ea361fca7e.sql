-- Fix security_invoker on the view so it respects caller's RLS
ALTER VIEW public.api_gateway_logs_masked SET (security_invoker = on);

-- Fix mutable search_path on mask_pii_text
CREATE OR REPLACE FUNCTION public.mask_pii_text(input text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public, pg_catalog
AS $$
  SELECT CASE
    WHEN input IS NULL THEN NULL
    WHEN input ~* '[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}' THEN
      regexp_replace(input, '([A-Z0-9._%+-])[A-Z0-9._%+-]*(@[A-Z0-9.-]+\.[A-Z]{2,})', '\1***\2', 'gi')
    ELSE input
  END;
$$;