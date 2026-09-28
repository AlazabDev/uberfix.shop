-- 1) عناوين بريد إضافية للمستخدم
CREATE TABLE public.user_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  email text NOT NULL,
  label text,
  is_primary boolean NOT NULL DEFAULT false,
  is_verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_emails_email_format CHECK (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_emails TO authenticated;
GRANT ALL ON public.user_emails TO service_role;

ALTER TABLE public.user_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_emails_select_own_or_admin"
ON public.user_emails FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'owner'::app_role)
);

CREATE POLICY "user_emails_insert_own"
ON public.user_emails FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_emails_update_own"
ON public.user_emails FOR UPDATE TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "user_emails_delete_own"
ON public.user_emails FOR DELETE TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE UNIQUE INDEX user_emails_user_email_uniq
  ON public.user_emails (user_id, lower(email));
CREATE UNIQUE INDEX user_emails_one_primary_per_user
  ON public.user_emails (user_id) WHERE is_primary;
CREATE INDEX user_emails_user_idx ON public.user_emails (user_id);

CREATE TRIGGER trg_user_emails_updated_at
BEFORE UPDATE ON public.user_emails
FOR EACH ROW EXECUTE FUNCTION public.fn_touch_updated_at();

-- تطبيع البريد إلى حروف صغيرة
CREATE OR REPLACE FUNCTION public.fn_user_emails_normalize()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.email := lower(trim(NEW.email));
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_user_emails_normalize
BEFORE INSERT OR UPDATE ON public.user_emails
FOR EACH ROW EXECUTE FUNCTION public.fn_user_emails_normalize();

-- 2) ربط العقارات بالشركة
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS properties_company_idx ON public.properties (company_id);

CREATE OR REPLACE FUNCTION public.fn_properties_set_company()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.company_id IS NULL THEN
    SELECT p.company_id INTO NEW.company_id
    FROM public.profiles p
    WHERE p.auth_user_id = COALESCE(NEW.created_by, auth.uid())
       OR p.id = COALESCE(NEW.created_by, auth.uid())
    LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_properties_set_company
BEFORE INSERT ON public.properties
FOR EACH ROW EXECUTE FUNCTION public.fn_properties_set_company();

CREATE POLICY "properties_select_same_company"
ON public.properties FOR SELECT TO authenticated
USING (
  company_id IS NOT NULL
  AND company_id = public.get_current_user_company_id()
);

CREATE POLICY "properties_update_same_company"
ON public.properties FOR UPDATE TO authenticated
USING (
  company_id IS NOT NULL
  AND company_id = public.get_current_user_company_id()
)
WITH CHECK (
  company_id IS NOT NULL
  AND company_id = public.get_current_user_company_id()
);