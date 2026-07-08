
-- 1) Random default prices 300-500 EGP for unpriced services
UPDATE public.services
SET base_price = floor(300 + random() * 201)::numeric
WHERE base_price IS NULL OR base_price = 0;

UPDATE public.service_items
SET base_price = floor(300 + random() * 201)::numeric
WHERE base_price IS NULL OR base_price = 0;

UPDATE public.rate_items
SET normal_hourly = floor(300 + random() * 201)::numeric
WHERE normal_hourly IS NULL OR normal_hourly = 0;

-- 2) Profiles placeholder support
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_placeholder boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS auth_user_id uuid;

CREATE INDEX IF NOT EXISTS profiles_phone_idx ON public.profiles (phone);
CREATE INDEX IF NOT EXISTS profiles_auth_user_id_idx ON public.profiles (auth_user_id);

-- 3) Client serial sequence + helper
CREATE SEQUENCE IF NOT EXISTS public.client_placeholder_seq START 1;

CREATE OR REPLACE FUNCTION public.next_client_placeholder_name()
RETURNS text
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 'client-' || lpad(nextval('public.client_placeholder_seq')::text, 3, '0');
$$;

GRANT EXECUTE ON FUNCTION public.next_client_placeholder_name() TO service_role;

-- 4) Helper: normalize an Egyptian phone number to E.164 (+20...)
CREATE OR REPLACE FUNCTION public.normalize_eg_phone(p text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  d text;
BEGIN
  IF p IS NULL THEN RETURN NULL; END IF;
  d := regexp_replace(p, '[^0-9]', '', 'g');
  IF d = '' THEN RETURN NULL; END IF;
  IF left(d, 4) = '0020' THEN d := substr(d, 5); END IF;
  IF left(d, 2) = '20' THEN d := substr(d, 3); END IF;
  IF left(d, 1) = '0' THEN d := substr(d, 2); END IF;
  RETURN '+20' || d;
END;
$$;

GRANT EXECUTE ON FUNCTION public.normalize_eg_phone(text) TO anon, authenticated, service_role;
