import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Send, Loader2, CheckCircle2, Copy, ExternalLink,
  FileText, Phone, User, Store, Tag, StickyNote,
  Building2, Zap, Droplet, PaintBucket, Wrench, Lightbulb, Home
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { Footer } from "@/components/landing/Footer";

const SERVICE_CATEGORIES = [
  { value: "general_contracting", label: "المقاولات العامة", icon: Building2 },
  { value: "electrical", label: "الأعمال الكهربائية", icon: Zap },
  { value: "plumbing", label: "أعمال السباكة", icon: Droplet },
  { value: "painting", label: "أعمال الدهانات", icon: PaintBucket },
  { value: "building_maintenance", label: "صيانة المباني", icon: Home },
  { value: "engineering_consulting", label: "الاستشارات الهندسية", icon: Lightbulb },
  { value: "ac", label: "تكييف وتبريد", icon: Wrench },
  { value: "other", label: "أخرى", icon: Tag },
];

const BUDGET_RANGES = [
  { value: "under_5000", label: "أقل من 5,000 ج.م" },
  { value: "5000_15000", label: "5,000 - 15,000 ج.م" },
  { value: "15000_50000", label: "15,000 - 50,000 ج.م" },
  { value: "50000_100000", label: "50,000 - 100,000 ج.م" },
  { value: "above_100000", label: "أكثر من 100,000 ج.م" },
  { value: "not_sure", label: "غير محدد / أحتاج استشارة" },
];

const PROJECT_TIMELINES = [
  { value: "urgent", label: "عاجل (خلال أسبوع)" },
  { value: "soon", label: "قريباً (خلال شهر)" },
  { value: "planned", label: "مخطط (1-3 أشهر)" },
  { value: "flexible", label: "مرن (بدون موعد محدد)" },
];

interface SuccessData {
  request_number: string;
  request_id: string;
}

