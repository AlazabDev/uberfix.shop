CREATE OR REPLACE FUNCTION public.generate_request_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_year TEXT;
  v_month TEXT;
  v_seq INT;
BEGIN
  IF NEW.request_number IS NULL THEN
    v_year := to_char(NOW(), 'YY');
    v_month := to_char(NOW(), 'MM');
    v_seq := nextval('public.maintenance_request_seq');
    NEW.request_number := 'AZ-UF-' || v_year || '-' || v_month || '-' || LPAD(v_seq::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$function$;