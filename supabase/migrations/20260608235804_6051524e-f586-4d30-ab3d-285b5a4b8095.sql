CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_full_name text;
  v_phone text;
  v_role text;
BEGIN
  v_full_name := regexp_replace(COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', NEW.email), '[<>"''`;]', '', 'g');
  v_phone := regexp_replace(COALESCE(NEW.raw_user_meta_data->>'phone', ''), '[^0-9+()\-\s]', '', 'g');
  v_role := CASE
    WHEN NEW.raw_user_meta_data->>'role' IN ('customer', 'technician', 'vendor', 'admin', 'manager', 'staff')
    THEN NEW.raw_user_meta_data->>'role'
    ELSE 'customer'
  END;

  -- ملاحظة: full_name عمود GENERATED ALWAYS — لا نكتب عليه مباشرة
  INSERT INTO public.profiles (
    id, email, name, phone, role, created_at, updated_at
  )
  VALUES (
    NEW.id, NEW.email, v_full_name, v_phone, v_role, NOW(), NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(NULLIF(EXCLUDED.name, ''), profiles.name),
    updated_at = NOW();

  INSERT INTO public.user_roles (user_id, role, assigned_at)
  VALUES (NEW.id, v_role::app_role, NOW())
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN others THEN
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$function$;