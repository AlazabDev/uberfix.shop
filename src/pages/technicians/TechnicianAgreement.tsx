import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {  supabase, supabaseLegacy } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileCheck, Loader2 } from "lucide-react";

export default function TechnicianAgreement() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [technicianId, setTechnicianId] = useState<string | null>(null);
  const [policies, setPolicies] = useState({
    quality: false,
    conduct: false,
    pricing: false,
    customerRespect: false,
    punctuality: false,
  });

  useEffect(() => {
    checkVerificationStatus();
  }, []);

  const checkVerificationStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabaseLegacy.from("technician_profiles")
        .select("id, status")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!profile) {
        navigate("/technicians/registration/wizard");
        return;
      }

      setTechnicianId(profile.id);

      // Check verification status
      const { data: verification } = await supabaseLegacy.from("technician_verifications")
        .select("verification_status")
        .eq("technician_id", profile.id)
        .maybeSingle();

      if (!verification || verification.verification_status !== "verified") {
        toast({
          title: "تنبيه",
          description: "يجب التحقق من هويتك أولاً",
          variant: "destructive",
        });
        navigate("/technicians/verification");
        return;
      }

      // Check if already signed
      const { data: existingAgreement } = await supabaseLegacy.from("technician_agreements")
        .select("signed_at")
        .eq("technician_id", profile.id)
        .maybeSingle();

      if (existingAgreement && existingAgreement.signed_at) {
        navigate("/technicians/training");
      }
    } catch (error) {
      console.error("Error checking verification:", error);
    }
  };

  const allPoliciesAccepted = Object.values(policies).every(Boolean);

  const handleSubmit = async () => {
    if (!allPoliciesAccepted) {
      toast({
        title: "خطأ",
        description: "يجب الموافقة على جميع السياسات",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabaseLegacy.from("technician_agreements")
        .insert({
          technician_id: technicianId!,
          quality_policy_accepted: policies.quality,
          conduct_policy_accepted: policies.conduct,
          pricing_policy_accepted: policies.pricing,
          customer_respect_policy_accepted: policies.customerRespect,
          punctuality_policy_accepted: policies.punctuality,
          signed_at: new Date().toISOString(),
        });

      if (error) throw error;

      // Update profile status
      await supabaseLegacy.from("technician_profiles")
        .update({ status: "approved" })
        .eq("id", technicianId!);

      toast({
        title: "تم التوقيع بنجاح",
        description: "مرحباً بك في فريق UberFix. يمكنك الآن البدء في التدريب",
      });

      navigate("/technicians/training");
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <Card className="border-2">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-primary rounded-full flex items-center justify-center mb-4">
              <FileCheck className="w-8 h-8 text-primary-foreground" />
            </div>
            <CardTitle className="text-3xl">اتفاقية العمل</CardTitle>
            <CardDescription className="text-lg">
              يرجى قراءة الاتفاقية بعناية والموافقة على جميع البنود
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Quality Policy */}
            <Card className="border">
              <CardHeader>
                <CardTitle className="text-xl">1. سياسة الجودة</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-40 mb-4">
                  <div className="space-y-2 text-sm text-muted-foreground pr-4">
                    <p>• الالتزام بأعلى معايير الجودة في تنفيذ جميع الأعمال</p>
                    <p>• استخدام مواد وأدوات مناسبة وآمنة</p>
                    <p>• ضمان العمل لمدة لا تقل عن 30 يوماً</p>
                    <p>• إعادة الإصلاح مجاناً في حالة وجود عيوب بالعمل</p>
                    <p>• الحفاظ على نظافة موقع العمل</p>
                  </div>
                </ScrollArea>
                <div className="flex items-center space-x-2 space-x-reverse">
                  <Checkbox
                    id="quality"
                    checked={policies.quality}
                    onCheckedChange={(checked) =>
                      setPolicies({ ...policies, quality: checked as boolean })
                    }
                  />
                  <label htmlFor="quality" className="text-sm font-medium cursor-pointer">
                    أوافق على سياسة الجودة
                  </label>
                </div>
              </CardContent>
            </Card>

            {/* Conduct Policy */}
            <Card className="border">
              <CardHeader>
                <CardTitle className="text-xl">2. سياسة السلوك</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-40 mb-4">
                  <div className="space-y-2 text-sm text-muted-foreground pr-4">
                    <p>• التعامل بأخلاق مهنية عالية مع جميع العملاء</p>
                    <p>• احترام خصوصية العملاء وممتلكاتهم</p>
                    <p>• الالتزام بالزي الرسمي والمظهر اللائق</p>
                    <p>• عدم التدخين أو استخدام الهاتف الشخصي أثناء العمل</p>
                    <p>• الحفاظ على سرية معلومات العملاء</p>
                  </div>
                </ScrollArea>
                <div className="flex items-center space-x-2 space-x-reverse">
                  <Checkbox
                    id="conduct"
                    checked={policies.conduct}
                    onCheckedChange={(checked) =>
                      setPolicies({ ...policies, conduct: checked as boolean })
                    }
                  />
                  <label htmlFor="conduct" className="text-sm font-medium cursor-pointer">
                    أوافق على سياسة السلوك
                  </label>
                </div>
              </CardContent>
            </Card>

            {/* Pricing Policy */}
            <Card className="border">
              <CardHeader>
                <CardTitle className="text-xl">3. سياسة الأسعار</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-40 mb-4">
                  <div className="space-y-2 text-sm text-muted-foreground pr-4">
                    <p>• الالتزام بالأسعار المحددة من قبل UberFix</p>
                    <p>• عدم طلب أي مبالغ إضافية من العميل مباشرة</p>
                    <p>• توضيح جميع التكاليف قبل البدء بالعمل</p>
                    <p>• عدم قبول أي دفعات نقدية من العميل</p>
                    <p>• الالتزام بنظام الدفع الإلكتروني عبر التطبيق</p>
                  </div>
                </ScrollArea>
                <div className="flex items-center space-x-2 space-x-reverse">
                  <Checkbox
                    id="pricing"
                    checked={policies.pricing}
                    onCheckedChange={(checked) =>
                      setPolicies({ ...policies, pricing: checked as boolean })
                    }
                  />
                  <label htmlFor="pricing" className="text-sm font-medium cursor-pointer">
                    أوافق على سياسة الأسعار
                  </label>
                </div>
              </CardContent>
            </Card>

            {/* Customer Respect Policy */}
            <Card className="border">
              <CardHeader>
                <CardTitle className="text-xl">4. سياسة احترام العملاء</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-40 mb-4">
                  <div className="space-y-2 text-sm text-muted-foreground pr-4">
                    <p>• الرد على جميع استفسارات العميل بوضوح وصدق</p>
                    <p>• عدم رفع الصوت أو استخدام ألفاظ غير لائقة</p>
                    <p>• الاستماع لملاحظات العميل وتنفيذها في حدود المعقول</p>
                    <p>• احترام قرارات العميل حتى لو كانت مخالفة لرأيك</p>
                    <p>• تقديم شرح مفصل للعمل المنجز</p>
                  </div>
                </ScrollArea>
                <div className="flex items-center space-x-2 space-x-reverse">
                  <Checkbox
                    id="customerRespect"
                    checked={policies.customerRespect}
                    onCheckedChange={(checked) =>
                      setPolicies({ ...policies, customerRespect: checked as boolean })
                    }
                  />
                  <label htmlFor="customerRespect" className="text-sm font-medium cursor-pointer">
                    أوافق على سياسة احترام العملاء
                  </label>
                </div>
              </CardContent>
            </Card>

            {/* Punctuality Policy */}
            <Card className="border">
              <CardHeader>
                <CardTitle className="text-xl">5. سياسة الالتزام بالمواعيد</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-40 mb-4">
                  <div className="space-y-2 text-sm text-muted-foreground pr-4">
                    <p>• الحضور في الوقت المحدد (أو قبله بـ 5-10 دقائق)</p>
                    <p>• إخطار العميل في حالة التأخر لأي سبب طارئ</p>
                    <p>• إنهاء العمل في الوقت المتفق عليه</p>
                    <p>• عدم إلغاء المواعيد إلا لأسباب قوية</p>
                    <p>• الالتزام بجدول العمل الأسبوعي</p>
                  </div>
                </ScrollArea>
                <div className="flex items-center space-x-2 space-x-reverse">
                  <Checkbox
                    id="punctuality"
                    checked={policies.punctuality}
                    onCheckedChange={(checked) =>
                      setPolicies({ ...policies, punctuality: checked as boolean })
                    }
                  />
                  <label htmlFor="punctuality" className="text-sm font-medium cursor-pointer">
                    أوافق على سياسة الالتزام بالمواعيد
                  </label>
                </div>
              </CardContent>
            </Card>

            <Button
              onClick={handleSubmit}
              className="w-full"
              size="lg"
              disabled={loading || !allPoliciesAccepted}
            >
              {loading ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  جاري التوقيع...
                </>
              ) : (
                "التوقيع على الاتفاقية"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
