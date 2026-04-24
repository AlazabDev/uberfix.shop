import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TechnicianRegistrationData, ServicePrice, TechnicianTrade, CoverageArea, TechnicianDocument } from '@/types/technician-registration';
import { sanitizeStorageFilename } from '@/utils/sanitizeFilename';

const STORAGE_KEY = 'technician_registration_draft';

interface RegistrationResult {
  success: boolean;
  user_id?: string;
  profile_id?: string;
  error?: string;
  message?: string;
}

export function useTechnicianRegistration() {
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<Partial<TechnicianRegistrationData>>({
    company_type: 'individual',
    has_insurance: false,
    accepts_emergency_jobs: false,
    accepts_national_contracts: false,
    agree_terms: false,
    agree_payment_terms: false,
    country: 'Egypt',
    preferred_language: 'ar',
  });

  // تحميل البيانات المحفوظة محلياً عند بدء التشغيل
  useEffect(() => {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        setFormData(parsed.formData || {});
        setCurrentStep(parsed.currentStep || 0);
      } catch (e) {
        console.error('Error parsing saved registration data:', e);
      }
    }
  }, []);

  // حفظ البيانات محلياً
  const saveToLocalStorage = useCallback((data: Partial<TechnicianRegistrationData>, step: number) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      formData: data,
      currentStep: step,
      savedAt: new Date().toISOString(),
    }));
  }, []);

  // مسح البيانات المحفوظة
  const clearLocalStorage = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  // تحديث بيانات خطوة معينة
  const updateStepData = useCallback((stepData: Partial<TechnicianRegistrationData>) => {
    const newData = { ...formData, ...stepData };
    setFormData(newData);
    saveToLocalStorage(newData, currentStep);
    return newData;
  }, [formData, currentStep, saveToLocalStorage]);

  // الانتقال للخطوة التالية
  const goToNextStep = useCallback((stepData: Partial<TechnicianRegistrationData>) => {
    const newData = updateStepData(stepData);
    const newStep = currentStep + 1;
    setCurrentStep(newStep);
    saveToLocalStorage(newData, newStep);
  }, [currentStep, updateStepData, saveToLocalStorage]);

  // الرجوع للخطوة السابقة
  const goToPreviousStep = useCallback(() => {
    if (currentStep > 0) {
      const newStep = currentStep - 1;
      setCurrentStep(newStep);
      saveToLocalStorage(formData, newStep);
    }
  }, [currentStep, formData, saveToLocalStorage]);

  // التسجيل النهائي (إنشاء حساب + ملف تعريف)
  const submitRegistration = useCallback(async (
    password: string,
    services?: ServicePrice[],
    trades?: TechnicianTrade[],
    coverageAreas?: CoverageArea[],
    documents?: TechnicianDocument[]
  ): Promise<RegistrationResult> => {
    setIsLoading(true);
    
    try {
      // التحقق من البيانات الأساسية
      if (!formData.company_name || !formData.full_name || !formData.email || !formData.phone) {
        throw new Error('البيانات الأساسية غير مكتملة');
      }

      // تحضير بيانات الملف الشخصي
      const profileData = {
        preferred_language: formData.preferred_language,
        country: formData.country,
        has_insurance: formData.has_insurance,
        accepts_emergency_jobs: formData.accepts_emergency_jobs,
        accepts_national_contracts: formData.accepts_national_contracts,
        agree_terms: formData.agree_terms,
        agree_payment_terms: formData.agree_payment_terms,
        city_id: formData.city_id,
        district_id: formData.district_id,
        street_address: formData.street_address,
        building_no: formData.building_no,
        floor: formData.floor,
        unit: formData.unit,
        landmark: formData.landmark,
        service_email: formData.service_email,
        contact_name: formData.contact_name,
        accounting_name: formData.accounting_name,
        accounting_email: formData.accounting_email,
        accounting_phone: formData.accounting_phone,
        insurance_company_name: formData.insurance_company_name,
        policy_number: formData.policy_number,
        policy_expiry_date: formData.policy_expiry_date,
        insurance_notes: formData.insurance_notes,
        pricing_notes: formData.pricing_notes,
        company_model: formData.company_model,
        number_of_inhouse_technicians: formData.number_of_inhouse_technicians,
        number_of_office_staff: formData.number_of_office_staff,
        additional_notes: formData.additional_notes,
      };

      // الخطوة 1: حفظ البيانات في جدول التسجيلات المعلقة
      const { data: rpcResult, error: rpcError } = await supabase.rpc('register_technician_profile', {
        p_company_name: formData.company_name,
        p_company_type: formData.company_type || 'individual',
        p_full_name: formData.full_name,
        p_email: formData.email,
        p_phone: formData.phone,
        p_password: password, // سيتم استخدامه لاحقاً
        p_profile_data: profileData,
      });

      if (rpcError) throw rpcError;
      
      const pendingResult = rpcResult as unknown as { success: boolean; pending_id?: string; requires_signup?: boolean; error?: string };
      
      if (!pendingResult.success) {
        throw new Error(pendingResult.error || 'فشل حفظ البيانات');
      }

      // الخطوة 2: إنشاء حساب المستخدم عبر Supabase Auth
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: password,
        options: {
          data: {
            full_name: formData.full_name,
            phone: formData.phone,
            role: 'technician',
          },
        },
      });

      if (signUpError) {
        console.error('SignUp error:', signUpError);
        throw new Error(signUpError.message || 'فشل إنشاء الحساب');
      }

      if (!signUpData.user) {
        throw new Error('فشل إنشاء الحساب');
      }

      // الخطوة 3: إكمال التسجيل (إنشاء ملف الفني)
      const { data: completeResult, error: completeError } = await supabase.rpc('complete_technician_registration', {
        p_email: formData.email,
      });

      if (completeError) {
        console.error('Complete registration error:', completeError);
        throw new Error(completeError.message || 'فشل إكمال التسجيل');
      }

      const result = completeResult as unknown as RegistrationResult;
      
      if (!result.success) {
        throw new Error(result.error || 'فشل التسجيل');
      }

      const profileId = result.profile_id;
      const authUserId = signUpData.user.id;

      // إدخال الخدمات والأسعار
      if (services && services.length > 0 && profileId) {
        const { error: servicesError } = await supabase.from('technician_service_prices').insert(
          services.map(s => ({ 
            technician_id: profileId,
            service_id: s.service_id,
            standard_price: s.standard_price,
            emergency_price: s.emergency_price,
            night_weekend_price: s.night_weekend_price,
            min_job_value: s.min_job_value,
            material_markup_percent: s.material_markup_percent,
          }))
        );
        if (servicesError) console.warn('Error inserting services:', servicesError);
      }

      // إدخال المهن
      if (trades && trades.length > 0 && profileId) {
        const { error: tradesError } = await supabase.from('technician_trades').insert(
          trades.map(t => ({ 
            technician_id: profileId,
            category_id: t.category_id,
            years_of_experience: t.years_of_experience,
            licenses_or_certifications: t.licenses_or_certifications,
            can_handle_heavy_projects: t.can_handle_heavy_projects,
          }))
        );
        if (tradesError) console.warn('Error inserting trades:', tradesError);
      }

      // إدخال مناطق التغطية
      if (coverageAreas && coverageAreas.length > 0 && profileId) {
        const { error: coverageError } = await supabase.from('technician_coverage_areas').insert(
          coverageAreas.map(c => ({ 
            technician_id: profileId,
            city_id: c.city_id,
            district_id: c.district_id,
            radius_km: c.radius_km,
          }))
        );
        if (coverageError) console.warn('Error inserting coverage areas:', coverageError);
      }

      // رفع المستندات ثم إدراجها في الجدول
      if (documents && documents.length > 0 && profileId) {
        const uploadedDocs: Array<{
          technician_id: string;
          document_type: TechnicianDocument["document_type"];
          file_url: string;
          file_name: string;
          file_size?: number;
        }> = [];

        for (const d of documents) {
          // Skip entries without an actual File object (e.g., resumed draft).
          if (!d.pending_file) {
            // If the user previously uploaded a file_url before this refactor,
            // keep the existing record.
            if (d.file_url) {
              uploadedDocs.push({
                technician_id: profileId,
                document_type: d.document_type,
                file_url: d.file_url,
                file_name: d.file_name,
                file_size: d.file_size,
              });
            }
            continue;
          }

          // Build an ASCII-safe storage key. The original Arabic file name is
          // preserved in the database column `file_name` for display.
          const { ascii } = sanitizeStorageFilename(d.pending_file.name);
          const storageKey = `${authUserId}/${d.document_type}-${Date.now()}-${ascii}`;

          const { error: uploadError } = await supabase.storage
            .from('technician-registration-docs')
            .upload(storageKey, d.pending_file, {
              cacheControl: '3600',
              upsert: false,
              contentType: d.pending_file.type || 'application/octet-stream',
            });

          if (uploadError) {
            console.warn('Document upload failed:', uploadError);
            continue;
          }

          uploadedDocs.push({
            technician_id: profileId,
            document_type: d.document_type,
            file_url: storageKey, // store the storage key, generate signed URLs at read time
            file_name: d.pending_file.name, // keep the original Arabic name for display
            file_size: d.pending_file.size,
          });
        }

        if (uploadedDocs.length > 0) {
          const { error: docsError } = await supabase
            .from('technician_documents')
            .insert(uploadedDocs);
          if (docsError) console.warn('Error inserting document rows:', docsError);
        }
      }

      // مسح البيانات المحفوظة محلياً
      clearLocalStorage();

      return result;
    } catch (error: any) {
      console.error('Registration error:', error);
      return {
        success: false,
        error: error.message || 'حدث خطأ غير متوقع',
      };
    } finally {
      setIsLoading(false);
    }
  }, [formData, clearLocalStorage]);

  // تحديث حالة الطلب للمراجعة
  const submitForReview = useCallback(async (profileId: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('technician_profiles')
        .update({
          status: 'pending_review',
          submitted_at: new Date().toISOString(),
          terms_accepted_at: new Date().toISOString(),
        })
        .eq('id', profileId);

      if (error) throw error;
      
      clearLocalStorage();
      return { success: true };
    } catch (error: any) {
      console.error('Submit for review error:', error);
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  }, [clearLocalStorage]);

  return {
    formData,
    currentStep,
    isLoading,
    updateStepData,
    goToNextStep,
    goToPreviousStep,
    submitRegistration,
    submitForReview,
    setCurrentStep,
    setFormData,
    clearLocalStorage,
  };
}
