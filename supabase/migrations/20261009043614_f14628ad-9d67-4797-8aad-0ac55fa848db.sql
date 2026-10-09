CREATE OR REPLACE FUNCTION public.fn_issue_client_secret(p_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
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
      auth_type = 'hybrid',
      last_rotated_at = now(),
      updated_at = now()
  WHERE id = p_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Consumer not found';
  END IF;

  INSERT INTO public.audit_logs (user_id, action, table_name, record_id, new_values)
  VALUES (auth.uid(), 'CLIENT_SECRET_ROTATED', 'api_consumers', p_id,
          jsonb_build_object('rotated_at', now(), 'auth_type', 'hybrid'));

  RETURN jsonb_build_object(
    'id', p_id,
    'client_id', p_id::text,
    'client_secret', v_secret,
    'message', 'احفظ الـ client_secret الآن. لن يظهر مرة أخرى.'
  );
END;
$function$