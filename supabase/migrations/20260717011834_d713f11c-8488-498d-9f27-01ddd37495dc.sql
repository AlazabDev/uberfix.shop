
-- Helper: check if current user is staff (admin/owner/manager)
CREATE OR REPLACE FUNCTION public.is_staff_user(_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _uid
      AND role IN ('admin','owner','manager')
  );
$$;

-- ============================================================
-- 1) technician_profiles: block self-approval fields on INSERT/UPDATE
-- ============================================================
CREATE OR REPLACE FUNCTION public.guard_technician_profiles_approval_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_staff boolean := public.is_staff_user(auth.uid());
BEGIN
  IF is_staff THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- Force safe defaults on self-insert; ignore any client-provided approval fields
    NEW.status := 'pending';
    NEW.approved_at := NULL;
    NEW.approved_by := NULL;
    NEW.rejected_at := NULL;
    NEW.rejection_reason := NULL;
    NEW.technician_code := NULL;
    RETURN NEW;
  END IF;

  -- UPDATE: reject any change to approval-related columns
  IF NEW.status IS DISTINCT FROM OLD.status
     OR NEW.approved_at IS DISTINCT FROM OLD.approved_at
     OR NEW.approved_by IS DISTINCT FROM OLD.approved_by
     OR NEW.rejected_at IS DISTINCT FROM OLD.rejected_at
     OR NEW.rejection_reason IS DISTINCT FROM OLD.rejection_reason
     OR NEW.technician_code IS DISTINCT FROM OLD.technician_code
  THEN
    RAISE EXCEPTION 'Only staff can modify approval fields on technician_profiles'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_technician_profiles_approval ON public.technician_profiles;
CREATE TRIGGER trg_guard_technician_profiles_approval
  BEFORE INSERT OR UPDATE ON public.technician_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_technician_profiles_approval_fields();

-- ============================================================
-- 2) technicians: block self-modification of verification/level/rating/rate
-- ============================================================
CREATE OR REPLACE FUNCTION public.guard_technicians_staff_only_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_staff boolean := public.is_staff_user(auth.uid());
BEGIN
  IF is_staff THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.is_verified IS DISTINCT FROM OLD.is_verified
       OR NEW.level IS DISTINCT FROM OLD.level
       OR NEW.rating IS DISTINCT FROM OLD.rating
       OR NEW.verification_notes IS DISTINCT FROM OLD.verification_notes
       OR NEW.standard_rate IS DISTINCT FROM OLD.standard_rate
       OR NEW.hourly_rate IS DISTINCT FROM OLD.hourly_rate
    THEN
      RAISE EXCEPTION 'Only staff can modify verification, level, rating, or rate fields on technicians'
        USING ERRCODE = '42501';
    END IF;
  ELSIF TG_OP = 'INSERT' THEN
    -- Prevent self-inserted technicians from being pre-verified or with staff-controlled rates
    NEW.is_verified := false;
    NEW.verification_notes := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_technicians_staff_only ON public.technicians;
CREATE TRIGGER trg_guard_technicians_staff_only
  BEFORE INSERT OR UPDATE ON public.technicians
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_technicians_staff_only_fields();
