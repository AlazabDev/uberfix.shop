import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { TechnicianRegistrationData, ServicePrice, TechnicianTrade, CoverageArea, TechnicianDocument } from "@/types/technician-registration";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle2, Eye, EyeOff, Loader2, FileDown, Printer, FileText } from "lucide-react";
import { useMemo, useState } from "react";
import { generateRegistrationPDF } from "@/utils/generateRegistrationPDF";
import { toast } from "sonner";
import { buildTermsHtml } from "@/lib/legalTerms";
import { renderHtmlToPdfBlob, downloadBlob } from "@/lib/legalForms";

const submitSchema = z.object({
  password: z.string()
    .min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل")
    .regex(/[A-Z]/, "يجب أن تحتوي على حرف كبير واحد على الأقل")
    .regex(/[a-z]/, "يجب أن تحتوي على حرف صغير واحد على الأقل")
    .regex(/[0-9]/, "يجب أن تحتوي على رقم واحد على الأقل"),
  confirmPassword: z.string(),
  agree_terms: z.boolean().refine(val => val === true, {
    message: "يجب الموافقة على الشروط والأحكام",
  }),
  agree_payment_terms: z.boolean().refine(val => val === true, {
    message: "يجب الموافقة على شروط الدفع",
  }),
}).refine(data => data.password === data.confirmPassword, {
  message: "كلمات المرور غير متطابقة",
  path: ["confirmPassword"],
});

type SubmitFormData = z.infer<typeof submitSchema>;

interface SubmitStepProps {
  data: Partial<TechnicianRegistrationData>;
  onSubmit: (data: { password: string; agree_terms: boolean; agree_payment_terms: boolean }) => Promise<void>;
  onBack: () => void;
  isLoading?: boolean;
  services?: ServicePrice[];
  trades?: TechnicianTrade[];
  coverageAreas?: CoverageArea[];
  documents?: TechnicianDocument[];
  cityName?: string;
  districtName?: string;
}

