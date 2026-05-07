import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { TechnicianRegistrationData } from "@/types/technician-registration";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { LegalFormDialog } from "../LegalFormDialog";
import { FileSignature, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import type { TechnicianDocument } from "@/types/technician-registration";

const insuranceSchema = z.object({
  has_insurance: z.boolean(),
  insurance_company_name: z.string().optional(),
  policy_number: z.string().optional(),
  policy_expiry_date: z.string().optional(),
  insurance_notes: z.string().optional(),
  // ACORD extras (all optional)
  insurance_certificate_number: z.string().optional(),
  insurance_issue_date: z.string().optional(),
  insurance_start_date: z.string().optional(),
  insurance_status: z.enum(["active","expired","renewing","suspended"]).optional(),
  insurance_company_license_no: z.string().optional(),
  insurance_broker_name: z.string().optional(),
  insurance_broker_license_no: z.string().optional(),
  insurance_contact_address: z.string().optional(),
  insurance_contact_email: z.string().email().optional().or(z.literal("")),
  insurance_contact_phone: z.string().optional(),
  insurance_coverage_types: z.array(z.string()).optional(),
  insurance_limit_per_incident: z.coerce.number().optional(),
  insurance_limit_aggregate: z.coerce.number().optional(),
  insurance_limit_property: z.coerce.number().optional(),
  insurance_limit_bodily: z.coerce.number().optional(),
  insurance_limit_professional: z.coerce.number().optional(),
  insurance_limit_workers: z.coerce.number().optional(),
}).refine((data) => {
  if (data.has_insurance) {
    return data.insurance_company_name && data.policy_number && data.policy_expiry_date;
  }
  return true;
}, {
  message: "يجب إدخال بيانات التأمين الكاملة عند تفعيل التأمين",
  path: ["insurance_company_name"],
});

type InsuranceFormData = z.infer<typeof insuranceSchema>;

interface InsuranceStepProps {
  data: Partial<TechnicianRegistrationData>;
  onNext: (data: Partial<TechnicianRegistrationData>) => void;
  onBack: () => void;
  onSaveAndExit: (data: Partial<TechnicianRegistrationData>) => void;
}

export function InsuranceStep({ data, onNext, onBack, onSaveAndExit }: InsuranceStepProps) {
  const [acordOpen, setAcordOpen] = useState(false);
  const [acordSig, setAcordSig] = useState<string | undefined>(data.acord_signature_data);
  const [acordSignedAt, setAcordSignedAt] = useState<string | undefined>(data.acord_signed_at);
  const [acordAttachment, setAcordAttachment] = useState<TechnicianDocument | undefined>();

  const form = useForm<InsuranceFormData>({
    resolver: zodResolver(insuranceSchema),
    defaultValues: {
      has_insurance: data.has_insurance || false,
      insurance_company_name: data.insurance_company_name || '',
      policy_number: data.policy_number || '',
      policy_expiry_date: data.policy_expiry_date || '',
      insurance_notes: data.insurance_notes || '',
      insurance_certificate_number: data.insurance_certificate_number || '',
      insurance_issue_date: data.insurance_issue_date || '',
      insurance_start_date: data.insurance_start_date || '',
      insurance_status: data.insurance_status,
      insurance_company_license_no: data.insurance_company_license_no || '',
      insurance_broker_name: data.insurance_broker_name || '',
      insurance_broker_license_no: data.insurance_broker_license_no || '',
      insurance_contact_address: data.insurance_contact_address || '',
      insurance_contact_email: data.insurance_contact_email || '',
      insurance_contact_phone: data.insurance_contact_phone || '',
      insurance_coverage_types: data.insurance_coverage_types || [],
      insurance_limit_per_incident: data.insurance_limit_per_incident,
      insurance_limit_aggregate: data.insurance_limit_aggregate,
      insurance_limit_property: data.insurance_limit_property,
      insurance_limit_bodily: data.insurance_limit_bodily,
      insurance_limit_professional: data.insurance_limit_professional,
      insurance_limit_workers: data.insurance_limit_workers,
    },
  });

  const hasInsurance = form.watch('has_insurance');

  const onSubmit = (formData: InsuranceFormData) => {
    const docs = [...(data.documents || [])];
    if (acordAttachment) {
      const idx = docs.findIndex(d => d.file_name?.startsWith('ACORD-'));
      if (idx >= 0) docs[idx] = acordAttachment; else docs.push(acordAttachment);
    }
    onNext({
      ...formData,
      acord_signature_data: acordSig,
      acord_signed_at: acordSignedAt,
      documents: docs,
    });
  };

  const handleSaveAndExit = () => {
    const currentData = form.getValues();
    onSaveAndExit({ ...currentData, acord_signature_data: acordSig, acord_signed_at: acordSignedAt });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">الخطوة 3: التأمين</h2>
        <p className="text-muted-foreground">معلومات التأمين على الأعمال والمسؤولية</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="has_insurance"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">هل لديك تأمين على الأعمال؟</FormLabel>
                  <FormDescription>
                    التأمين يزيد من ثقة العملاء ويحميك من المخاطر
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          {hasInsurance && (
            <div className="space-y-4 animate-in fade-in-50 duration-300">
              <FormField
                control={form.control}
                name="insurance_company_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>اسم شركة التأمين *</FormLabel>
                    <FormControl>
                      <Input placeholder="مثال: شركة التأمين المصرية" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="policy_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>رقم الوثيقة *</FormLabel>
                      <FormControl>
                        <Input placeholder="POL-2024-12345" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="policy_expiry_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>تاريخ انتهاء الوثيقة *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="insurance_notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ملاحظات إضافية (اختياري)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="أي تفاصيل إضافية عن التأمين..."
                        className="resize-none"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* ==================== ACORD (Egyptian) certificate ==================== */}
              <div className="border-t pt-6 mt-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <FileSignature className="h-5 w-5 text-primary" />
                      شهادة التأمين (نموذج ACORD المصري)
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      تخضع للهيئة العامة للرقابة المالية
                    </p>
                  </div>
                  {acordSig ? (
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
                  <FormField control={form.control} name="insurance_certificate_number" render={({ field }) => (
                    <FormItem><FormLabel>رقم الشهادة</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="insurance_issue_date" render={({ field }) => (
                    <FormItem><FormLabel>تاريخ الإصدار</FormLabel><FormControl><Input type="date" {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="insurance_start_date" render={({ field }) => (
                    <FormItem><FormLabel>بداية التغطية</FormLabel><FormControl><Input type="date" {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="insurance_status" render={({ field }) => (
                    <FormItem><FormLabel>حالة الوثيقة</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="active">سارية</SelectItem>
                          <SelectItem value="expired">منتهية</SelectItem>
                          <SelectItem value="renewing">تحت التجديد</SelectItem>
                          <SelectItem value="suspended">موقوفة</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="insurance_company_license_no" render={({ field }) => (
                    <FormItem><FormLabel>ترخيص شركة التأمين</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="insurance_broker_name" render={({ field }) => (
                    <FormItem><FormLabel>اسم الوسيط</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="insurance_broker_license_no" render={({ field }) => (
                    <FormItem><FormLabel>قيد الوسيط</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="insurance_contact_phone" render={({ field }) => (
                    <FormItem><FormLabel>هاتف الاتصال</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="insurance_contact_email" render={({ field }) => (
                    <FormItem><FormLabel>بريد الاتصال</FormLabel><FormControl><Input type="email" {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="insurance_contact_address" render={({ field }) => (
                    <FormItem className="md:col-span-2"><FormLabel>العنوان</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                  )} />
                </div>

                <div className="mt-4">
                  <FormField control={form.control} name="insurance_coverage_types" render={({ field }) => (
                    <FormItem>
                      <FormLabel>أنواع التغطية</FormLabel>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                        {[
                          ["civil_liability","مسؤولية مدنية تجاه الغير"],
                          ["professional_liability","مسؤولية مهنية"],
                          ["property_damage","أضرار ممتلكات العملاء"],
                          ["bodily_injury","إصابات جسدية"],
                          ["employer_liability","مسؤولية صاحب العمل"],
                          ["vehicles","سيارات / انتقالات"],
                          ["electrical","أعمال كهرباء"],
                          ["plumbing","أعمال سباكة"],
                          ["hvac","أعمال تكييف"],
                          ["heights","أعمال ارتفاعات"],
                          ["welding","لحام / قطع"],
                        ].map(([k, l]) => {
                          const arr = (field.value || []) as string[];
                          const checked = arr.includes(k);
                          return (
                            <label key={k} className="flex items-center gap-2 text-sm cursor-pointer rounded border p-2">
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(c) => {
                                  const next = c ? [...arr, k] : arr.filter(x => x !== k);
                                  field.onChange(next);
                                }}
                              />
                              {l}
                            </label>
                          );
                        })}
                      </div>
                    </FormItem>
                  )} />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
                  <FormField control={form.control} name="insurance_limit_per_incident" render={({ field }) => (
                    <FormItem><FormLabel>حد لكل حادث</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ""} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="insurance_limit_aggregate" render={({ field }) => (
                    <FormItem><FormLabel>الإجمالي السنوي</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ""} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="insurance_limit_property" render={({ field }) => (
                    <FormItem><FormLabel>أضرار ممتلكات</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ""} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="insurance_limit_bodily" render={({ field }) => (
                    <FormItem><FormLabel>إصابات جسدية</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ""} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="insurance_limit_professional" render={({ field }) => (
                    <FormItem><FormLabel>مسؤولية مهنية</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ""} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="insurance_limit_workers" render={({ field }) => (
                    <FormItem><FormLabel>مسؤولية العاملين</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ""} /></FormControl></FormItem>
                  )} />
                </div>

                <Button
                  type="button"
                  variant={acordSig ? "outline" : "default"}
                  onClick={() => setAcordOpen(true)}
                  className="mt-4 w-full md:w-auto"
                >
                  <FileSignature className="h-4 w-4 ml-2" />
                  {acordSig ? "مراجعة وإعادة توقيع شهادة التأمين" : "مراجعة وتوقيع شهادة التأمين"}
                </Button>
              </div>
            </div>
          )}

          {!hasInsurance && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                💡 <strong>نصيحة:</strong> الحصول على تأمين يساعدك في الحصول على المزيد من الطلبات وزيادة ثقة العملاء
              </p>
            </div>
          )}

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
        open={acordOpen}
        kind="acord"
        data={{ ...data, ...form.getValues() } as any}
        onOpenChange={setAcordOpen}
        onSigned={(patch, attachment) => {
          if (patch.acord_signature_data !== undefined) setAcordSig(patch.acord_signature_data);
          if (patch.acord_signed_at) setAcordSignedAt(patch.acord_signed_at);
          if (attachment) setAcordAttachment(attachment);
        }}
      />
    </div>
  );
}
