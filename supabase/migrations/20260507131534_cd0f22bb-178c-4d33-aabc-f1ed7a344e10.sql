
CREATE OR REPLACE FUNCTION public.complete_technician_registration(p_email text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_pending RECORD;
  v_user_id UUID;
  v_profile_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = p_email;
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'المستخدم غير موجود');
  END IF;

  SELECT * INTO v_pending FROM pending_technician_registrations WHERE email = p_email;
  IF v_pending IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'لا توجد بيانات تسجيل معلقة');
  END IF;

  IF EXISTS (SELECT 1 FROM technician_profiles WHERE user_id = v_user_id) THEN
    DELETE FROM pending_technician_registrations WHERE email = p_email;
    RETURN jsonb_build_object('success', false, 'error', 'الملف الشخصي موجود بالفعل');
  END IF;

  INSERT INTO public.technician_profiles (
    id, user_id, company_name, company_type, full_name, email, phone, status,
    preferred_language, country, has_insurance, accepts_emergency_jobs,
    accepts_national_contracts, agree_terms, agree_payment_terms,
    city_id, district_id, street_address, building_no, floor, unit, landmark,
    service_email, contact_name, accounting_name, accounting_email, accounting_phone,
    insurance_company_name, policy_number, policy_expiry_date, insurance_notes,
    pricing_notes, company_model, number_of_inhouse_technicians,
    number_of_office_staff, additional_notes
  ) VALUES (
    extensions.uuid_generate_v4(), v_user_id,
    v_pending.company_name, v_pending.company_type, v_pending.full_name,
    v_pending.email, v_pending.phone, 'pending_review',
    COALESCE(NULLIF(v_pending.profile_data->>'preferred_language',''), 'ar'),
    COALESCE(NULLIF(v_pending.profile_data->>'country',''), 'Egypt'),
    COALESCE((NULLIF(v_pending.profile_data->>'has_insurance',''))::boolean, false),
    COALESCE((NULLIF(v_pending.profile_data->>'accepts_emergency_jobs',''))::boolean, false),
    COALESCE((NULLIF(v_pending.profile_data->>'accepts_national_contracts',''))::boolean, false),
    COALESCE((NULLIF(v_pending.profile_data->>'agree_terms',''))::boolean, false),
    COALESCE((NULLIF(v_pending.profile_data->>'agree_payment_terms',''))::boolean, false),
    NULLIF(v_pending.profile_data->>'city_id','')::bigint,
    NULLIF(v_pending.profile_data->>'district_id','')::bigint,
    v_pending.profile_data->>'street_address',
    v_pending.profile_data->>'building_no',
    v_pending.profile_data->>'floor',
    v_pending.profile_data->>'unit',
    v_pending.profile_data->>'landmark',
    v_pending.profile_data->>'service_email',
    v_pending.profile_data->>'contact_name',
    v_pending.profile_data->>'accounting_name',
    v_pending.profile_data->>'accounting_email',
    v_pending.profile_data->>'accounting_phone',
    v_pending.profile_data->>'insurance_company_name',
    v_pending.profile_data->>'policy_number',
    NULLIF(v_pending.profile_data->>'policy_expiry_date','')::date,
    v_pending.profile_data->>'insurance_notes',
    v_pending.profile_data->>'pricing_notes',
    v_pending.profile_data->>'company_model',
    NULLIF(v_pending.profile_data->>'number_of_inhouse_technicians','')::integer,
    NULLIF(v_pending.profile_data->>'number_of_office_staff','')::integer,
    v_pending.profile_data->>'additional_notes'
  )
  RETURNING id INTO v_profile_id;

  DELETE FROM pending_technician_registrations WHERE email = p_email;

  UPDATE auth.users
  SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object(
    'full_name', v_pending.full_name,
    'phone', v_pending.phone,
    'role', 'technician'
  )
  WHERE id = v_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', v_user_id,
    'profile_id', v_profile_id,
    'message', 'تم إنشاء الحساب بنجاح'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$function$;
