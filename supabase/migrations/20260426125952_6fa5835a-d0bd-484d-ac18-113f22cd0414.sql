-- Extended RPCs for API Gateway: scopes, auth_type, storage_target, client_secret, webhook_secret

-- 1) Generate a client_secret in the OAuth2 sense (returned plaintext once, hash stored)
CREATE OR REPLACE FUNCTION public.fn_issue_client_secret(p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_secret text;
  v_hash text;
BEGIN
  IF NOT (has_role(auth.uid(), 'admin'::app_role)
       OR has_role(auth.uid(), 'owner'::app_role)
       OR is_owner_email()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  v_secret := 'cs_' || translate(encode(extensions.gen_random_bytes(32), 'base64'), '+/=', '-_');
  v_hash := encode(extensions.digest(v_secret, 'sha256'), 'hex');

  UPDATE public.api_consumers
  SET client_secret_hash = v_hash,
      last_rotated_at = now(),
      updated_at = now()
  WHERE id = p_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Consumer not found';
  END IF;

  INSERT INTO public.audit_logs (user_id, action, table_name, record_id, new_values)
  VALUES (auth.uid(), 'CLIENT_SECRET_ROTATED', 'api_consumers', p_id,
          jsonb_build_object('rotated_at', now()));

  RETURN jsonb_build_object(
    'id', p_id,
    'client_id', p_id::text,
    'client_secret', v_secret,
    'message', 'احفظ الـ client_secret الآن. لن يظهر مرة أخرى.'
  );
END;
$$;

-- 2) Update the extended fields (scopes, auth_type, storage_target)
CREATE OR REPLACE FUNCTION public.fn_update_api_consumer_extended(
  p_id uuid,
  p_scopes text[] DEFAULT NULL,
  p_auth_type text DEFAULT NULL,
  p_storage_target text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT (has_role(auth.uid(), 'admin'::app_role)
       OR has_role(auth.uid(), 'owner'::app_role)
       OR is_owner_email()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  IF p_auth_type IS NOT NULL AND p_auth_type NOT IN ('api_key','oauth2','hybrid') THEN
    RAISE EXCEPTION 'Invalid auth_type';
  END IF;

  IF p_storage_target IS NOT NULL AND p_storage_target NOT IN ('local','aws','gcs','oci') THEN
    RAISE EXCEPTION 'Invalid storage_target';
  END IF;

  UPDATE public.api_consumers
  SET scopes = COALESCE(p_scopes, scopes),
      auth_type = COALESCE(p_auth_type, auth_type),
      storage_target = COALESCE(p_storage_target, storage_target),
      updated_at = now()
  WHERE id = p_id;

  INSERT INTO public.audit_logs (user_id, action, table_name, record_id, new_values)
  VALUES (auth.uid(), 'API_CONSUMER_UPDATED', 'api_consumers', p_id,
          jsonb_build_object(
            'scopes', p_scopes,
            'auth_type', p_auth_type,
            'storage_target', p_storage_target
          ));
END;
$$;

-- 3) Webhook subscription RPCs
CREATE OR REPLACE FUNCTION public.fn_create_webhook_subscription(
  p_consumer_id uuid,
  p_endpoint_url text,
  p_event_types text[],
  p_description text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_secret text;
  v_id uuid;
BEGIN
  IF NOT (has_role(auth.uid(), 'admin'::app_role)
       OR has_role(auth.uid(), 'owner'::app_role)
       OR is_owner_email()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  IF p_endpoint_url IS NULL OR p_endpoint_url !~ '^https?://' THEN
    RAISE EXCEPTION 'Invalid endpoint URL';
  END IF;

  v_secret := 'whsec_' || translate(encode(extensions.gen_random_bytes(32), 'base64'), '+/=', '-_');

  INSERT INTO public.api_webhook_subscriptions (
    consumer_id, endpoint_url, event_types, description, secret
  ) VALUES (
    p_consumer_id, p_endpoint_url, p_event_types, p_description, v_secret
  )
  RETURNING id INTO v_id;

  INSERT INTO public.audit_logs (user_id, action, table_name, record_id, new_values)
  VALUES (auth.uid(), 'WEBHOOK_SUBSCRIPTION_CREATED', 'api_webhook_subscriptions', v_id,
          jsonb_build_object('endpoint', p_endpoint_url, 'events', p_event_types));

  RETURN jsonb_build_object('id', v_id, 'secret', v_secret);
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_toggle_webhook_subscription(p_id uuid, p_active boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT (has_role(auth.uid(), 'admin'::app_role)
       OR has_role(auth.uid(), 'owner'::app_role)
       OR is_owner_email()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  UPDATE public.api_webhook_subscriptions
  SET is_active = p_active, updated_at = now()
  WHERE id = p_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_delete_webhook_subscription(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT (has_role(auth.uid(), 'admin'::app_role)
       OR has_role(auth.uid(), 'owner'::app_role)
       OR is_owner_email()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  DELETE FROM public.api_webhook_subscriptions WHERE id = p_id;
END;
$$;

-- 4) RLS policies for the new webhook tables (admin/owner only)
ALTER TABLE public.api_webhook_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_webhook_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_idempotency_keys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS webhook_subs_admin_all ON public.api_webhook_subscriptions;
CREATE POLICY webhook_subs_admin_all ON public.api_webhook_subscriptions
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'owner'::app_role) OR is_owner_email())
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'owner'::app_role) OR is_owner_email());

DROP POLICY IF EXISTS webhook_deliveries_admin_read ON public.api_webhook_deliveries;
CREATE POLICY webhook_deliveries_admin_read ON public.api_webhook_deliveries
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'owner'::app_role) OR is_owner_email());

DROP POLICY IF EXISTS idempotency_admin_read ON public.api_idempotency_keys;
CREATE POLICY idempotency_admin_read ON public.api_idempotency_keys
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'owner'::app_role) OR is_owner_email());

GRANT EXECUTE ON FUNCTION public.fn_issue_client_secret(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_update_api_consumer_extended(uuid,text[],text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_create_webhook_subscription(uuid,text,text[],text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_toggle_webhook_subscription(uuid,boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_delete_webhook_subscription(uuid) TO authenticated;