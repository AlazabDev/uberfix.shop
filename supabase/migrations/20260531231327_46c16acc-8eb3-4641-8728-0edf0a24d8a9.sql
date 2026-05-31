-- =========================================================
-- MODULE #10 — CUSTOMERS (Spine Methodology)
-- =========================================================

-- 1) Sequence + table
CREATE SEQUENCE IF NOT EXISTS public.customers_seq START 1;

CREATE TABLE IF NOT EXISTS public.customers (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_code text UNIQUE,
  phone        text UNIQUE NOT NULL,
  name         text,
  email        text,
  whatsapp     text,
  notes        text,
  is_active    boolean NOT NULL DEFAULT true,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at  timestamptz NOT NULL DEFAULT now(),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customers_select_staff" ON public.customers;
CREATE POLICY "customers_select_staff" ON public.customers
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'manager')
    OR public.has_role(auth.uid(), 'staff')
    OR public.has_role(auth.uid(), 'accounting')
    OR public.has_role(auth.uid(), 'finance')
    OR public.has_role(auth.uid(), 'dispatcher')
    OR public.has_role(auth.uid(), 'owner')
  );

DROP POLICY IF EXISTS "customers_modify_admin" ON public.customers;
CREATE POLICY "customers_modify_admin" ON public.customers
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

-- 2) Phone normalization helper (E.164-ish for Egypt)
CREATE OR REPLACE FUNCTION public.normalize_phone(_phone text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE p text;
BEGIN
  IF _phone IS NULL THEN RETURN NULL; END IF;
  p := regexp_replace(_phone, '[^0-9+]', '', 'g');
  IF p = '' THEN RETURN NULL; END IF;
  IF left(p,1) <> '+' THEN
    IF left(p,2) = '00' THEN p := '+' || substring(p from 3);
    ELSIF left(p,2) = '20' THEN p := '+' || p;
    ELSIF left(p,1) = '0' THEN p := '+20' || substring(p from 2);
    ELSE p := '+20' || p;
    END IF;
  END IF;
  RETURN p;
END;
$$;

-- 3) Customer code generator + trigger
CREATE OR REPLACE FUNCTION public.set_customer_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.customer_code IS NULL OR NEW.customer_code = '' THEN
    NEW.customer_code := 'UF-CUS-' || lpad(nextval('public.customers_seq')::text, 6, '0');
  END IF;
  NEW.phone := public.normalize_phone(NEW.phone);
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_customers_set_code ON public.customers;
CREATE TRIGGER trg_customers_set_code
BEFORE INSERT OR UPDATE ON public.customers
FOR EACH ROW EXECUTE FUNCTION public.set_customer_code();

-- 4) Link columns on requests + invoices
ALTER TABLE public.maintenance_requests
  ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL;

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_mr_customer_id ON public.maintenance_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_inv_customer_id ON public.invoices(customer_id);

-- 5) Upsert function (used by trigger + backfill)
CREATE OR REPLACE FUNCTION public.upsert_customer_from_request(
  _phone text, _name text, _email text
) RETURNS uuid
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  _p text := public.normalize_phone(_phone);
  _cid uuid;
BEGIN
  IF _p IS NULL THEN RETURN NULL; END IF;

  INSERT INTO public.customers (phone, name, email, whatsapp, last_seen_at)
  VALUES (_p, NULLIF(_name,''), NULLIF(_email,''), _p, now())
  ON CONFLICT (phone) DO UPDATE
    SET name = COALESCE(NULLIF(EXCLUDED.name,''), public.customers.name),
        email = COALESCE(NULLIF(EXCLUDED.email,''), public.customers.email),
        last_seen_at = now(),
        updated_at = now()
  RETURNING id INTO _cid;

  RETURN _cid;
END;
$$;

-- 6) Trigger on maintenance_requests to auto-link customer
CREATE OR REPLACE FUNCTION public.mr_link_customer()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE _cid uuid;
BEGIN
  IF NEW.client_phone IS NOT NULL AND NEW.client_phone <> '' THEN
    _cid := public.upsert_customer_from_request(NEW.client_phone, NEW.client_name, NEW.client_email);
    NEW.customer_id := COALESCE(NEW.customer_id, _cid);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mr_link_customer ON public.maintenance_requests;
CREATE TRIGGER trg_mr_link_customer
BEFORE INSERT OR UPDATE OF client_phone, client_name, client_email
ON public.maintenance_requests
FOR EACH ROW EXECUTE FUNCTION public.mr_link_customer();

