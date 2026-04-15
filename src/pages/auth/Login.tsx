import { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ArrowRight, Cog, Shield, MessageCircle } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { FaFacebook } from "react-icons/fa";
import { PhoneOTPLogin } from "@/components/auth/PhoneOTPLogin";
import { secureGoogleSignIn, secureFacebookSignIn } from "@/lib/secureOAuth";
import { clearPendingOAuthContext, resolveUserRedirectAfterAuth, savePendingOAuthContext } from "@/lib/roleRedirect";
import { useAuth } from "@/contexts/AuthContext";

/**
 * صفحة تسجيل الدخول الموحدة
 * 
 * التدفق:
 * 1. Email/Password → signInWithPassword → onAuthStateChange يحدث AuthContext → useEffect يعيد التوجيه
 * 2. Google → secureGoogleSignIn → redirect to /auth/callback → AuthCallback يتولى
 * 3. Facebook → secureFacebookSignIn (via Supabase OAuth) → redirect to /auth/callback → AuthCallback يتولى
 */
export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loginMethod, setLoginMethod] = useState<"email" | "phone">("email");
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user, isLoading: authLoading } = useAuth();

  // عند تغير حالة المصادقة (المستخدم أصبح مسجل) → توجيه ذكي
  useEffect(() => {
    if (authLoading || !user) return;

    const from = (location.state as any)?.from;
    if (from && from !== '/login' && from !== '/register') {
      navigate(from, { replace: true });
      return;
    }

    // اكتشاف الدور والتوجيه
    resolveUserRedirectAfterAuth(user.id, user.email).then(roleInfo => {
      navigate(roleInfo.redirectPath, { replace: true });
    }).catch(() => {
      navigate('/dashboard', { replace: true });
    });
  }, [authLoading, user, navigate, location.state]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        toast({
          title: "خطأ في تسجيل الدخول",
          description: error.message === "Invalid login credentials" 
            ? "البريد الإلكتروني أو كلمة المرور غير صحيحة"
            : error.message,
          variant: "destructive",
        });
      }
      // Success: onAuthStateChange → AuthContext updates → useEffect above redirects
    } catch (error) {
      toast({
        title: "حدث خطأ",
        description: "حاول مرة أخرى لاحقاً",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      savePendingOAuthContext('login');
      const result = await secureGoogleSignIn('/auth/callback');
      if (!result.success) {
        clearPendingOAuthContext();
        toast({
          title: "خطأ في تسجيل الدخول",
          description: result.error?.message || "تعذر تسجيل الدخول بجوجل",
          variant: "destructive",
        });
        setIsLoading(false);
      }
      // Success: browser redirects to Google → callback → AuthCallback handles it
    } catch (error) {
      clearPendingOAuthContext();
      toast({
        title: "حدث خطأ",
        description: "حاول مرة أخرى لاحقاً",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  const handleFacebookLogin = async () => {
    setIsLoading(true);
    try {
      savePendingOAuthContext('login');
      const result = await secureFacebookSignIn('/auth/callback');
      if (!result.success) {
        clearPendingOAuthContext();
        toast({
          title: "خطأ في تسجيل الدخول",
          description: result.error?.message || "تعذر تسجيل الدخول بفيسبوك",
          variant: "destructive",
        });
        setIsLoading(false);
      }
      // Success: browser redirects to Facebook → callback → AuthCallback handles it
    } catch (error) {
      clearPendingOAuthContext();
      toast({
        title: "حدث خطأ",
        description: "حاول مرة أخرى لاحقاً",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="relative w-16 h-16 bg-gradient-primary rounded-xl flex items-center justify-center shadow-lg">
              <div className="relative">
                <span className="text-primary-foreground font-bold text-2xl">A</span>
                <Cog className="absolute -top-1 -right-1 h-4 w-4 text-primary-foreground/80 animate-spin" style={{ animationDuration: '8s' }} />
              </div>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-primary tracking-tight">UberFix.shop</h1>
          <p className="text-muted-foreground mt-2">نظام إدارة طلبات الصيانة المتطور</p>
        </div>

        {/* Login Card */}
        <Card className="bg-gradient-to-br from-primary/5 to-background border-2">
          <CardHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <Shield className="h-8 w-8 text-primary" />
              </div>
            </div>
            <CardTitle className="text-center text-2xl">تسجيل الدخول</CardTitle>
            <CardDescription className="text-center">
              سجل دخولك للوصول إلى حسابك
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loginMethod === "phone" ? (
              <PhoneOTPLogin onBack={() => setLoginMethod("email")} />
            ) : (
              <>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">البريد الإلكتروني</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="example@email.com"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">كلمة المرور</Label>
                      <Link 
                        to="/forgot-password" 
                        className="text-xs text-primary hover:underline"
                      >
                        نسيت كلمة المرور؟
                      </Link>
                    </div>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        جاري تسجيل الدخول...
                      </>
                    ) : (
                      <>
                        تسجيل الدخول
                        <ArrowRight className="mr-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </form>
                
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">أو</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="w-full" 
                    onClick={handleGoogleLogin}
                    disabled={isLoading}
                  >
                    <FcGoogle className="ml-2 h-5 w-5" />
                    تسجيل الدخول باستخدام Google
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={handleFacebookLogin}
                    disabled={isLoading}
                  >
                    <FaFacebook className="ml-2 h-5 w-5 text-[#1877F2]" />
                    تسجيل الدخول باستخدام Facebook
                  </Button>

                  <Button 
                    type="button" 
                    variant="outline" 
                    className="w-full" 
                    onClick={() => setLoginMethod("phone")}
                    disabled={isLoading}
                  >
                    <Phone className="ml-2 h-5 w-5" />
                    تسجيل الدخول برقم الهاتف
                  </Button>
                </div>
              </>
            )}
            
            <div className="mt-6 text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                ليس لديك حساب؟{" "}
                <Link to="/register" className="text-primary hover:underline font-medium">
                  إنشاء حساب جديد
                </Link>
              </p>
              
              <div className="pt-2 border-t">
                <Button
                  type="button"
                  variant="ghost"
                  className="text-sm text-muted-foreground hover:text-primary"
                  onClick={() => navigate("/technicians/register")}
                >
                  هل أنت فني؟ سجل هنا
                  <ArrowRight className="mr-2 h-4 w-4" />
                </Button>
              </div>
              
              <p className="text-sm">
                <Link to="/" className="text-muted-foreground hover:text-primary transition-colors">
                  العودة للصفحة الرئيسية
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
