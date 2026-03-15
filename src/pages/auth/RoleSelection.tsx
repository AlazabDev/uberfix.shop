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

/**
 * صفحة اختيار نوع الحساب للمستخدمين الجدد
 */
export default function RoleSelection() {
  const handleGoogleLogin = async () => {
    savePendingOAuthContext('signup');
    const result = await secureGoogleSignIn();
    if (!result.success) {
      clearPendingOAuthContext();
      toast.error(result.error?.message || "فشل تسجيل الدخول بـ Google");
    }
  };

  const handleFacebookLogin = async () => {
    savePendingOAuthContext('signup');
    const result = await secureFacebookSignIn();
    if (!result.success) {
      clearPendingOAuthContext();
      toast.error(result.error?.message || "فشل تسجيل الدخول بـ Facebook");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-primary/5 via-background to-primary/10">
      <LandingHeader />

      <div className="flex-1">
        <div className="text-center pt-8 sm:pt-12 pb-6 sm:pb-8 px-4">
          <div className="flex items-center justify-center gap-2 text-muted-foreground mb-2">
            <Shield className="h-4 w-4 text-primary" />
            <span className="text-sm">اختر نوع حسابك</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground">مرحباً بك في UberFix</h2>
          <p className="text-muted-foreground mt-2 text-sm sm:text-base">يرجى اختيار نوع الحساب المناسب لك</p>
        </div>

        {/* Login Section */}
        <div className="container max-w-4xl mx-auto px-4 pb-6">
          <Card className="p-6 bg-gradient-to-r from-muted/50 to-background border-2 border-dashed">
            <div className="text-center space-y-4">
              <p className="text-muted-foreground">
                لديك حساب بالفعل؟{" "}
                <Link to="/login" className="text-primary hover:underline font-medium">
                  تسجيل الدخول
                </Link>
              </p>
              
              <div className="flex items-center gap-4 justify-center">
                <div className="h-px bg-border flex-1 max-w-20" />
                <span className="text-sm text-muted-foreground">أو سجل دخولك عبر</span>
                <div className="h-px bg-border flex-1 max-w-20" />
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto">
                <Button
                  variant="outline"
                  className="flex-1 gap-2 h-11 border-[#4285F4] text-[#4285F4] hover:bg-[#4285F4] hover:text-white transition-colors"
                  onClick={handleGoogleLogin}
                >
                  <FaGoogle className="h-5 w-5" />
                  Google
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 gap-2 h-11 border-[#1877F2] text-[#1877F2] hover:bg-[#1877F2] hover:text-white transition-colors"
                  onClick={handleFacebookLogin}
                >
                  <FaFacebook className="h-5 w-5" />
                  Facebook
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Role Cards */}
        <div className="container max-w-4xl mx-auto px-4 pb-16">
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="relative overflow-hidden border-2 hover:border-primary/50 transition-all hover:shadow-xl bg-gradient-to-br from-blue-50/50 to-background dark:from-blue-950/20">
              <CardHeader className="text-center pb-4">
                <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-4">
                  <Users className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
                <CardTitle className="text-2xl">عميل</CardTitle>
                <CardDescription className="text-base">
                  للعملاء الذين يريدون طلب خدمات الصيانة
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <ul className="text-sm text-muted-foreground space-y-2 mb-6">
                  <li>• طلب خدمات الصيانة</li>
                  <li>• تتبع حالة الطلبات</li>
                  <li>• تقييم الخدمات</li>
                </ul>
                <Link to="/register?role=customer" className="block">
                  <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                    التسجيل كعميل
                    <ArrowRight className="mr-2 h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden border-2 hover:border-primary/50 transition-all hover:shadow-xl bg-gradient-to-br from-green-50/50 to-background dark:from-green-950/20">
              <CardHeader className="text-center pb-4">
                <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
                  <Wrench className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
                <CardTitle className="text-2xl">فني</CardTitle>
                <CardDescription className="text-base">
                  للفنيين الذين يقدمون خدمات الصيانة
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <ul className="text-sm text-muted-foreground space-y-2 mb-6">
                  <li>• استقبال طلبات العمل</li>
                  <li>• إدارة المواعيد</li>
                  <li>• تتبع الأرباح</li>
                </ul>
                <Link to="/technicians/register" className="block">
                  <Button className="w-full bg-green-600 hover:bg-green-700 text-white">
                    التسجيل كفني
                    <ArrowRight className="mr-2 h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden border-2 hover:border-primary/50 transition-all hover:shadow-xl bg-gradient-to-br from-purple-50/50 to-background dark:from-purple-950/20">
              <CardHeader className="text-center pb-4">
                <div className="mx-auto w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mb-4">
                  <Shield className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                </div>
                <CardTitle className="text-2xl">شركة</CardTitle>
                <CardDescription className="text-base">
                  للشركات التي تدير عمليات الصيانة
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <ul className="text-sm text-muted-foreground space-y-2 mb-6">
                  <li>• إدارة الموظفين والفنيين</li>
                  <li>• التقارير والتحليلات</li>
                  <li>• إدارة العقود</li>
                </ul>
                <Link to="/register?type=business" className="block">
                  <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white">
                    التسجيل كشركة
                    <ArrowRight className="mr-2 h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          <div className="mt-16">
            <h3 className="text-2xl font-bold text-center mb-8">مزايا النظام</h3>
            <div className="grid md:grid-cols-4 gap-6">
              <Card className="text-center p-6">
                <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <h4 className="font-bold mb-2">الأمان والحماية</h4>
                <p className="text-sm text-muted-foreground">حماية متقدمة لبياناتك</p>
              </Card>
              <Card className="text-center p-6">
                <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <h4 className="font-bold mb-2">تجربة سهلة</h4>
                <p className="text-sm text-muted-foreground">واجهة بسيطة وسهلة الاستخدام</p>
              </Card>
              <Card className="text-center p-6">
                <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <Wrench className="h-6 w-6 text-primary" />
                </div>
                <h4 className="font-bold mb-2">خدمة سريعة</h4>
                <p className="text-sm text-muted-foreground">استجابة فورية لطلباتك</p>
              </Card>
              <Card className="text-center p-6">
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
