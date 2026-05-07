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

  // W-9 (Egyptian tax/legal profile) — collected within Address step
  legal_name?: string;
  trade_name?: string;
  national_id?: string;
  passport_no?: string;
  date_of_birth?: string;
  has_tax_card?: 'yes' | 'no' | 'in_progress';
  tax_registration_number?: string;
  tax_file_number?: string;
  tax_office?: string;
  tax_card_issue_date?: string;
  tax_card_expiry_date?: string;
  vat_status?: 'yes' | 'no' | 'not_required' | 'in_progress';
  e_invoice_status?: 'yes' | 'no' | 'in_progress';
  has_commercial_register?: 'yes' | 'no' | 'in_progress';
  commercial_register_number?: string;
  commercial_register_office?: string;
  commercial_register_issue_date?: string;
  legal_form?: 'natural_person' | 'sole_proprietorship' | 'llc' | 'partnership' | 'limited_partnership' | 'other';
  payment_method?: 'bank' | 'wallet' | 'company_account' | 'other';
  bank_account_holder?: string;
  bank_name?: string;
  bank_account_number?: string;
  bank_iban?: string;
  wallet_number?: string;
  wallet_provider?: string;
  w9_signed_at?: string;
  w9_signature_data?: string; // base64 PNG

  // ACORD (Egyptian liability/professional insurance) — collected within Insurance step
  insurance_certificate_number?: string;
  insurance_issue_date?: string;
  insurance_start_date?: string;
  insurance_status?: 'active' | 'expired' | 'renewing' | 'suspended';
  insurance_company_license_no?: string;
  insurance_broker_name?: string;
  insurance_broker_license_no?: string;
  insurance_contact_address?: string;
  insurance_contact_email?: string;
  insurance_contact_phone?: string;
  insurance_coverage_types?: string[]; // e.g. ['civil_liability','professional_liability',...]
  insurance_limit_per_incident?: number;
  insurance_limit_aggregate?: number;
  insurance_limit_property?: number;
  insurance_limit_bodily?: number;
  insurance_limit_professional?: number;
  insurance_limit_workers?: number;
  acord_signed_at?: string;
  acord_signature_data?: string;

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
