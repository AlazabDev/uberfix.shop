import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { TechnicianRegistrationData } from "@/types/technician-registration";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Select as USelect, SelectContent as UContent, SelectItem as UItem, SelectTrigger as UTrigger, SelectValue as UValue } from "@/components/ui/select";
import { LegalFormDialog } from "../LegalFormDialog";
import { FileSignature, CheckCircle2 } from "lucide-react";
import type { TechnicianDocument } from "@/types/technician-registration";

const addressSchema = z.object({
  service_email: z.string().email("بريد إلكتروني غير صالح").optional().or(z.literal("")),
  contact_name: z.string().optional(),
  country: z.string().default("Egypt"),
  city_id: z.number({ message: "المدينة مطلوبة" }),
  district_id: z.number().optional(),
  street_address: z.string().min(5, "عنوان الشارع مطلوب"),
  building_no: z.string().optional(),
  floor: z.string().optional(),
  unit: z.string().optional(),
  landmark: z.string().optional(),
  accounting_name: z.string().optional(),
  accounting_email: z.string().email().optional().or(z.literal("")),
  accounting_phone: z.string().optional(),
  // W-9 fields (all optional in schema; signing dialog enforces completeness)
  legal_name: z.string().optional(),
  trade_name: z.string().optional(),
  national_id: z.string().optional(),
  passport_no: z.string().optional(),
  date_of_birth: z.string().optional(),
  has_tax_card: z.enum(["yes", "no", "in_progress"]).optional(),
  tax_registration_number: z.string().optional(),
  tax_file_number: z.string().optional(),
  tax_office: z.string().optional(),
  tax_card_issue_date: z.string().optional(),
  tax_card_expiry_date: z.string().optional(),
  vat_status: z.enum(["yes", "no", "not_required", "in_progress"]).optional(),
  e_invoice_status: z.enum(["yes", "no", "in_progress"]).optional(),
  has_commercial_register: z.enum(["yes", "no", "in_progress"]).optional(),
  commercial_register_number: z.string().optional(),
  commercial_register_office: z.string().optional(),
  commercial_register_issue_date: z.string().optional(),
  legal_form: z.enum(["natural_person","sole_proprietorship","llc","partnership","limited_partnership","other"]).optional(),
  payment_method: z.enum(["bank","wallet","company_account","other"]).optional(),
  bank_account_holder: z.string().optional(),
  bank_name: z.string().optional(),
  bank_account_number: z.string().optional(),
  bank_iban: z.string().optional(),
  wallet_number: z.string().optional(),
  wallet_provider: z.string().optional(),
});

type AddressFormData = z.infer<typeof addressSchema>;

interface AddressStepProps {
  data: Partial<TechnicianRegistrationData>;
  onNext: (data: Partial<TechnicianRegistrationData>) => void;
  onBack: () => void;
  onSaveAndExit: (data: Partial<TechnicianRegistrationData>) => void;
}

