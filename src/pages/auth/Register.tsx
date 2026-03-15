import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ArrowRight, Cog } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { FaFacebook } from "react-icons/fa";
import { registerFormSchema } from "@/lib/validationSchemas";
import { secureGoogleSignIn, secureFacebookSignIn } from "@/lib/secureOAuth";
import { useAuth } from "@/contexts/AuthContext";
import { clearPendingOAuthContext, savePendingOAuthContext } from "@/lib/roleRedirect";

type RegisterFormData = z.infer<typeof registerFormSchema>;

export default function Register() {
  const [isLoading, setIsLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const selectedRole = searchParams.get("role") || searchParams.get("type") || "customer";
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isLoading: authLoading } = useAuth();

  // ✅ إذا كان المستخدم مسجل بالفعل - وجهه للداشبورد
  useEffect(() => {
    if (!authLoading && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [authLoading, user, navigate]);

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      full_name: "",
      phone: "",
    },
  });

  const handleRegister = async (data: RegisterFormData) => {
    setIsLoading(true);

    try {
      // يجب استخدام /auth/callback للتعامل مع token_hash و type parameters
      const redirectUrl = `${window.location.origin}/auth/callback`;
      
      const { data: signUpData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            role: selectedRole,
            full_name: data.full_name,
            phone: data.phone,
          }
        }
      });

      if (error) {
        toast({
          title: "خطأ في إنشاء الحساب",
          description: error.message === "User already registered" 
            ? "هذا البريد الإلكتروني مسجل مسبقاً"
            : error.message,
          variant: "destructive",
        });
      } else {
        // تحقق من نوع التسجيل
        if (signUpData?.user && !signUpData.session) {
          toast({
            title: "تم إنشاء الحساب",
            description: "تم إرسال رسالة تأكيد على بريدك الإلكتروني. تحقق من بريدك لتفعيل الحساب.",
          });
        } else {
          toast({
            title: "تم إنشاء الحساب بنجاح",
            description: "مرحباً بك! سيتم تحويلك إلى لوحة التحكم...",
          });
          // إذا كان هناك session مباشرة، انتقل للداشبورد
          setTimeout(() => navigate("/dashboard"), 1500);
          return;
        }
        navigate("/login");
      }
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

  const handleGoogleSignup = async () => {
    setIsLoading(true);
    try {
      savePendingOAuthContext('signup', selectedRole);
      const result = await secureGoogleSignIn('/auth/callback');

      if (!result.success) {
        clearPendingOAuthContext();
        toast({
          title: "خطأ في التسجيل",
          description: result.error?.message || "تعذر التسجيل بجوجل",
          variant: "destructive",
        });
      }
    } catch (error) {
      clearPendingOAuthContext();
      toast({
        title: "حدث خطأ",
        description: "حاول مرة أخرى لاحقاً",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFacebookSignup = async () => {
    setIsLoading(true);
    try {
      savePendingOAuthContext('signup', selectedRole);
      const result = await secureFacebookSignIn('/auth/callback');

      if (!result.success) {
        clearPendingOAuthContext();
        toast({
          title: "خطأ في التسجيل",
          description: result.error?.message || "تعذر التسجيل بفيسبوك",
          variant: "destructive",
        });
      }
    } catch (error) {
      clearPendingOAuthContext();
      toast({
        title: "حدث خطأ",
        description: "حاول مرة أخرى لاحقاً",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
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

        <Card>
          <CardHeader>
            <CardTitle className="text-center">إنشاء حساب جديد</CardTitle>
            <CardDescription className="text-center">
              أنشئ حسابك للبدء في استخدام النظام
            </CardDescription>
          </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleRegister)} className="space-y-4">
              <FormField
                control={form.control}
                name="full_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الاسم الكامل *</FormLabel>
                    <FormControl>
                      <Input placeholder="محمد أحمد" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>البريد الإلكتروني *</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="example@email.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>رقم الهاتف</FormLabel>
                    <FormControl>
                      <Input placeholder="01xxxxxxxxx" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>كلمة المرور *</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
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
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    جاري إنشاء الحساب...
                  </>
                ) : (
                  <>
                    إنشاء حساب
                    <ArrowRight className="mr-2 h-4 w-4" />
                  </>
                )}
              </Button>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">أو</span>
                </div>
              </div>

              <Button 
                type="button" 
                variant="outline" 
                className="w-full" 
                onClick={handleGoogleSignup}
                disabled={isLoading}
              >
                <FcGoogle className="ml-2 h-5 w-5" />
                التسجيل باستخدام Google
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleFacebookSignup}
                disabled={isLoading}
              >
                <FaFacebook className="ml-2 h-5 w-5 text-[#1877F2]" />
                التسجيل باستخدام Facebook
              </Button>
            </form>
          </Form>
            
            <div className="mt-6 text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                لديك حساب بالفعل؟{" "}
                <Link to={`/login?role=${selectedRole}`} className="text-primary hover:underline font-medium">
                  تسجيل الدخول
                </Link>
              </p>
              <p className="text-sm">
                <Link to="/role-selection" className="text-muted-foreground hover:text-primary transition-colors">
                  اختيار نوع حساب آخر
                </Link>
              </p>
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
