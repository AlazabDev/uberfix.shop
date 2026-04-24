import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppSettings } from "@/hooks/useAppSettings";
import { useState, useEffect } from "react";
import { Loader2, Building2, Globe, DollarSign, Clock } from "lucide-react";

export function GeneralSettings() {
  const { settings, isLoading, updateSettings } = useAppSettings();
  const [formData, setFormData] = useState({
    app_name: "",
    company_email: "",
    company_phone: "",
    company_address: "",
    default_currency: "EGP",
    timezone: "Africa/Cairo",
    default_language: "ar",
    allow_self_registration: true,
  });

  useEffect(() => {
    if (settings) {
      const frame = requestAnimationFrame(() => {
        setFormData({
          app_name: settings.app_name,
          company_email: settings.company_email || "",
          company_phone: settings.company_phone || "",
          company_address: settings.company_address || "",
          default_currency: settings.default_currency,
          timezone: settings.timezone,
          default_language: settings.default_language,
          allow_self_registration: settings.allow_self_registration,
        });
      });

      return () => cancelAnimationFrame(frame);
    }
  }, [settings]);

  const handleSave = () => {
    updateSettings(formData);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          الإعدادات العامة
        </CardTitle>
        <CardDescription>إدارة المعلومات الأساسية للتطبيق</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* App Name */}
        <div className="space-y-2">
          <Label htmlFor="app_name">اسم التطبيق</Label>
          <Input
            id="app_name"
            value={formData.app_name}
            onChange={(e) => setFormData({ ...formData, app_name: e.target.value })}
            placeholder="UberFix.shop"
          />
        </div>

        {/* Company Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="company_email">البريد الإلكتروني</Label>
            <Input
              id="company_email"
              type="email"
              value={formData.company_email}
              onChange={(e) => setFormData({ ...formData, company_email: e.target.value })}
              placeholder="info@uberfix.shop"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="company_phone">رقم الهاتف</Label>
            <Input
              id="company_phone"
              value={formData.company_phone}
              onChange={(e) => setFormData({ ...formData, company_phone: e.target.value })}
              placeholder="+20 123 456 7890"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="company_address">العنوان</Label>
          <Input
            id="company_address"
            value={formData.company_address}
            onChange={(e) => setFormData({ ...formData, company_address: e.target.value })}
            placeholder="القاهرة، مصر"
          />
        </div>

        {/* Currency & Timezone */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="currency" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              العملة الافتراضية
            </Label>
            <Select
              value={formData.default_currency}
              onValueChange={(value) => setFormData({ ...formData, default_currency: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EGP">جنيه مصري (EGP)</SelectItem>
                <SelectItem value="AED">درهم إماراتي (AED)</SelectItem>
                <SelectItem value="USD">دولار أمريكي (USD)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="timezone" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              المنطقة الزمنية
            </Label>
            <Select
              value={formData.timezone}
              onValueChange={(value) => setFormData({ ...formData, timezone: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Africa/Cairo">القاهرة (EET)</SelectItem>
                <SelectItem value="Asia/Dubai">دبي (GST)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Language */}
        <div className="space-y-2">
          <Label htmlFor="language" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            اللغة الافتراضية
          </Label>
          <Select
            value={formData.default_language}
            onValueChange={(value) => setFormData({ ...formData, default_language: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ar">العربية</SelectItem>
              <SelectItem value="en">English</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Self Registration */}
        <div className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-muted/20">
          <div className="space-y-0.5">
            <Label htmlFor="self_registration">السماح بالتسجيل الذاتي</Label>
            <p className="text-sm text-muted-foreground">
              السماح للمستخدمين الجدد بالتسجيل دون موافقة مسبقة
            </p>
          </div>
          <Switch
            id="self_registration"
            checked={formData.allow_self_registration}
            onCheckedChange={(checked) =>
              setFormData({ ...formData, allow_self_registration: checked })
            }
          />
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4 border-t">
          <Button onClick={handleSave} className="bg-gradient-primary">
            حفظ التغييرات
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
