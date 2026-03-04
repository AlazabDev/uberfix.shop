/**
 * Service Map Module Types
 * Aligned with technicians_map_public view and branch_locations table
 */

export interface TechnicianMapData {
  id: string;
  name: string;
  specialization: string;
  rating: number;
  total_reviews: number;
  status: 'online' | 'busy' | 'offline' | 'on_route';
  current_latitude: number | null;
  current_longitude: number | null;
  location_updated_at: string | null;
  hourly_rate: number | null;
  available_from: string | null;
  available_to: string | null;
  bio: string | null;
  service_area_radius: number | null;
  is_verified: boolean;
  icon_url: string | null;
  level: string;
  phone: string | null;
}

export interface BranchMapData {
  id: string;
  branch: string;
  branch_name: string | null;
  address: string | null;
  branch_type: string | null;
  city: string | null;
  district: string | null;
  phone: string | null;
  link: string | null;
  icon: string | null;
  latitude: string | null;
  longitude: string | null;
  status: string | null;
}

export interface MapPin {
  id: string;
  type: 'branch' | 'technician';
  position: { lat: number; lng: number };
  data: TechnicianMapData | BranchMapData;
}
