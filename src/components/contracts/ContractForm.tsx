import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useMaintenanceContracts, BILLING_TYPE_LABELS, type MaintenanceContract } from "@/hooks/useMaintenanceContracts";
import { toast } from "sonner";
import { useState } from "react";

interface ContractFormProps {
  contract?: MaintenanceContract;
  onSuccess: () => void;
}

export function ContractForm({ contract, onSuccess }: ContractFormProps) {
  const { createContract, updateContract } = useMaintenanceContracts();
  const [submitting, setSubmitting] = useState(false);
  const isEdit = !!contract;

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm({
    defaultValues: {
      contract_number: contract?.contract_number || `CNT-${Date.now().toString(36).toUpperCase()}`,
      title: contract?.title || "",
      description: contract?.description || "",
      client_name: contract?.client_name || "",
      client_phone: contract?.client_phone || "",
      client_email: contract?.client_email || "",
      start_date: contract?.start_date || new Date().toISOString().split("T")[0],
      end_date: contract?.end_date || "",
      billing_type: contract?.billing_type || "per_request",
      contract_value: contract?.contract_value || 0,
      discount_percentage: contract?.discount_percentage || 0,
      max_requests: contract?.max_requests || undefined,
      includes_parts: contract?.includes_parts || false,
      sla_response_hours: contract?.sla_response_hours || 24,
      sla_resolution_hours: contract?.sla_resolution_hours || 72,
      status: contract?.status || "draft",
      renewal_reminder_days: contract?.renewal_reminder_days || 30,
      auto_renew: contract?.auto_renew || false,
      terms_and_conditions: contract?.terms_and_conditions || "",
      internal_notes: contract?.internal_notes || "",
    },
  });

  const billingType = watch("billing_type");
  const autoRenew = watch("auto_renew");
  const includesParts = watch("includes_parts");

  const onSubmit = async (data: any) => {
    try {
      setSubmitting(true);
      if (isEdit) {
        await updateContract(contract.id, data);
      } else {
        await createContract(data);
      }
      onSuccess();
    } catch (err) {
      toast.error(isEdit ? "فشل في تحديث العقد" : "فشل في إنشاء العقد");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Basic Info */}
      <div className="space-y-4">
        <h3 className="font-semibold text-base">معلومات العقد</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>رقم العقد *</Label>
            <Input {...register("contract_number", { required: true })} readOnly={isEdit} />
          </div>
          <div>
            <Label>عنوان العقد *</Label>
            <Input {...register("title", { required: "العنوان مطلوب" })} placeholder="عقد صيانة شامل..." />
            {errors.title && <span className="text-destructive text-xs">{errors.title.message as string}</span>}
          </div>
        </div>
        <div>
          <Label>الوصف</Label>
          <Textarea {...register("description")} placeholder="تفاصيل العقد..." rows={2} />
        </div>
      </div>

      <Separator />

      {/* Client Info */}
      <div className="space-y-4">
        <h3 className="font-semibold text-base">بيانات العميل</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <Label>اسم العميل *</Label>
            <Input {...register("client_name", { required: "اسم العميل مطلوب" })} />
            {errors.client_name && <span className="text-destructive text-xs">{errors.client_name.message as string}</span>}
          </div>
          <div>
            <Label>هاتف العميل</Label>
            <Input {...register("client_phone")} dir="ltr" />
          </div>
          <div>
            <Label>بريد العميل</Label>
            <Input {...register("client_email")} type="email" dir="ltr" />
          </div>
        </div>
      </div>

      <Separator />

      {/* Contract Terms */}
      <div className="space-y-4">
        <h3 className="font-semibold text-base">شروط العقد</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>تاريخ البداية *</Label>
            <Input {...register("start_date", { required: true })} type="date" />
          </div>
          <div>
            <Label>تاريخ الانتهاء *</Label>
            <Input {...register("end_date", { required: true })} type="date" />
          </div>
          <div>
            <Label>نوع الفوترة</Label>
            <Select value={billingType} onValueChange={v => setValue("billing_type", v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(BILLING_TYPE_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>قيمة العقد (ج.م)</Label>
            <Input {...register("contract_value", { valueAsNumber: true })} type="number" min={0} />
          </div>
          <div>
            <Label>نسبة الخصم %</Label>
            <Input {...register("discount_percentage", { valueAsNumber: true })} type="number" min={0} max={100} />
          </div>
          <div>
            <Label>الحد الأقصى للطلبات</Label>
            <Input {...register("max_requests", { valueAsNumber: true })} type="number" min={0} placeholder="غير محدود" />
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Switch
              checked={includesParts}
              onCheckedChange={v => setValue("includes_parts", v)}
            />
            <Label>يشمل قطع الغيار</Label>
          </div>
        </div>
      </div>

      <Separator />

      {/* SLA */}
      <div className="space-y-4">
        <h3 className="font-semibold text-base">اتفاقية مستوى الخدمة (SLA)</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>وقت الاستجابة (ساعات)</Label>
            <Input {...register("sla_response_hours", { valueAsNumber: true })} type="number" min={1} />
          </div>
          <div>
            <Label>وقت الحل (ساعات)</Label>
            <Input {...register("sla_resolution_hours", { valueAsNumber: true })} type="number" min={1} />
          </div>
        </div>
      </div>

      <Separator />

      {/* Renewal */}
      <div className="space-y-4">
        <h3 className="font-semibold text-base">التجديد</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>التنبيه قبل الانتهاء (أيام)</Label>
            <Input {...register("renewal_reminder_days", { valueAsNumber: true })} type="number" min={1} />
          </div>
          <div className="flex items-center gap-2 pt-6">
            <Switch
              checked={autoRenew}
              onCheckedChange={v => setValue("auto_renew", v)}
            />
            <Label>تجديد تلقائي</Label>
          </div>
        </div>
      </div>

      <Separator />

      {/* Status */}
      {isEdit && (
        <div>
          <Label>حالة العقد</Label>
          <Select value={watch("status")} onValueChange={v => setValue("status", v as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">مسودة</SelectItem>
              <SelectItem value="active">نشط</SelectItem>
              <SelectItem value="suspended">معلق</SelectItem>
              <SelectItem value="cancelled">ملغي</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Notes */}
      <div className="space-y-4">
        <div>
          <Label>الشروط والأحكام</Label>
          <Textarea {...register("terms_and_conditions")} rows={3} />
        </div>
        <div>
          <Label>ملاحظات داخلية</Label>
          <Textarea {...register("internal_notes")} rows={2} />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="submit" disabled={submitting}>
          {submitting ? "جاري الحفظ..." : isEdit ? "تحديث العقد" : "إنشاء العقد"}
        </Button>
      </div>
    </form>
  );
}
