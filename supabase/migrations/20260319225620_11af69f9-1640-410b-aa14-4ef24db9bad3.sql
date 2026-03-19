CREATE OR REPLACE FUNCTION public.notify_suspicious_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  daily_count integer;
  admin_id uuid;
  property_label text;
BEGIN
  -- Only check for unauthenticated requests
  IF NEW.created_by IS NULL AND NEW.client_phone IS NOT NULL THEN
    -- Check if same phone submitted many requests today
    SELECT count(*) INTO daily_count
    FROM public.maintenance_requests
    WHERE client_phone = NEW.client_phone
      AND created_at >= CURRENT_DATE;

    IF daily_count >= 2 THEN
      property_label := COALESCE(NEW.property_id::text, NULLIF(trim(NEW.location), ''), 'بدون عقار محدد');

      -- Notify all admins about suspicious activity
      FOR admin_id IN
        SELECT p.id
        FROM public.profiles p
        JOIN public.user_roles ur ON ur.user_id = p.id
        WHERE ur.role = 'admin'
      LOOP
        INSERT INTO public.notifications (recipient_id, title, message, type)
        VALUES (
          admin_id,
          'طلب مشبوه - نشاط متكرر',
          'تم استلام ' || daily_count || ' طلبات من نفس الرقم: ' || NEW.client_phone || ' للعقار/الموقع: ' || property_label,
          'warning'
        );
      END LOOP;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;