-- 7) Trigger on invoices to mirror customer_id from request
CREATE OR REPLACE FUNCTION public.inv_link_customer()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE _cid uuid;
BEGIN
  IF NEW.customer_id IS NULL AND NEW.request_id IS NOT NULL THEN
    SELECT customer_id INTO _cid FROM public.maintenance_requests WHERE id = NEW.request_id;
    NEW.customer_id := _cid;
  END IF;
  IF NEW.customer_id IS NULL AND NEW.customer_phone IS NOT NULL THEN
    NEW.customer_id := public.upsert_customer_from_request(NEW.customer_phone, NEW.customer_name, NEW.customer_email);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_inv_link_customer ON public.invoices;
CREATE TRIGGER trg_inv_link_customer
BEFORE INSERT OR UPDATE OF request_id, customer_phone
ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.inv_link_customer();

-- 8) Backfill existing data
INSERT INTO public.customers (phone, name, email, whatsapp, first_seen_at, last_seen_at)
SELECT
  public.normalize_phone(client_phone) AS phone,
  MAX(client_name) AS name,
  MAX(client_email) AS email,
  public.normalize_phone(client_phone) AS whatsapp,
  MIN(created_at) AS first_seen_at,
  MAX(created_at) AS last_seen_at
FROM public.maintenance_requests
WHERE client_phone IS NOT NULL AND client_phone <> ''
GROUP BY public.normalize_phone(client_phone)
ON CONFLICT (phone) DO UPDATE
  SET name = COALESCE(public.customers.name, EXCLUDED.name),
      email = COALESCE(public.customers.email, EXCLUDED.email),
      last_seen_at = GREATEST(public.customers.last_seen_at, EXCLUDED.last_seen_at);

-- Link requests
UPDATE public.maintenance_requests mr
SET customer_id = c.id
FROM public.customers c
WHERE mr.customer_id IS NULL
  AND public.normalize_phone(mr.client_phone) = c.phone;

-- Link invoices via request
UPDATE public.invoices i
SET customer_id = mr.customer_id
FROM public.maintenance_requests mr
WHERE i.customer_id IS NULL
  AND i.request_id = mr.id
  AND mr.customer_id IS NOT NULL;

-- Link orphan invoices via phone
UPDATE public.invoices i
SET customer_id = c.id
FROM public.customers c
WHERE i.customer_id IS NULL
  AND public.normalize_phone(i.customer_phone) = c.phone;

-- 9) Dashboard view
CREATE OR REPLACE VIEW public.v_customers_dashboard
WITH (security_invoker = true) AS
SELECT
  c.id,
  c.customer_code,
  c.name,
  c.phone,
  c.email,
  c.is_active,
  c.first_seen_at,
  c.last_seen_at,
  COALESCE(r.requests_count, 0)            AS requests_count,
  COALESCE(r.last_request_at, c.last_seen_at) AS last_request_at,
  COALESCE(r.avg_rating, 0)::numeric(3,2)  AS avg_rating,
  COALESCE(inv.invoices_count, 0)          AS invoices_count,
  COALESCE(inv.total_billed, 0)::numeric(14,2) AS total_billed,
  COALESCE(inv.total_paid, 0)::numeric(14,2)   AS total_paid,
  COALESCE(inv.total_outstanding, 0)::numeric(14,2) AS total_outstanding
FROM public.customers c
LEFT JOIN (
  SELECT customer_id,
         COUNT(*) AS requests_count,
         MAX(created_at) AS last_request_at,
         AVG(NULLIF(rating,0)) AS avg_rating
  FROM public.maintenance_requests
  WHERE customer_id IS NOT NULL
  GROUP BY customer_id
) r ON r.customer_id = c.id
LEFT JOIN (
  SELECT customer_id,
         COUNT(*) AS invoices_count,
         SUM(COALESCE(total_amount, 0)) AS total_billed,
         SUM(CASE WHEN status = 'paid' THEN COALESCE(total_amount,0) ELSE 0 END) AS total_paid,
         SUM(CASE WHEN status <> 'paid' THEN COALESCE(total_amount,0) ELSE 0 END) AS total_outstanding
  FROM public.invoices
  WHERE customer_id IS NOT NULL
  GROUP BY customer_id
) inv ON inv.customer_id = c.id;

GRANT SELECT ON public.v_customers_dashboard TO authenticated;
