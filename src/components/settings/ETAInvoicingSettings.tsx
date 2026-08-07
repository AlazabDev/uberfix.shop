import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Receipt, PlugZap } from "lucide-react";

type EtaSettings = {
  id: string;
  is_enabled: boolean;
  environment: string;
  taxpayer_tin: string | null;
  taxpayer_name: string | null;
  activity_code: string | null;
  branch_id: string;
  branch_governate: string | null;
  branch_city: string | null;
  branch_street: string | null;
  branch_building_number: string | null;
  branch_postal_code: string | null;
  default_item_code: string | null;
  default_item_code_type: string;
  default_item_name: string | null;
  default_unit_type: string;
  signing_enabled: boolean;
  signing_service_url: string | null;
  auto_submit_on_paid: boolean;
};

export function ETAInvoicingSettings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [form, setForm] = useState<EtaSettings | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("eta_settings")
        .select("*")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) {
        toast({ title: "تعذر تحميل إعدادات الفاتورة الإلكترونية", description: error.message, variant: "destructive" });
      } else if (data) {
        setForm(data as unknown as EtaSettings);
      }
      setLoading(false);
    })();
  }, [toast]);

  const set = <K extends keyof EtaSettings>(key: K, value: EtaSettings[K]) =>
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));

  const handleSave = async () => {
    if (!form) return;
    setSaving(true);
    const { id, ...rest } = form;
    const { error } = await supabase.from("eta_settings").update(rest).eq("id", id);
    setSaving(false);
    if (error) {
      toast({ title: "تعذر الحفظ", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "تم حفظ إعدادات الفاتورة الإلكترونية" });
    }
  };

  const handleTest = async () => {
    setTesting(true);
    const { data, error } = await supabase.functions.invoke("eta-invoice", {
      body: { action: "test_connection", environment: form?.environment },
    });
    setTesting(false);
    if (error) {
      toast({ title: "فشل الاتصال بمصلحة الضرائب", description: error.message, variant: "destructive" });
    } else {
      toast({
        title: "نجح الاتصال بمنظومة الفاتورة الإلكترونية",
        description: `البيئة: ${data?.environment === "production" ? "فعلي" : "تجريبي"}`,
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!form) {
    return (
      <Card className="border-border/50">
        <CardContent className="py-8 text-center text-muted-foreground">
          لا توجد صلاحية لعرض إعدادات الفاتورة الإلكترونية
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Receipt className="h-5 w-5 text-primary" />
          الفاتورة الإلكترونية المصرية (ETA)
          <Badge variant={form.environment === "production" ? "default" : "secondary"}>
            {form.environment === "production" ? "فعلي" : "تجريبي"}
          </Badge>
        </CardTitle>
        <CardDescription>
          الربط مع منظومة الفاتورة الإلكترونية لمصلحة الضرائب المصرية — إرسال فواتير المبيعات (النوع I) موقّعة إلكترونيًا.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-muted/20">
          <div className="space-y-0.5">
            <Label htmlFor="eta_enabled">تفعيل الربط</Label>
            <p className="text-sm text-muted-foreground">عند التفعيل يمكن إرسال الفواتير للمصلحة</p>
          </div>
          <Switch
            id="eta_enabled"
            checked={form.is_enabled}
            onCheckedChange={(v) => set("is_enabled", v)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>البيئة</Label>
            <Select value={form.environment} onValueChange={(v) => set("environment", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="preprod">تجريبي (Preproduction)</SelectItem>
                <SelectItem value="production">فعلي (Production)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="tin">الرقم الضريبي للممول</Label>
            <Input id="tin" value={form.taxpayer_tin || ""} onChange={(e) => set("taxpayer_tin", e.target.value)} placeholder="123456789" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tname">اسم الممول</Label>
            <Input id="tname" value={form.taxpayer_name || ""} onChange={(e) => set("taxpayer_name", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="activity">كود النشاط</Label>
            <Input id="activity" value={form.activity_code || ""} onChange={(e) => set("activity_code", e.target.value)} placeholder="4321" />
          </div>
        </div>

        <div className="space-y-4 p-4 rounded-lg border border-border/50 bg-muted/20">
          <h4 className="font-medium">بيانات الفرع والعنوان</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="branch">كود الفرع</Label>
              <Input id="branch" value={form.branch_id} onChange={(e) => set("branch_id", e.target.value)} placeholder="0" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gov">المحافظة</Label>
              <Input id="gov" value={form.branch_governate || ""} onChange={(e) => set("branch_governate", e.target.value)} placeholder="Cairo" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">المدينة</Label>
              <Input id="city" value={form.branch_city || ""} onChange={(e) => set("branch_city", e.target.value)} placeholder="Maadi" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="street">الشارع</Label>
              <Input id="street" value={form.branch_street || ""} onChange={(e) => set("branch_street", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bld">رقم العقار</Label>
              <Input id="bld" value={form.branch_building_number || ""} onChange={(e) => set("branch_building_number", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="zip">الرقم البريدي</Label>
              <Input id="zip" value={form.branch_postal_code || ""} onChange={(e) => set("branch_postal_code", e.target.value)} />
            </div>
          </div>
        </div>

        <div className="space-y-4 p-4 rounded-lg border border-border/50 bg-muted/20">
          <h4 className="font-medium">كود السلعة/الخدمة الافتراضي</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ctype">نوع الكود</Label>
              <Select value={form.default_item_code_type} onValueChange={(v) => set("default_item_code_type", v)}>
                <SelectTrigger id="ctype">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EGS">EGS</SelectItem>
                  <SelectItem value="GS1">GS1</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ccode">كود السلعة</Label>
              <Input id="ccode" value={form.default_item_code || ""} onChange={(e) => set("default_item_code", e.target.value)} placeholder="EG-577219804-1075" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cname">وصف السلعة</Label>
              <Input id="cname" value={form.default_item_name || ""} onChange={(e) => set("default_item_name", e.target.value)} placeholder="Maintenance/Repair Services" />
            </div>
          </div>
        </div>

        <div className="space-y-4 p-4 rounded-lg border border-primary/20 bg-primary/5">
          <h4 className="font-medium">التوقيع الإلكتروني (خدمة محلية)</h4>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="signing">تفعيل التوقيع</Label>
              <p className="text-sm text-muted-foreground">
                إلزامي في البيئة الفعلية — يتم إرسال النص المُسلسل لخدمة التوقيع المتصلة بتوكن e-Signature لديك
              </p>
            </div>
            <Switch id="signing" checked={form.signing_enabled} onCheckedChange={(v) => set("signing_enabled", v)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="signurl">رابط خدمة التوقيع</Label>
            <Input
              id="signurl"
              value={form.signing_service_url || ""}
              onChange={(e) => set("signing_service_url", e.target.value)}
              placeholder="https://sign.uberfix.alazab.com/sign"
            />
            <p className="text-xs text-muted-foreground">
              تستقبل الخدمة <code>{'{ "serialized": "..." }'}</code> وتُرجع <code>{'{ "signature": "CMS base64" }'}</code>
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-muted/20">
          <div className="space-y-0.5">
            <Label htmlFor="autosubmit">إرسال تلقائي عند سداد الفاتورة</Label>
            <p className="text-sm text-muted-foreground">إرسال الفاتورة للمصلحة مباشرة بعد تحويل حالتها إلى مدفوعة</p>
          </div>
          <Switch id="autosubmit" checked={form.auto_submit_on_paid} onCheckedChange={(v) => set("auto_submit_on_paid", v)} />
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={handleTest} disabled={testing}>
            {testing ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <PlugZap className="h-4 w-4 ml-2" />}
            اختبار الاتصال
          </Button>
          <Button onClick={handleSave} disabled={saving} className="bg-gradient-primary">
            {saving && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
            حفظ التغييرات
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}