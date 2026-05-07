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
    </div>
  );
}
