
-- RPC functions for managing API keys securely
-- Store only hashes in DB; raw key returned ONCE on create/rotate

-- Helper: generate api key (32 bytes random, base64url-ish)
CREATE OR REPLACE FUNCTION public.fn_generate_api_key()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_key text;
BEGIN
  -- 32 random bytes -> base64, then make url-safe
  v_key := translate(encode(extensions.gen_random_bytes(32), 'base64'), '+/=', '-_');
  RETURN 'uf_' || v_key;
END;
$$;

-- Create API consumer (owner/admin only). Returns the raw key ONCE.
CREATE OR REPLACE FUNCTION public.fn_create_api_consumer(
  p_name text,
  p_channel text DEFAULT 'bot',
  p_rate_limit integer DEFAULT 60,
  p_allowed_origins text[] DEFAULT NULL,
  p_company_id uuid DEFAULT NULL,
  p_branch_id uuid DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_raw_key text;
  v_hash text;
  v_prefix text;
  v_id uuid;
BEGIN
  IF NOT (has_role(auth.uid(), 'admin'::app_role)
       OR has_role(auth.uid(), 'owner'::app_role)
       OR is_owner_email()) THEN
    RAISE EXCEPTION 'Access denied: only owners/admins can create API keys';
  END IF;

  IF p_name IS NULL OR length(trim(p_name)) < 2 THEN
    RAISE EXCEPTION 'Invalid name';
  END IF;

  v_raw_key := fn_generate_api_key();
  v_hash := encode(extensions.digest(v_raw_key, 'sha256'), 'hex');
  v_prefix := substring(v_raw_key from 1 for 10);

  INSERT INTO public.api_consumers (
    name, api_key, api_key_hash, api_key_prefix, channel,
    is_active, rate_limit_per_minute, allowed_origins,
    company_id, branch_id, metadata, created_by, last_rotated_at
  ) VALUES (
    p_name, v_hash, v_hash, v_prefix, COALESCE(p_channel,'bot'),
    true, COALESCE(p_rate_limit,60), p_allowed_origins,
    p_company_id, p_branch_id, COALESCE(p_metadata,'{}'::jsonb),
    auth.uid(), now()
  )
  RETURNING id INTO v_id;

  INSERT INTO public.audit_logs (user_id, action, table_name, record_id, new_values)
  VALUES (auth.uid(), 'API_KEY_CREATED', 'api_consumers', v_id,
          jsonb_build_object('name', p_name, 'channel', p_channel, 'prefix', v_prefix));

  RETURN jsonb_build_object(
    'id', v_id,
    'api_key', v_raw_key,
    'prefix', v_prefix,
    'message', 'احفظ المفتاح الآن. لن يظهر مرة أخرى.'
  );
END;
$$;

-- Rotate API key. Returns new raw key once.
CREATE OR REPLACE FUNCTION public.fn_rotate_api_consumer(p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_raw_key text;
  v_hash text;
  v_prefix text;
BEGIN
  IF NOT (has_role(auth.uid(), 'admin'::app_role)
       OR has_role(auth.uid(), 'owner'::app_role)
       OR is_owner_email()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  v_raw_key := fn_generate_api_key();
  v_hash := encode(extensions.digest(v_raw_key, 'sha256'), 'hex');
  v_prefix := substring(v_raw_key from 1 for 10);

  UPDATE public.api_consumers
  SET api_key = v_hash,
      api_key_hash = v_hash,
      api_key_prefix = v_prefix,
      last_rotated_at = now(),
      updated_at = now()
  WHERE id = p_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Consumer not found';
  END IF;

  INSERT INTO public.audit_logs (user_id, action, table_name, record_id, new_values)
  VALUES (auth.uid(), 'API_KEY_ROTATED', 'api_consumers', p_id,
          jsonb_build_object('prefix', v_prefix));

  RETURN jsonb_build_object('id', p_id, 'api_key', v_raw_key, 'prefix', v_prefix);
END;
$$;

-- Toggle active
CREATE OR REPLACE FUNCTION public.fn_toggle_api_consumer(p_id uuid, p_active boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (has_role(auth.uid(), 'admin'::app_role)
       OR has_role(auth.uid(), 'owner'::app_role)
       OR is_owner_email()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  UPDATE public.api_consumers
  SET is_active = p_active, updated_at = now()
  WHERE id = p_id;

  INSERT INTO public.audit_logs (user_id, action, table_name, record_id, new_values)
  VALUES (auth.uid(),
          CASE WHEN p_active THEN 'API_KEY_ENABLED' ELSE 'API_KEY_DISABLED' END,
          'api_consumers', p_id, jsonb_build_object('is_active', p_active));
END;
$$;

-- Revoke (delete) consumer
CREATE OR REPLACE FUNCTION public.fn_revoke_api_consumer(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (has_role(auth.uid(), 'admin'::app_role)
       OR has_role(auth.uid(), 'owner'::app_role)
       OR is_owner_email()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  INSERT INTO public.audit_logs (user_id, action, table_name, record_id, new_values)
  VALUES (auth.uid(), 'API_KEY_REVOKED', 'api_consumers', p_id, '{}'::jsonb);

  DELETE FROM public.api_consumers WHERE id = p_id;
END;
$$;

-- Update metadata (name, rate limit, origins, channel)
CREATE OR REPLACE FUNCTION public.fn_update_api_consumer(
  p_id uuid,
  p_name text DEFAULT NULL,
  p_channel text DEFAULT NULL,
  p_rate_limit integer DEFAULT NULL,
  p_allowed_origins text[] DEFAULT NULL,
  p_metadata jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (has_role(auth.uid(), 'admin'::app_role)
       OR has_role(auth.uid(), 'owner'::app_role)
       OR is_owner_email()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  UPDATE public.api_consumers
  SET name = COALESCE(p_name, name),
      channel = COALESCE(p_channel, channel),
      rate_limit_per_minute = COALESCE(p_rate_limit, rate_limit_per_minute),
      allowed_origins = COALESCE(p_allowed_origins, allowed_origins),
      metadata = COALESCE(p_metadata, metadata),
      updated_at = now()
  WHERE id = p_id;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_generate_api_key() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_create_api_consumer(text,text,integer,text[],uuid,uuid,jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_rotate_api_consumer(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_toggle_api_consumer(uuid,boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_revoke_api_consumer(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_update_api_consumer(uuid,text,text,integer,text[],jsonb) TO authenticated;