export function AddressStep({ data, onNext, onBack, onSaveAndExit }: AddressStepProps) {
  const [cities, setCities] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [selectedCityId, setSelectedCityId] = useState<number | undefined>(data.city_id);
  const [w9Open, setW9Open] = useState(false);
  const [w9Sig, setW9Sig] = useState<string | undefined>(data.w9_signature_data);
  const [w9Attachment, setW9Attachment] = useState<TechnicianDocument | undefined>();
  const [w9SignedAt, setW9SignedAt] = useState<string | undefined>(data.w9_signed_at);

  const fetchCities = async () => {
    const { data, error } = await supabase
      .from('cities')
      .select('id, name_ar')
      .order('name_ar');

    if (!error && data) {
      setCities(data);
    }
  };

  const fetchDistricts = async (cityId: number) => {
    const { data, error } = await supabase
      .from('districts')
      .select('id, name_ar')
      .eq('city_id', cityId)
      .order('name_ar');

    if (!error && data) {
      setDistricts(data);
    }
  };

  const form = useForm<AddressFormData>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      service_email: data.service_email || '',
      contact_name: data.contact_name || '',
      country: data.country || 'Egypt',
      city_id: data.city_id,
      district_id: data.district_id,
      street_address: data.street_address || '',
      building_no: data.building_no || '',
      floor: data.floor || '',
      unit: data.unit || '',
      landmark: data.landmark || '',
      accounting_name: data.accounting_name || '',
      accounting_email: data.accounting_email || '',
      accounting_phone: data.accounting_phone || '',
      legal_name: data.legal_name || data.full_name || '',
      trade_name: data.trade_name || data.company_name || '',
      national_id: data.national_id || '',
      passport_no: data.passport_no || '',
      date_of_birth: data.date_of_birth || '',
      has_tax_card: data.has_tax_card,
      tax_registration_number: data.tax_registration_number || '',
      tax_file_number: data.tax_file_number || '',
      tax_office: data.tax_office || '',
      tax_card_issue_date: data.tax_card_issue_date || '',
      tax_card_expiry_date: data.tax_card_expiry_date || '',
      vat_status: data.vat_status,
      e_invoice_status: data.e_invoice_status,
      has_commercial_register: data.has_commercial_register,
      commercial_register_number: data.commercial_register_number || '',
      commercial_register_office: data.commercial_register_office || '',
      commercial_register_issue_date: data.commercial_register_issue_date || '',
      legal_form: data.legal_form,
      payment_method: data.payment_method,
      bank_account_holder: data.bank_account_holder || '',
      bank_name: data.bank_name || '',
      bank_account_number: data.bank_account_number || '',
      bank_iban: data.bank_iban || '',
      wallet_number: data.wallet_number || '',
      wallet_provider: data.wallet_provider || '',
    },
  });

  useEffect(() => {
    fetchCities();
  }, []);

  useEffect(() => {
    if (selectedCityId) {
      fetchDistricts(selectedCityId);
    }
  }, [selectedCityId]);

  const onSubmit = (formData: AddressFormData) => {
    const docs = [...(data.documents || [])];
    if (w9Attachment) {
      // Replace prior W-9 attachment if any
      const idx = docs.findIndex(d => d.file_name?.startsWith('W9-'));
      if (idx >= 0) docs[idx] = w9Attachment; else docs.push(w9Attachment);
    }
    onNext({
      ...formData,
      w9_signature_data: w9Sig,
      w9_signed_at: w9SignedAt,
      documents: docs,
    });
  };

  const handleSaveAndExit = () => {
    const currentData = form.getValues();
    onSaveAndExit({ ...currentData, w9_signature_data: w9Sig, w9_signed_at: w9SignedAt });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">الخطوة 2: العنوان</h2>
        <p className="text-muted-foreground">معلومات العنوان والمراسلات</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="service_email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>بريد الخدمات (اختياري)</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="service@company.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contact_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>اسم جهة الاتصال (اختياري)</FormLabel>
                  <FormControl>
                    <Input placeholder="اسم المسؤول" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">العنوان التفصيلي</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الدولة *</FormLabel>
                    <FormControl>
                      <Input disabled {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="city_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>المدينة / المحافظة *</FormLabel>
                    <Select 
                      onValueChange={(value) => {
                        const cityId = parseInt(value);
                        field.onChange(cityId);
                        setSelectedCityId(cityId);
                        form.setValue('district_id', undefined);
                      }} 
                      value={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر المدينة" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {cities.map((city) => (
                          <SelectItem key={city.id} value={city.id.toString()}>
                            {city.name_ar}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="district_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الحي / المنطقة (اختياري)</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(parseInt(value))} 
                      value={field.value?.toString()}
                      disabled={!selectedCityId}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر المنطقة" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {districts.map((district) => (
                          <SelectItem key={district.id} value={district.id.toString()}>
                            {district.name_ar}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="street_address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>اسم الشارع *</FormLabel>
                    <FormControl>
                      <Input placeholder="شارع..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="building_no"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>رقم العقار (اختياري)</FormLabel>
                    <FormControl>
                      <Input placeholder="15" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="floor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الدور (اختياري)</FormLabel>
                    <FormControl>
                      <Input placeholder="3" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الوحدة / الشقة (اختياري)</FormLabel>
                    <FormControl>
                      <Input placeholder="5" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="landmark"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>علامة مميزة (اختياري)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="بجوار..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">بيانات الحسابات (اختياري)</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="accounting_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>اسم المحاسب</FormLabel>
                    <FormControl>
                      <Input placeholder="اسم المحاسب" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="accounting_email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>بريد المحاسب</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="accounting@company.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="accounting_phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>هاتف المحاسب</FormLabel>
                    <FormControl>
                      <Input placeholder="01xxxxxxxxx" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* ==================== W-9 (Egyptian) tax & legal profile ==================== */}
          <div className="border-t pt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <FileSignature className="h-5 w-5 text-primary" />
                  نموذج W-9 — البيانات الضريبية والقانونية
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  مطلوب طبقًا لقانون الإجراءات الضريبية رقم 206 لسنة 2020
                </p>
              </div>
              {w9Sig ? (
                <span className="inline-flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-2 py-1 rounded">
                  <CheckCircle2 className="h-3.5 w-3.5" /> موقّع
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-50 dark:bg-amber-950 px-2 py-1 rounded">
                  بانتظار التوقيع
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="legal_name" render={({ field }) => (
                <FormItem><FormLabel>الاسم القانوني *</FormLabel>
                  <FormControl><Input placeholder="الاسم الثلاثي حسب البطاقة" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="trade_name" render={({ field }) => (
                <FormItem><FormLabel>الاسم التجاري</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="national_id" render={({ field }) => (
                <FormItem><FormLabel>الرقم القومي</FormLabel>
                  <FormControl><Input placeholder="14 رقمًا" maxLength={14} {...field} /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="passport_no" render={({ field }) => (
                <FormItem><FormLabel>جواز السفر (للأجانب)</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="date_of_birth" render={({ field }) => (
                <FormItem><FormLabel>تاريخ الميلاد</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                </FormItem>
              )} />

              <FormField control={form.control} name="has_tax_card" render={({ field }) => (
                <FormItem><FormLabel>هل لديك بطاقة ضريبية؟</FormLabel>
                  <USelect onValueChange={field.onChange} value={field.value}>
                    <FormControl><UTrigger><UValue placeholder="اختر" /></UTrigger></FormControl>
                    <UContent>
                      <UItem value="yes">نعم</UItem>
                      <UItem value="no">لا</UItem>
                      <UItem value="in_progress">جاري الاستخراج</UItem>
                    </UContent>
                  </USelect>
                </FormItem>
              )} />
              <FormField control={form.control} name="tax_registration_number" render={({ field }) => (
                <FormItem><FormLabel>رقم التسجيل الضريبي</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="tax_file_number" render={({ field }) => (
                <FormItem><FormLabel>رقم الملف الضريبي</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="tax_office" render={({ field }) => (
                <FormItem><FormLabel>المأمورية</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="tax_card_issue_date" render={({ field }) => (
                <FormItem><FormLabel>تاريخ إصدار البطاقة</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="tax_card_expiry_date" render={({ field }) => (
                <FormItem><FormLabel>تاريخ انتهاء البطاقة</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="vat_status" render={({ field }) => (
                <FormItem><FormLabel>حالة ضريبة القيمة المضافة</FormLabel>
                  <USelect onValueChange={field.onChange} value={field.value}>
                    <FormControl><UTrigger><UValue placeholder="اختر" /></UTrigger></FormControl>
                    <UContent>
                      <UItem value="yes">مسجَّل</UItem>
                      <UItem value="no">غير مسجَّل</UItem>
                      <UItem value="not_required">غير ملزم</UItem>
                      <UItem value="in_progress">جاري الفحص</UItem>
                    </UContent>
                  </USelect>
                </FormItem>
              )} />
              <FormField control={form.control} name="e_invoice_status" render={({ field }) => (
                <FormItem><FormLabel>الفاتورة/الإيصال الإلكتروني</FormLabel>
                  <USelect onValueChange={field.onChange} value={field.value}>
                    <FormControl><UTrigger><UValue placeholder="اختر" /></UTrigger></FormControl>
                    <UContent>
                      <UItem value="yes">مفعّل</UItem>
                      <UItem value="no">غير مفعّل</UItem>
                      <UItem value="in_progress">جاري التجهيز</UItem>
                    </UContent>
                  </USelect>
                </FormItem>
              )} />
              <FormField control={form.control} name="has_commercial_register" render={({ field }) => (
                <FormItem><FormLabel>السجل التجاري</FormLabel>
                  <USelect onValueChange={field.onChange} value={field.value}>
                    <FormControl><UTrigger><UValue placeholder="اختر" /></UTrigger></FormControl>
                    <UContent>
                      <UItem value="yes">لديّ سجل</UItem>
                      <UItem value="no">لا</UItem>
                      <UItem value="in_progress">جاري الاستخراج</UItem>
                    </UContent>
                  </USelect>
                </FormItem>
              )} />
              <FormField control={form.control} name="commercial_register_number" render={({ field }) => (
                <FormItem><FormLabel>رقم السجل التجاري</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="commercial_register_office" render={({ field }) => (
                <FormItem><FormLabel>مكتب السجل</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="commercial_register_issue_date" render={({ field }) => (
                <FormItem><FormLabel>تاريخ الإصدار</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="legal_form" render={({ field }) => (
                <FormItem><FormLabel>الشكل القانوني</FormLabel>
                  <USelect onValueChange={field.onChange} value={field.value}>
                    <FormControl><UTrigger><UValue placeholder="اختر" /></UTrigger></FormControl>
                    <UContent>
                      <UItem value="natural_person">شخص طبيعي</UItem>
                      <UItem value="sole_proprietorship">منشأة فردية</UItem>
                      <UItem value="llc">شركة ذات مسؤولية محدودة</UItem>
                      <UItem value="partnership">شركة تضامن</UItem>
                      <UItem value="limited_partnership">شركة توصية بسيطة</UItem>
                      <UItem value="other">أخرى</UItem>
                    </UContent>
                  </USelect>
                </FormItem>
              )} />

              <FormField control={form.control} name="payment_method" render={({ field }) => (
                <FormItem><FormLabel>طريقة استلام المستحقات</FormLabel>
                  <USelect onValueChange={field.onChange} value={field.value}>
                    <FormControl><UTrigger><UValue placeholder="اختر" /></UTrigger></FormControl>
                    <UContent>
                      <UItem value="bank">حساب بنكي</UItem>
                      <UItem value="wallet">محفظة إلكترونية</UItem>
                      <UItem value="company_account">حساب شركة</UItem>
                      <UItem value="other">أخرى</UItem>
                    </UContent>
                  </USelect>
                </FormItem>
              )} />
              <FormField control={form.control} name="bank_account_holder" render={({ field }) => (
                <FormItem><FormLabel>اسم صاحب الحساب</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="bank_name" render={({ field }) => (
                <FormItem><FormLabel>اسم البنك</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="bank_account_number" render={({ field }) => (
                <FormItem><FormLabel>رقم الحساب</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="bank_iban" render={({ field }) => (
                <FormItem><FormLabel>IBAN</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="wallet_number" render={({ field }) => (
                <FormItem><FormLabel>رقم المحفظة</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="wallet_provider" render={({ field }) => (
                <FormItem><FormLabel>مزود المحفظة</FormLabel>
                  <FormControl><Input placeholder="فودافون كاش، انستاباي…" {...field} /></FormControl>
                </FormItem>
              )} />
            </div>

            <Button
              type="button"
              variant={w9Sig ? "outline" : "default"}
              onClick={() => setW9Open(true)}
              className="mt-4 w-full md:w-auto"
            >
              <FileSignature className="h-4 w-4 ml-2" />
              {w9Sig ? "مراجعة وإعادة توقيع W-9" : "مراجعة وتوقيع نموذج W-9"}
            </Button>
          </div>

          <div className="flex gap-4 justify-between pt-6">
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onBack}>
                رجوع
              </Button>
              <Button type="button" variant="ghost" onClick={handleSaveAndExit}>
                حفظ والعودة لاحقاً
              </Button>
            </div>
            <Button type="submit">
              حفظ واستمرار
            </Button>
          </div>
        </form>
      </Form>

      <LegalFormDialog
        open={w9Open}
        kind="w9"
        data={{ ...data, ...form.getValues() } as any}
        onOpenChange={setW9Open}
        onSigned={(patch, attachment) => {
          if (patch.w9_signature_data !== undefined) setW9Sig(patch.w9_signature_data);
          if (patch.w9_signed_at) setW9SignedAt(patch.w9_signed_at);
          if (patch.legal_name) form.setValue("legal_name", patch.legal_name);
          if (attachment) setW9Attachment(attachment);
        }}
      />
    </div>
  );
}
