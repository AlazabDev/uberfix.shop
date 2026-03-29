-- Fix approve_technician_profile to use valid level value
CREATE OR REPLACE FUNCTION public.approve_technician_profile(profile_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
  v_profile RECORD;
  v_new_technician_id UUID;
  v_specialization TEXT;
BEGIN
  SELECT * INTO v_profile 
  FROM technician_profiles 
  WHERE id = profile_id AND status = 'pending_review';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found or not pending review';
  END IF;
  
  SELECT category_name INTO v_specialization
  FROM technician_trades
  WHERE technician_id = profile_id
  LIMIT 1;
  
  INSERT INTO technicians (
    name, phone, email, specialization, bio, city_id, district_id,
    status, is_active, is_verified, created_at, technician_profile_id, level
  ) VALUES (
    v_profile.full_name, v_profile.phone, v_profile.email,
    COALESCE(v_specialization, 'general'), v_profile.additional_notes,
    v_profile.city_id, v_profile.district_id,
    'offline', true, true, NOW(), profile_id, 'certified'
  ) RETURNING id INTO v_new_technician_id;
  
  INSERT INTO technician_coverage (technician_id, city_id, district_id, radius_km, created_at)
  SELECT v_new_technician_id, city_id, district_id, radius_km, NOW()
  FROM technician_coverage_areas
  WHERE technician_id = profile_id;
  
  INSERT INTO technician_performance (technician_id) VALUES (v_new_technician_id) ON CONFLICT DO NOTHING;
  INSERT INTO technician_wallet (technician_id, balance_current, balance_pending, balance_locked) VALUES (v_new_technician_id, 0, 0, 0) ON CONFLICT DO NOTHING;
  
  UPDATE technician_profiles SET status = 'approved', reviewed_at = NOW(), reviewed_by = auth.uid() WHERE id = profile_id;
  
  INSERT INTO notifications (recipient_id, title, message, type, entity_type, entity_id)
  VALUES (v_profile.user_id, 'تم قبول طلب التسجيل', 'تهانينا! تم قبول طلب التسجيل كفني في منصة UberFix.', 'success', 'technician', v_new_technician_id);
  
  RETURN v_new_technician_id;
END;
$function$;

-- Also update the existing technicians that may have invalid level
UPDATE technicians SET level = 'certified' WHERE level NOT IN ('certified', 'senior', 'expert', 'supervisor')