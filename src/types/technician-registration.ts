export interface TechnicianRegistrationData {
  // Step 1: Basic
  company_name: string;
  company_type: 'individual' | 'small_team' | 'company';
  full_name: string;
  email: string;
  phone: string;
  preferred_language?: string;

  // Step 2: Address
  service_email?: string;
  contact_name?: string;
  country?: string;
  city_id?: number;
  district_id?: number;
  street_address?: string;
  building_no?: string;
  floor?: string;
  unit?: string;
  landmark?: string;
  accounting_name?: string;
  accounting_email?: string;
  accounting_phone?: string;

  // Step 3: Insurance
  has_insurance: boolean;
  insurance_company_name?: string;
  policy_number?: string;
  policy_expiry_date?: string;
  insurance_notes?: string;

  // Step 4: Rates
  pricing_notes?: string;
  services?: ServicePrice[];

  // Step 5: Trades
  trades?: TechnicianTrade[];

  // Step 6: Coverage
  coverage_areas?: CoverageArea[];

  // Step 7: Extended
  company_model?: 'local_provider' | 'third_party';
  number_of_inhouse_technicians?: number;
  number_of_office_staff?: number;
  accepts_emergency_jobs: boolean;
  accepts_national_contracts: boolean;
  additional_notes?: string;

  // Step 8: Uploads
  documents?: TechnicianDocument[];

  // Step 9: Terms
  agree_terms: boolean;
  agree_payment_terms: boolean;
}

export interface ServicePrice {
  service_id: number;
  service_name?: string;
  standard_price: number;
  emergency_price?: number;
  night_weekend_price?: number;
  min_job_value?: number;
  material_markup_percent?: number;
  platform_price?: number;
}

export interface TechnicianTrade {
  category_id: number;
  category_name?: string;
  years_of_experience?: number;
  licenses_or_certifications?: string;
  can_handle_heavy_projects: boolean;
}

export interface CoverageArea {
  city_id: number;
  district_id?: number;
  radius_km?: number;
  city_name?: string;
  district_name?: string;
}

export interface TechnicianDocument {
  document_type: 'tax_card' | 'commercial_registration' | 'national_id' | 'insurance_certificate' | 'professional_license';
  file_url: string;
  file_name: string;
  file_size?: number;
  /** Holds the in-memory File before signup; cleared after upload. Not persisted. */
  pending_file?: File;
}

export interface RegistrationStep {
  id: string;
  label: string;
  completed: boolean;
  current: boolean;
}