export function SubmitStep({ data, onSubmit, onBack, isLoading, services, trades, coverageAreas, documents, cityName, districtName }: SubmitStepProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isGeneratingTerms, setIsGeneratingTerms] = useState(false);
  const termsHtml = useMemo(
    () => buildTermsHtml({ signerName: data.full_name || data.legal_name }),
    [data.full_name, data.legal_name]
  );

  const handleDownloadTerms = async () => {
    setIsGeneratingTerms(true);
    try {
      const blob = await renderHtmlToPdfBlob(termsHtml);
      downloadBlob(blob, `UberFix_Terms_${data.full_name || "draft"}.pdf`);
    } catch (e) {
      console.error(e);
      toast.error("فشل تجهيز ملف الشروط");
    } finally {
      setIsGeneratingTerms(false);
    }
  };

  const handlePrintTerms = () => {
    const w = window.open("", "_blank", "width=900,height=700");
    if (!w) return toast.error("اسمح بالنوافذ المنبثقة للطباعة");
    w.document.write(`<!doctype html><html dir="rtl"><head><meta charset="utf-8"><title>UberFix — الشروط والأحكام</title>
      <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap" rel="stylesheet">
      <style>body{font-family:'Cairo',sans-serif;margin:0;background:#fff;}</style>
      </head><body>${termsHtml}<script>window.onload=()=>setTimeout(()=>window.print(),300);</script></body></html>`);
    w.document.close();
  };

  const form = useForm<SubmitFormData>({
    resolver: zodResolver(submitSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
      agree_terms: data.agree_terms || false,
      agree_payment_terms: data.agree_payment_terms || false,
    },
  });

  const handleSubmit = async (formData: SubmitFormData) => {
    await onSubmit({
      password: formData.password,
      agree_terms: formData.agree_terms,
      agree_payment_terms: formData.agree_payment_terms,
    });
  };

  const handleDownloadPDF = async () => {
    setIsGeneratingPDF(true);
    try {
      await generateRegistrationPDF({
        formData: data,
        services,
        trades,
        coverageAreas,
        documents,
        cityName,
        districtName,
      });
      toast.success('تم تحميل ملف PDF بنجاح');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('فشل في إنشاء ملف PDF');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">الخطوة 9: إنشاء الحساب والإرسال</h2>
        <p className="text-muted-foreground">أنشئ كلمة مرور للحساب ووافق على الشروط لإتمام التسجيل</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* ملخص البيانات */}
          <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-green-800 dark:text-green-200">أنت على وشك الانتهاء!</p>
                <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                  البريد الإلكتروني للحساب: <strong dir="ltr">{data.email}</strong>
                </p>
                <p className="text-sm text-green-700 dark:text-green-300">
                  بعد الموافقة على الشروط والإرسال، سيتم مراجعة طلبك من قبل فريقنا خلال 24-48 ساعة
                </p>
              </div>
            </div>
          </div>

          {/* زر تحميل PDF */}
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-medium text-blue-800 dark:text-blue-200">تحميل نسخة من بيانات التسجيل</p>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  يمكنك تحميل ملف PDF يحتوي على جميع البيانات التي أدخلتها للاحتفاظ بها
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={handleDownloadPDF}
                disabled={isGeneratingPDF}
                className="border-blue-300 text-blue-700 hover:bg-blue-100 dark:border-blue-700 dark:text-blue-300 dark:hover:bg-blue-900"
              >
                {isGeneratingPDF ? (
                  <>
                    <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                    جارٍ الإنشاء...
                  </>
                ) : (
                  <>
                    <FileDown className="h-4 w-4 ml-2" />
                    تحميل PDF
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* كلمة المرور */}
          <div className="border rounded-lg p-4 space-y-4">
            <h3 className="font-semibold">إنشاء كلمة مرور للحساب</h3>
            
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>كلمة المرور *</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="أدخل كلمة مرور قوية"
                        {...field}
                      />
                      <button
                        type="button"
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    يجب أن تحتوي على 8 أحرف على الأقل، حرف كبير، حرف صغير، ورقم
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>تأكيد كلمة المرور *</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="أعد إدخال كلمة المرور"
                        {...field}
                      />
                      <button
                        type="button"
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* الشروط والأحكام */}
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="agree_terms"
              render={({ field }) => (
                <FormItem className="rounded-lg border p-4">
                  <div className="space-y-3">
                    <div className="flex items-start space-x-2 space-x-reverse">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="mt-1"
                        />
                      </FormControl>
                      <FormLabel className="text-base font-medium cursor-pointer">
                        أوافق على الشروط والأحكام العامة
                      </FormLabel>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" size="sm" variant="outline" onClick={handleDownloadTerms} disabled={isGeneratingTerms}>
                        {isGeneratingTerms ? <Loader2 className="h-4 w-4 animate-spin ml-1" /> : <FileText className="h-4 w-4 ml-1" />}
                        تحميل الشروط PDF
                      </Button>
                      <Button type="button" size="sm" variant="outline" onClick={handlePrintTerms}>
                        <Printer className="h-4 w-4 ml-1" /> طباعة
                      </Button>
                    </div>
                    <ScrollArea className="h-72 w-full rounded border bg-white">
                      <div
                        style={{ direction: "rtl", transform: "scale(0.78)", transformOrigin: "top center", width: 760 }}
                        className="mx-auto"
                        dangerouslySetInnerHTML={{ __html: termsHtml }}
                      />
                    </ScrollArea>
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="agree_payment_terms"
              render={({ field }) => (
                <FormItem className="rounded-lg border p-4">
                  <div className="space-y-3">
                    <div className="flex items-start space-x-2 space-x-reverse">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="mt-1"
                        />
                      </FormControl>
                      <FormLabel className="text-base font-medium cursor-pointer">
                        أوافق على شروط الدفع والعمولات
                      </FormLabel>
                    </div>
                    
                    <ScrollArea className="h-48 w-full rounded border bg-muted/30 p-4">
                      <div className="space-y-3 text-sm">
                        <h4 className="font-semibold">شروط الدفع والعمولات</h4>
                        
                        <div>
                          <h5 className="font-medium mb-1">1. نظام العمولات</h5>
                          <p className="text-muted-foreground">
                            - تحصل المنصة على عمولة من كل طلب منجز
                            <br />- نسبة العمولة تعتمد على نوع الخدمة ومستوى الفني
                            <br />- العمولة تُخصم تلقائياً قبل التحويل للفني
                          </p>
                        </div>

                        <div>
                          <h5 className="font-medium mb-1">2. جدول السحب</h5>
                          <p className="text-muted-foreground">
                            - الحد الأدنى للسحب: 300 جنيه
                            <br />- معالجة طلبات السحب خلال 48 ساعة عمل
                            <br />- التحويل عبر: فودافون كاش، محفظة بنكية، تحويل بنكي
                          </p>
                        </div>

                        <div>
                          <h5 className="font-medium mb-1">3. الأسعار والفواتير</h5>
                          <p className="text-muted-foreground">
                            - الأسعار المعروضة نهائية وشاملة لكل الرسوم
                            <br />- لا يجوز طلب مبالغ إضافية من العملاء مباشرة
                            <br />- يتم إصدار فاتورة رسمية لكل عملية
                          </p>
                        </div>

                        <div>
                          <h5 className="font-medium mb-1">4. استرداد الأموال</h5>
                          <p className="text-muted-foreground">
                            - في حالة الشكاوى المثبتة، قد يُطلب استرداد المبلغ
                            <br />- يتم التحقيق في كل حالة بشكل عادل
                          </p>
                        </div>

                        <div>
                          <h5 className="font-medium mb-1">5. المكافآت والحوافز</h5>
                          <p className="text-muted-foreground">
                            - الفنيون المتميزون يحصلون على مكافآت شهرية
                            <br />- تخفيض نسبة العمولة للفنيين ذوي التقييم العالي
                          </p>
                        </div>
                      </div>
                    </ScrollArea>
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              ⚠️ <strong>تنبيه:</strong> بالضغط على "إرسال الطلب"، أنت توافق على جميع الشروط والأحكام المذكورة أعلاه وسيتم إنشاء حسابك
            </p>
          </div>

          <div className="flex gap-4 justify-between pt-6">
            <Button type="button" variant="outline" onClick={onBack} disabled={isLoading}>
              رجوع
            </Button>
            <Button 
              type="submit"
              size="lg"
              className="min-w-[200px]"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                  جارٍ الإرسال...
                </>
              ) : (
                'إرسال الطلب 🚀'
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
