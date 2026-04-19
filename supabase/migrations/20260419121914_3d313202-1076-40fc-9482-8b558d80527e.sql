-- 1. وظيفة تنظيف api_gateway_logs الأقدم من 90 يوم (TTL)
CREATE OR REPLACE FUNCTION public.cleanup_old_gateway_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  DELETE FROM public.api_gateway_logs
  WHERE created_at < now() - interval '90 days';
END;
$$;

-- 2. وظيفة masking للـ PII قبل القراءة (للاستخدام من الـ admin views)
CREATE OR REPLACE FUNCTION public.mask_pii_text(input text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN input IS NULL THEN NULL
    -- mask emails
    WHEN input ~* '[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}' THEN
      regexp_replace(input, '([A-Z0-9._%+-])[A-Z0-9._%+-]*(@[A-Z0-9.-]+\.[A-Z]{2,})', '\1***\2', 'gi')
    ELSE input
  END;
$$;

-- 3. View آمن للوصول لسجلات الـ gateway مع masking تلقائي للـ body
CREATE OR REPLACE VIEW public.api_gateway_logs_masked AS
SELECT
  id,
  request_id,
  method,
  route,
  status_code,
  duration_ms,
  response_size,
  consumer_id,
  consumer_type,
  created_at,
  -- mask client_ip بإخفاء آخر octet
  (host(client_ip) || '/masked')::text AS client_ip_masked,
  -- mask request_body
  CASE
    WHEN request_body IS NULL THEN NULL
    WHEN length(request_body) > 200 THEN left(request_body, 100) || '...[TRUNCATED]'
    ELSE public.mask_pii_text(request_body)
  END AS request_body_safe,
  user_agent
FROM public.api_gateway_logs;

-- 4. Trigger يمنع admin غير الـ owner من رفع أي مستخدم لدور owner
CREATE OR REPLACE FUNCTION public.prevent_owner_role_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role = 'owner'::app_role THEN
    -- فقط owner موجود مسبقاً يستطيع منح owner
    IF NOT public.current_user_is_owner() THEN
      RAISE EXCEPTION 'Only existing owners can assign the owner role';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_owner_escalation_trigger ON public.user_roles;
CREATE TRIGGER prevent_owner_escalation_trigger
BEFORE INSERT OR UPDATE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_owner_role_escalation();

-- 5. جدولة التنظيف اليومي عبر pg_cron إن كان متاحاً
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('cleanup-gateway-logs-daily')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-gateway-logs-daily');
    PERFORM cron.schedule(
      'cleanup-gateway-logs-daily',
      '0 3 * * *',
      $cron$ SELECT public.cleanup_old_gateway_logs(); $cron$
    );
  END IF;
END $$;