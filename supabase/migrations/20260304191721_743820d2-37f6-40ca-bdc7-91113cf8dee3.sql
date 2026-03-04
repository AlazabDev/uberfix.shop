-- Drop view first, then function, then recreate
DROP VIEW IF EXISTS public.technicians_map_public;
DROP FUNCTION IF EXISTS public.get_technicians_for_map();

CREATE FUNCTION public.get_technicians_for_map()
 RETURNS TABLE(id uuid, name text, specialization text, rating numeric, total_reviews integer, status text, current_latitude numeric, current_longitude numeric, location_updated_at timestamp with time zone, hourly_rate numeric, available_from time without time zone, available_to time without time zone, bio text, service_area_radius numeric, is_verified boolean, icon_url text, level text, phone text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    id, name, specialization, rating, total_reviews, status,
    current_latitude, current_longitude, location_updated_at,
    hourly_rate, available_from, available_to, bio,
    service_area_radius, is_verified, icon_url, level, phone
  FROM public.technicians
  WHERE is_active = true AND is_verified = true;
$function$;

CREATE VIEW public.technicians_map_public AS
SELECT id, name, specialization, rating, total_reviews, status,
       current_latitude, current_longitude, location_updated_at,
       hourly_rate, available_from, available_to, bio,
       service_area_radius, is_verified, icon_url, level, phone
FROM get_technicians_for_map();