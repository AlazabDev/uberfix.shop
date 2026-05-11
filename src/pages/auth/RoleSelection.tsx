import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Users, Wrench, Cog, ArrowRight } from "lucide-react";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { Footer } from "@/components/landing/Footer";
import { secureGoogleSignIn, secureFacebookSignIn } from "@/lib/secureOAuth";
import { toast } from "sonner";
import { FaFacebook, FaGoogle } from "react-icons/fa";
import { clearPendingOAuthContext, savePendingOAuthContext } from "@/lib/roleRedirect";
import { useState } from "react";
import { Loader2 } from "lucide-react";

/**
 * صفحة اختيار نوع الحساب للمستخدمين الجدد
 *
 * كل بطاقة تحتوي على أزرار OAuth خاصة بها تحفظ الدور المطلوب
 * قبل التحويل إلى Google/Facebook، لمنع loop العودة لصفحة الدخول
 * عند المستخدمين الجدد بدون دور.
 */
export default function RoleSelection() {
  const [loadingRole, setLoadingRole] = useState<string | null>(null);

  const handleOAuth = async (
    provider: "google" | "facebook",
    role: "customer" | "technician" | "vendor",
  ) => {
    setLoadingRole(`${provider}-${role}`);
    try {
      // ✅ نحفظ الدور المطلوب + intent=signup قبل التحويل لـ OAuth
      // عند العودة، resolveUserRedirectAfterAuth سيُنشئ profile بالدور الصحيح
      savePendingOAuthContext("signup", role);
      const result =
        provider === "google"
          ? await secureGoogleSignIn("/auth/callback")
          : await secureFacebookSignIn("/auth/callback");

      if (!result.success) {
        clearPendingOAuthContext();
        toast.error(
          result.error?.message ||
            `فشل التسجيل عبر ${provider === "google" ? "Google" : "Facebook"}`,
        );
        setLoadingRole(null);
      }
      // النجاح: المتصفح سيتحول إلى مزود OAuth → /auth/callback
    } catch {
      clearPendingOAuthContext();
      toast.error("حدث خطأ، حاول مرة أخرى");
      setLoadingRole(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-primary/5 via-background to-primary/10">
      <LandingHeader />

      <div className="flex-1">
        <div className="text-center pt-6 sm:pt-8 pb-4 px-4">
          <div className="flex items-center justify-center gap-2 text-muted-foreground mb-2">
            <Shield className="h-4 w-4 text-primary" />
            <span className="text-sm">اختر نوع حسابك</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground">إنشاء حساب UberFix</h2>
          <p className="text-muted-foreground mt-2 text-sm sm:text-base">
            اختر نوع الحساب المناسب لك، ثم أكمل التسجيل بالطريقة المناسبة.
          </p>
          <p className="text-sm mt-3">
            لديك حساب بالفعل؟{" "}
            <Link to="/login" className="text-primary hover:underline font-medium">
              تسجيل الدخول
            </Link>
          </p>
        </div>

        {/* Role Cards */}
        <div className="container max-w-4xl mx-auto px-4 pb-12">
          <div className="grid md:grid-cols-3 gap-4">
            {/* بطاقة العميل */}
            <Card className="relative overflow-hidden border-2 hover:border-primary/50 transition-all hover:shadow-xl bg-gradient-to-br from-blue-50/50 to-background dark:from-blue-950/20">
              <CardHeader className="text-center pb-3">
                <div className="mx-auto w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-3">
                  <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <CardTitle className="text-xl">عميل</CardTitle>
                <CardDescription className="text-sm leading-6">
                  لطلب خدمات الصيانة ومتابعتها
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <ul className="text-xs text-muted-foreground space-y-1.5 mb-4">
                  <li>• طلب صيانة</li>
                  <li>• متابعة الحالة</li>
                  <li>• تقييم الخدمة</li>
                </ul>
                <Link to="/register?role=customer" className="block">
                  <Button className="w-full h-9 text-xs bg-blue-600 hover:bg-blue-700 text-white">
                    بالبريد الإلكتروني
                    <ArrowRight className="mr-2 h-4 w-4" />
                  </Button>
                </Link>
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs gap-1 border-[#4285F4]/40 hover:bg-[#4285F4]/10"
                    onClick={() => handleOAuth("google", "customer")}
                    disabled={!!loadingRole}
                  >
                    {loadingRole === "google-customer" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <FaGoogle className="h-4 w-4 text-[#4285F4]" />
                    )}
                    Google
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs gap-1 border-[#1877F2]/40 hover:bg-[#1877F2]/10"
                    onClick={() => handleOAuth("facebook", "customer")}
                    disabled={!!loadingRole}
                  >
                    {loadingRole === "facebook-customer" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <FaFacebook className="h-4 w-4 text-[#1877F2]" />
                    )}
                    Facebook
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* بطاقة الفني */}
            <Card className="relative overflow-hidden border-2 hover:border-primary/50 transition-all hover:shadow-xl bg-gradient-to-br from-green-50/50 to-background dark:from-green-950/20">
              <CardHeader className="text-center pb-3">
                <div className="mx-auto w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-3">
                  <Wrench className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <CardTitle className="text-xl">فني</CardTitle>
                <CardDescription className="text-sm leading-6">
                  لاستقبال وتنفيذ طلبات الصيانة
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <ul className="text-xs text-muted-foreground space-y-1.5 mb-4">
                  <li>• استقبال الطلبات</li>
                  <li>• إدارة المواعيد</li>
                  <li>• تتبع الأرباح</li>
                </ul>
                <Link to="/technicians/register" className="block">
                  <Button className="w-full h-9 text-xs bg-green-600 hover:bg-green-700 text-white">
                    التسجيل كفني
                    <ArrowRight className="mr-2 h-4 w-4" />
                  </Button>
                </Link>
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs gap-1 border-[#4285F4]/40 hover:bg-[#4285F4]/10"
                    onClick={() => handleOAuth("google", "technician")}
                    disabled={!!loadingRole}
                  >
                    {loadingRole === "google-technician" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <FaGoogle className="h-4 w-4 text-[#4285F4]" />
                    )}
                    Google
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs gap-1 border-[#1877F2]/40 hover:bg-[#1877F2]/10"
                    onClick={() => handleOAuth("facebook", "technician")}
                    disabled={!!loadingRole}
                  >
                    {loadingRole === "facebook-technician" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <FaFacebook className="h-4 w-4 text-[#1877F2]" />
                    )}
                    Facebook
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* بطاقة الشركة/المورد */}
            <Card className="relative overflow-hidden border-2 hover:border-primary/50 transition-all hover:shadow-xl bg-gradient-to-br from-purple-50/50 to-background dark:from-purple-950/20">
              <CardHeader className="text-center pb-3">
                <div className="mx-auto w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mb-3">
                  <Shield className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <CardTitle className="text-xl">شركة</CardTitle>
                <CardDescription className="text-sm leading-6">
                  لإدارة فرق الصيانة والعقود
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <ul className="text-xs text-muted-foreground space-y-1.5 mb-4">
                  <li>• إدارة الفرق</li>
                  <li>• التقارير</li>
                  <li>• إدارة العقود</li>
                </ul>
                <Link to="/register?type=business" className="block">
                  <Button className="w-full h-9 text-xs bg-purple-600 hover:bg-purple-700 text-white">
                    بالبريد الإلكتروني
                    <ArrowRight className="mr-2 h-4 w-4" />
                  </Button>
                </Link>
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs gap-1 border-[#4285F4]/40 hover:bg-[#4285F4]/10"
                    onClick={() => handleOAuth("google", "vendor")}
                    disabled={!!loadingRole}
                  >
                    {loadingRole === "google-vendor" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <FaGoogle className="h-4 w-4 text-[#4285F4]" />
                    )}
                    Google
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs gap-1 border-[#1877F2]/40 hover:bg-[#1877F2]/10"
                    onClick={() => handleOAuth("facebook", "vendor")}
                    disabled={!!loadingRole}
                  >
                    {loadingRole === "facebook-vendor" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <FaFacebook className="h-4 w-4 text-[#1877F2]" />
                    )}
                    Facebook
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-10">
            <h3 className="text-2xl font-bold text-center mb-8">مزايا النظام</h3>
            <div className="grid md:grid-cols-4 gap-6">
              <Card className="text-center p-4">
                <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <h4 className="font-bold mb-2">الأمان والحماية</h4>
                <p className="text-sm text-muted-foreground">حماية متقدمة لبياناتك</p>
              </Card>
              <Card className="text-center p-4">
                <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <h4 className="font-bold mb-2">تجربة سهلة</h4>
                <p className="text-sm text-muted-foreground">واجهة بسيطة وسهلة الاستخدام</p>
              </Card>
              <Card className="text-center p-4">
                <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <Wrench className="h-6 w-6 text-primary" />
                </div>
                <h4 className="font-bold mb-2">خدمة سريعة</h4>
                <p className="text-sm text-muted-foreground">استجابة فورية لطلباتك</p>
              </Card>
              <Card className="text-center p-4">
                <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <Cog className="h-6 w-6 text-primary" />
                </div>
                <h4 className="font-bold mb-2">تكامل كامل</h4>
                <p className="text-sm text-muted-foreground">ربط جميع الخدمات في مكان واحد</p>
              </Card>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
