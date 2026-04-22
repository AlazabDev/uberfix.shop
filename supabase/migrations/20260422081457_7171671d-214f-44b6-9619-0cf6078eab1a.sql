-- 0) Schema
ALTER TABLE public.authorized_owners
  ADD COLUMN IF NOT EXISTS is_pattern boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_pattern text;

ALTER TABLE public.authorized_owners ALTER COLUMN email DROP NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'authorized_owners_email_or_pattern_chk') THEN
    ALTER TABLE public.authorized_owners
      ADD CONSTRAINT authorized_owners_email_or_pattern_chk
      CHECK (
        (is_pattern = false AND email IS NOT NULL) OR
        (is_pattern = true  AND email_pattern IS NOT NULL)
      );
  END IF;
END$$;

CREATE UNIQUE INDEX IF NOT EXISTS authorized_owners_pattern_uidx
  ON public.authorized_owners (lower(email_pattern))
  WHERE email_pattern IS NOT NULL;

-- 1) Text overload
CREATE OR REPLACE FUNCTION public.is_authorized_owner(user_email text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.authorized_owners ao
    WHERE ao.is_active = true AND user_email IS NOT NULL
      AND (
        (ao.is_pattern = false AND lower(ao.email) = lower(user_email))
        OR (ao.is_pattern = true AND lower(user_email) LIKE lower(ao.email_pattern))
      )
  )
$$;

-- 2) New owners
INSERT INTO public.authorized_owners (email, is_active, is_pattern) VALUES
  ('ceo@alazab.com',     true, false),
  ('admin@alazab.com',   true, false),
  ('mohamed@alazab.com', true, false),
  ('magdy@alazab.com',   true, false),
  ('uf@alazab.com',      true, false),
  ('devops@alazab.com',  true, false),
  ('manager@alazab.com', true, false),
  ('api@alazab.com',     true, false),
  ('erp@alazab.com',     true, false),
  ('db@alazab.com',      true, false)
ON CONFLICT (email) DO UPDATE SET is_active = true;

-- 3) Wildcard
INSERT INTO public.authorized_owners (email, email_pattern, is_pattern, is_active)
SELECT NULL, '%@uberfix.shop', true, true
WHERE NOT EXISTS (
  SELECT 1 FROM public.authorized_owners
  WHERE is_pattern = true AND lower(email_pattern) = lower('%@uberfix.shop')
);

-- 4) UUID overload + is_owner_email + sync
CREATE OR REPLACE FUNCTION public.is_authorized_owner(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.authorized_owners ao
    JOIN auth.users u ON (
      (ao.is_pattern = false AND lower(u.email) = lower(ao.email))
      OR (ao.is_pattern = true AND lower(u.email) LIKE lower(ao.email_pattern))
    )
    WHERE u.id = _user_id AND ao.is_active = true
  )
$$;

CREATE OR REPLACE FUNCTION public.is_owner_email()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.authorized_owners ao
    JOIN auth.users u ON (
      (ao.is_pattern = false AND lower(u.email) = lower(ao.email))
      OR (ao.is_pattern = true AND lower(u.email) LIKE lower(ao.email_pattern))
    )
    WHERE u.id = auth.uid() AND ao.is_active = true
  )
$$;

CREATE OR REPLACE FUNCTION public.sync_owner_role()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.authorized_owners ao
    WHERE ao.is_active = true AND NEW.email IS NOT NULL
      AND (
        (ao.is_pattern = false AND lower(ao.email) = lower(NEW.email))
        OR (ao.is_pattern = true AND lower(NEW.email) LIKE lower(ao.email_pattern))
      )
  ) THEN
    NEW.role := 'owner';
  END IF;
  RETURN NEW;
END;
$$;

-- 5) Promote existing matching users (bypass ALL non-replica triggers)
SET session_replication_role = replica;

UPDATE public.profiles p
SET role = 'owner'
FROM auth.users u
WHERE p.id = u.id AND public.is_authorized_owner(u.email);

INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'owner'::app_role
FROM auth.users u
WHERE public.is_authorized_owner(u.email)
ON CONFLICT (user_id, role) DO NOTHING;

SET session_replication_role = origin;