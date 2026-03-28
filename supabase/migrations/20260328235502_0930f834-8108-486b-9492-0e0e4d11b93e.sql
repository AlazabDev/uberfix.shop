-- Public-safe function for service map technicians
CREATE OR REPLACE FUNCTION public.get_public_technicians_for_map()
RETURNS TABLE (
  id uuid,
  name text,
  specialization text,
  rating numeric,
  total_reviews integer,
  status text,
  current_latitude double precision,
  current_longitude double precision,
  location_updated_at timestamptz,
  hourly_rate numeric,
  available_from text,
  available_to text,
  bio text,
  service_area_radius numeric,
  is_verified boolean,
  icon_url text,
  level text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    t.id,
    t.name,
    t.specialization,
    t.rating,
    t.total_reviews,
    t.status::text,
    t.current_latitude,
    t.current_longitude,
    t.location_updated_at,
    t.hourly_rate,
    t.available_from,
    t.available_to,
    t.bio,
    t.service_area_radius,
    t.is_verified,
    t.icon_url,
    t.level
  FROM public.technicians t
  WHERE t.is_active = true
    AND t.is_verified = true
    AND t.current_latitude IS NOT NULL
    AND t.current_longitude IS NOT NULL;
$$;

REVOKE ALL ON FUNCTION public.get_public_technicians_for_map() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_technicians_for_map() TO anon, authenticated;

-- Public-safe function to resolve a default branch/company for public map requests
CREATE OR REPLACE FUNCTION public.get_public_default_branch_company()
RETURNS TABLE (
  branch_id uuid,
  company_id uuid,
  branch_name text,
  city text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    b.id AS branch_id,
    b.company_id,
    b.name AS branch_name,
    b.city
  FROM public.branches b
  ORDER BY b.created_at ASC, b.name ASC
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_public_default_branch_company() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_default_branch_company() TO anon, authenticated;