export default function QuoteRequestForm() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<SuccessData | null>(null);
  const { toast } = useToast();

  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [serviceCategory, setServiceCategory] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [budgetRange, setBudgetRange] = useState("");
  const [timeline, setTimeline] = useState("");
  const [location, setLocation] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");

  const resetForm = () => {
    setFullName("");
    setCompanyName("");
    setPhone("");
    setEmail("");
    setServiceCategory("");
    setProjectDescription("");
    setBudgetRange("");
    setTimeline("");
    setLocation("");
    setAdditionalNotes("");
    setSuccess(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim() || !phone.trim() || !serviceCategory || !projectDescription.trim()) {
      toast({ title: "خطأ", description: "يرجى ملء جميع الحقول المطلوبة", variant: "destructive" });
      return;
    }

    const phoneClean = phone.replace(/[^0-9+]/g, "");
    if (phoneClean.length < 10) {
      toast({ title: "خطأ", description: "رقم الهاتف غير صحيح", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const serviceLabelObj = SERVICE_CATEGORIES.find(s => s.value === serviceCategory);
      const budgetLabelObj = BUDGET_RANGES.find(b => b.value === budgetRange);
      const timelineLabelObj = PROJECT_TIMELINES.find(t => t.value === timeline);

      const description = [
        `📋 طلب عرض أسعار`,
        `نوع الخدمة: ${serviceLabelObj?.label || serviceCategory}`,
        `تفاصيل المشروع: ${projectDescription}`,
        budgetRange ? `الميزانية التقديرية: ${budgetLabelObj?.label || budgetRange}` : '',
        timeline ? `الجدول الزمني: ${timelineLabelObj?.label || timeline}` : '',
        location ? `الموقع: ${location}` : '',
        companyName ? `الشركة: ${companyName}` : '',
        email ? `البريد: ${email}` : '',
        additionalNotes ? `ملاحظات: ${additionalNotes}` : '',
      ].filter(Boolean).join('\n');

      const { data, error } = await supabase.functions.invoke('maintenance-gateway', {
        body: {
          channel: 'public_form',
          client_name: fullName.trim(),
          client_phone: phoneClean,
          client_email: email.trim() || undefined,
          service_type: serviceCategory,
          title: `طلب عرض أسعار - ${serviceLabelObj?.label || serviceCategory}`,
          description,
          priority: 'low',
          metadata: {
            form_type: 'quote_request',
            company_name: companyName.trim() || undefined,
            budget_range: budgetRange || undefined,
            timeline: timeline || undefined,
            location: location.trim() || undefined,
          },
        },
      });

      if (error) throw error;

      const result = data;
      if (result?.success || result?.id) {
        setSuccess({
          request_number: result.request_number || result.id,
          request_id: result.id || '',
        });
        toast({ title: "✅ تم الإرسال", description: "سنتواصل معك قريباً بعرض الأسعار" });
      } else {
        throw new Error(result?.error || 'فشل في الإرسال');
      }
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message || "حدث خطأ أثناء الإرسال", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "تم النسخ", description: "تم نسخ رقم الطلب" });
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <LandingHeader />

      <section className="relative py-16 bg-gradient-to-br from-primary/10 via-background to-secondary/10">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center space-y-4">
            <Badge variant="secondary" className="w-fit mx-auto">
              <FileText className="h-3 w-3 ml-1" />
              طلب عرض أسعار
            </Badge>
            <h1 className="text-3xl lg:text-4xl font-bold">
              احصل على <span className="bg-gradient-to-l from-primary to-secondary bg-clip-text text-transparent">عرض أسعار مجاني</span>
            </h1>
            <p className="text-muted-foreground leading-relaxed">
              أرسل تفاصيل مشروعك وسنتواصل معك خلال 24 ساعة بعرض أسعار تفصيلي
            </p>
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="container mx-auto px-4 max-w-2xl">
          <AnimatePresence mode="wait">
            {success ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center space-y-6"
              >
                <Card className="p-8 border-green-200 bg-green-50/50 dark:bg-green-950/20 dark:border-green-800">
                  <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold mb-2">تم إرسال طلبك بنجاح!</h2>
                  <p className="text-muted-foreground mb-6">
                    سيتواصل معك فريقنا خلال 24 ساعة بعرض أسعار تفصيلي
                  </p>

                  <div className="bg-background rounded-lg p-4 inline-flex items-center gap-3 mb-6">
                    <span className="text-sm text-muted-foreground">رقم الطلب:</span>
                    <span className="font-mono font-bold text-lg">{success.request_number}</span>
                    <Button variant="ghost" size="icon" onClick={() => copyToClipboard(success.request_number)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    {success.request_id && (
                      <Button variant="outline" asChild>
                        <a href={`/track/${success.request_id}`}>
                          <ExternalLink className="h-4 w-4 ml-2" />
                          تتبع الطلب
                        </a>
                      </Button>
                    )}
                    <Button onClick={resetForm}>طلب عرض أسعار جديد</Button>
                  </div>
                </Card>
              </motion.div>
            ) : (
              <motion.div
                key="form"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card>
                  <CardContent className="p-6 sm:p-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
                      {/* معلومات الاتصال */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                          <User className="h-5 w-5 text-primary" />
                          معلومات الاتصال
                        </h3>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="fullName">الاسم الكامل *</Label>
                            <Input
                              id="fullName"
                              value={fullName}
                              onChange={e => setFullName(e.target.value)}
                              placeholder="أدخل اسمك الكامل"
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="phone">رقم الهاتف *</Label>
                            <Input
                              id="phone"
                              value={phone}
                              onChange={e => setPhone(e.target.value)}
                              placeholder="01xxxxxxxxx"
                              type="tel"
                              dir="ltr"
                              required
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="companyName">اسم الشركة (اختياري)</Label>
                            <div className="relative">
                              <Store className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                                id="companyName"
                                value={companyName}
                                onChange={e => setCompanyName(e.target.value)}
                                placeholder="اسم الشركة أو المؤسسة"
                                className="pr-10"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="email">البريد الإلكتروني (اختياري)</Label>
                            <Input
                              id="email"
                              value={email}
                              onChange={e => setEmail(e.target.value)}
                              placeholder="example@email.com"
                              type="email"
                              dir="ltr"
                            />
                          </div>
                        </div>
                      </div>

                      {/* تفاصيل المشروع */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                          <FileText className="h-5 w-5 text-primary" />
                          تفاصيل المشروع
                        </h3>

                        <div className="space-y-2">
                          <Label>نوع الخدمة المطلوبة *</Label>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {SERVICE_CATEGORIES.map(cat => {
                              const Icon = cat.icon;
                              return (
                                <button
                                  key={cat.value}
                                  type="button"
                                  onClick={() => setServiceCategory(cat.value)}
                                  className={`p-3 rounded-lg border text-center transition-all text-sm ${
                                    serviceCategory === cat.value
                                      ? 'border-primary bg-primary/10 text-primary font-medium'
                                      : 'border-border hover:border-primary/50'
                                  }`}
                                >
                                  <Icon className="h-5 w-5 mx-auto mb-1" />
                                  {cat.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="projectDescription">وصف المشروع / الخدمة المطلوبة *</Label>
                          <Textarea
                            id="projectDescription"
                            value={projectDescription}
                            onChange={e => setProjectDescription(e.target.value)}
                            placeholder="اشرح تفاصيل ما تحتاجه بأكبر قدر ممكن من التفصيل..."
                            rows={4}
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="location">موقع المشروع</Label>
                          <Input
                            id="location"
                            value={location}
                            onChange={e => setLocation(e.target.value)}
                            placeholder="المدينة / الحي / العنوان التقريبي"
                          />
                        </div>
                      </div>

                      {/* الميزانية والجدول الزمني */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                          <Tag className="h-5 w-5 text-primary" />
                          الميزانية والتوقيت
                        </h3>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>الميزانية التقديرية</Label>
                            <Select value={budgetRange} onValueChange={setBudgetRange}>
                              <SelectTrigger>
                                <SelectValue placeholder="اختر نطاق الميزانية" />
                              </SelectTrigger>
                              <SelectContent>
                                {BUDGET_RANGES.map(b => (
                                  <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>الجدول الزمني المطلوب</Label>
                            <Select value={timeline} onValueChange={setTimeline}>
                              <SelectTrigger>
                                <SelectValue placeholder="متى تريد البدء؟" />
                              </SelectTrigger>
                              <SelectContent>
                                {PROJECT_TIMELINES.map(t => (
                                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>

                      {/* ملاحظات إضافية */}
                      <div className="space-y-2">
                        <Label htmlFor="additionalNotes" className="flex items-center gap-2">
                          <StickyNote className="h-4 w-4 text-muted-foreground" />
                          ملاحظات إضافية (اختياري)
                        </Label>
                        <Textarea
                          id="additionalNotes"
                          value={additionalNotes}
                          onChange={e => setAdditionalNotes(e.target.value)}
                          placeholder="أي تفاصيل إضافية تريد إضافتها..."
                          rows={3}
                        />
                      </div>

                      <Button type="submit" className="w-full h-12 text-base" disabled={loading}>
                        {loading ? (
                          <>
                            <Loader2 className="h-5 w-5 ml-2 animate-spin" />
                            جاري الإرسال...
                          </>
                        ) : (
                          <>
                            <Send className="h-5 w-5 ml-2" />
                            إرسال طلب عرض الأسعار
                          </>
                        )}
                      </Button>

                      <p className="text-xs text-center text-muted-foreground">
                        بالضغط على إرسال، أنت توافق على{" "}
                        <a href="/privacy-policy" className="underline">سياسة الخصوصية</a>{" "}
                        و<a href="/terms-of-service" className="underline">شروط الاستخدام</a>
                      </p>
                    </form>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      <Footer />
    </div>
  );
}
