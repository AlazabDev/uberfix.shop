
-- Cleanup old auth infrastructure
DROP TABLE IF EXISTS public.otp_verifications CASCADE;
DROP TABLE IF EXISTS public.facebook_users CASCADE;

-- Drop any auto-register triggers/functions that caused issues
DROP FUNCTION IF EXISTS public.auto_register_customer() CASCADE;
DROP FUNCTION IF EXISTS public.next_client_placeholder_name() CASCADE;
DROP SEQUENCE IF EXISTS public.client_placeholder_seq CASCADE;

-- WhatsApp OTP table (server-side hash storage only)
CREATE TABLE IF NOT EXISTS public.whatsapp_otp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  attempts INT NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_otp_phone ON public.whatsapp_otp(phone, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_otp_expires ON public.whatsapp_otp(expires_at);

-- No client-facing access; only service_role via Edge Functions.
GRANT ALL ON public.whatsapp_otp TO service_role;

ALTER TABLE public.whatsapp_otp ENABLE ROW LEVEL SECURITY;

CREATE POLICY "whatsapp_otp_service_role_only"
ON public.whatsapp_otp
FOR ALL
TO service_role
USING (true) WITH CHECK (true);

-- Clean handle_new_user trigger: creates profile + assigns default 'customer' role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create profile row if not exists
  INSERT INTO public.profiles (id, email, phone, full_name, avatar_url, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.phone,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(COALESCE(NEW.email, NEW.phone, ''), '@', 1)
    ),
    NEW.raw_user_meta_data->>'avatar_url',
    now(),
    now()
  )
  ON CONFLICT (id) DO NOTHING;

  -- Default role: customer
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'customer')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Ensure trigger exists on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
