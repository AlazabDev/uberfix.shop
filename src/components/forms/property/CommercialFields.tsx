import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UseFormRegister, UseFormSetValue, UseFormWatch } from "react-hook-form";
import { PropertyFormData } from "./types";

interface CommercialFieldsProps {
  register: UseFormRegister<PropertyFormData>;
  setValue: UseFormSetValue<PropertyFormData>;
  watch: UseFormWatch<PropertyFormData>;
}

const businessActivities = [
  { value: "retail", label: "تجزئة" },
  { value: "restaurant", label: "مطعم / كافيه" },
  { value: "office", label: "مكاتب إدارية" },
  { value: "medical", label: "مركز طبي" },
  { value: "hotel", label: "فندق / شقق فندقية" },
  { value: "supermarket", label: "سوبرماركت" },
  { value: "mall", label: "مول تجاري" },
  { value: "other", label: "أخرى" },
];

const operatingStatuses = [
  { value: "active", label: "نشط" },
  { value: "preparing", label: "تحت التجهيز" },
  { value: "under_maintenance", label: "تحت الصيانة" },
  { value: "temporarily_closed", label: "مغلق مؤقتًا" },
];

const locationNatures = [
  { value: "inside_mall", label: "داخل مول" },
  { value: "outside_mall", label: "خارج مول" },
  { value: "standalone", label: "موقع مستقل" },
];

const subscriptionStatuses = [
  { value: "subscribed", label: "مشترك" },
  { value: "no_subscription", label: "بدون اشتراك" },
];

const accessPolicies = [
  { value: "direct", label: "دخول مباشر" },
  { value: "branch_manager", label: "تنسيق مسبق مع مسؤول الفرع" },
  { value: "security_permit", label: "تصريح أمني مسبق" },
  { value: "mall_management", label: "تصريح من إدارة المول" },
  { value: "after_hours", label: "زيارة خارج ساعات العمل" },
];

const criticalAssets = [
  "HVAC تكييف مركزي",
  "لوحات كهرباء",
  "نظام إنذار / إطفاء",
  "كاميرات مراقبة",
  "أبواب أوتوماتيكية",
];

export function CommercialFields({ register, setValue, watch }: CommercialFieldsProps) {
  return (
    <div className="space-y-6">
      <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h4 className="font-semibold text-blue-700 dark:text-blue-300 mb-2">
          🏬 خصائص الفرع التجاري
        </h4>
        <p className="text-sm text-blue-600 dark:text-blue-400">
          أدخل تفاصيل تشغيل الفرع وآلية الوصول إليه لتسهيل عمليات الصيانة.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label>النشاط التجاري</Label>
          <Select
            value={watch("business_activity") || "retail"}
            onValueChange={(value) => setValue("business_activity", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="اختر النشاط" />
            </SelectTrigger>
            <SelectContent>
              {businessActivities.map((activity) => (
                <SelectItem key={activity.value} value={activity.value}>
                  {activity.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>حالة تشغيل الفرع</Label>
          <Select
            value={watch("operating_status") || "active"}
            onValueChange={(value) => setValue("operating_status", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="اختر حالة التشغيل" />
            </SelectTrigger>
            <SelectContent>
              {operatingStatuses.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label>ساعات التشغيل</Label>
          <div className="flex gap-2 items-center">
            <Input
              type="time"
              {...register("opening_time")}
              className="flex-1"
            />
            <span className="text-muted-foreground">إلى</span>
            <Input
              type="time"
              {...register("closing_time")}
              className="flex-1"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>طبيعة موقع الفرع</Label>
          <Select
            value={watch("location_nature") || "standalone"}
            onValueChange={(value) => setValue("location_nature", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="اختر طبيعة الموقع" />
            </SelectTrigger>
            <SelectContent>
              {locationNatures.map((n) => (
                <SelectItem key={n.value} value={n.value}>{n.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>المساحة الإجمالية (م²)</Label>
        <Input
          type="number"
          min={0}
          {...register("area", { valueAsNumber: true })}
          placeholder="مثال: 5000"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label>حالة الاشتراك</Label>
          <Select
            value={watch("subscription_status") || "no_subscription"}
            onValueChange={(value) => setValue("subscription_status", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="اختر حالة الاشتراك" />
            </SelectTrigger>
            <SelectContent>
              {subscriptionStatuses.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            تفاصيل الاشتراك الكاملة تُدار من صفحة العقد.
          </p>
        </div>

        <div className="space-y-2">
          <Label>آلية الدخول والتصاريح</Label>
          <Select
            value={watch("access_policy") || "direct"}
            onValueChange={(value) => setValue("access_policy", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="اختر آلية الدخول" />
            </SelectTrigger>
            <SelectContent>
              {accessPolicies.map((p) => (
                <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-muted/50 rounded-lg p-4">
        <Label className="text-muted-foreground mb-2 block">الأصول الحرجة</Label>
        <div className="flex flex-wrap gap-2">
          {criticalAssets.map((asset) => (
            <span
              key={asset}
              className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm rounded-full border border-blue-200 dark:border-blue-700"
            >
              {asset}
            </span>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          هذه الأصول تتطلب صيانة دورية ومراقبة مستمرة
        </p>
      </div>
    </div>
  );
}
