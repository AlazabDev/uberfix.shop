import { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ArrowRight, Cog, Shield, Mail, Phone, MessageCircle } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { FaFacebook, FaMicrosoft } from "react-icons/fa";
import { resolveUserRedirectAfterAuth } from "@/lib/roleRedirect";
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
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState<false | 'sms' | 'whatsapp'>(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user, isLoading: authLoading } = useAuth();
  const redirectTo = `${window.location.origin}/auth/callback`;

  // عند تغير حالة المصادقة (المستخدم أصبح مسجل) → توجيه ذكي
  useEffect(() => {
    if (authLoading || !user) return;

    const from = (location.state as any)?.from;
    if (from && from !== '/login' && from !== '/register') {
      navigate(from, { replace: true });
      return;
    }

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
    } catch {
      toast({ title: "حدث خطأ", description: "حاول مرة أخرى لاحقاً", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const oauthSignIn = async (provider: 'google' | 'facebook' | 'azure') => {
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
        ...(provider === 'google' ? { queryParams: { access_type: 'offline', prompt: 'consent' } } : {}),
        ...(provider === 'facebook' ? { scopes: 'email,public_profile' } : {}),
        ...(provider === 'azure' ? { scopes: 'email openid profile' } : {}),
      },
    });
    if (error) {
      setIsLoading(false);
      toast({ title: "خطأ في تسجيل الدخول", description: error.message, variant: "destructive" });
    }
  };

  const normalizePhone = (raw: string) => {
    const trimmed = raw.trim().replace(/\s|-/g, '');
    if (trimmed.startsWith('+')) return trimmed;
    if (trimmed.startsWith('00')) return '+' + trimmed.slice(2);
    if (trimmed.startsWith('0')) return '+20' + trimmed.slice(1);
    return '+' + trimmed;
  };

  const handleSendSmsOtp = async () => {
    if (!phone) return;
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ phone: normalizePhone(phone) });
    setIsLoading(false);
    if (error) {
      toast({ title: "تعذر إرسال الرمز", description: error.message, variant: "destructive" });
    } else {
      setOtpSent('sms');
      toast({ title: "تم إرسال الرمز", description: "تحقق من رسالة SMS" });
    }
  };

  const handleVerifySmsOtp = async () => {
    setIsLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      phone: normalizePhone(phone),
      token: otp,
      type: 'sms',
    });
    setIsLoading(false);
    if (error) {
      toast({ title: "رمز غير صحيح", description: error.message, variant: "destructive" });
    }
  };

  const handleSendWhatsappOtp = async () => {
    if (!phone) return;
    setIsLoading(true);
    const { data, error } = await supabase.functions.invoke('send-whatsapp-otp', {
      body: { phone: normalizePhone(phone) },
    });
    setIsLoading(false);
    if (error || !data?.success) {
      toast({ title: "تعذر إرسال الرمز", description: error?.message || data?.error || "حاول لاحقاً", variant: "destructive" });
    } else {
      setOtpSent('whatsapp');
      toast({ title: "تم إرسال الرمز عبر واتساب", description: "افتح واتساب لعرض الرمز" });
    }
  };

  const handleVerifyWhatsappOtp = async () => {
    setIsLoading(true);
    const { data, error } = await supabase.functions.invoke('verify-whatsapp-otp', {
      body: { phone: normalizePhone(phone), code: otp },
    });
    if (error || !data?.session) {
      setIsLoading(false);
      toast({ title: "رمز غير صحيح", description: error?.message || data?.error || "الرمز خاطئ أو منتهي", variant: "destructive" });
      return;
    }
    const { error: setErr } = await supabase.auth.setSession({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    });
    setIsLoading(false);
    if (setErr) {
      toast({ title: "فشل بدء الجلسة", description: setErr.message, variant: "destructive" });
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
            <Tabs defaultValue="email" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-4">
                <TabsTrigger value="email"><Mail className="h-4 w-4 ml-1" /> بريد</TabsTrigger>
                <TabsTrigger value="phone"><Phone className="h-4 w-4 ml-1" /> هاتف</TabsTrigger>
                <TabsTrigger value="whatsapp"><MessageCircle className="h-4 w-4 ml-1 text-[#25D366]" /> واتساب</TabsTrigger>
              </TabsList>

              <TabsContent value="email">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">البريد الإلكتروني</Label>
                    <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="example@email.com" required />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">كلمة المرور</Label>
                      <Link to="/forgot-password" className="text-xs text-primary hover:underline">نسيت كلمة المرور؟</Link>
                    </div>
                    <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> جاري تسجيل الدخول...</> : <>تسجيل الدخول <ArrowRight className="mr-2 h-4 w-4" /></>}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="phone">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone-sms">رقم الهاتف</Label>
                    <Input id="phone-sms" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01234567890" dir="ltr" />
                  </div>
                  {otpSent === 'sms' && (
                    <div className="space-y-2">
                      <Label htmlFor="otp-sms">رمز التحقق</Label>
                      <Input id="otp-sms" inputMode="numeric" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="123456" dir="ltr" />
                    </div>
                  )}
                  {otpSent === 'sms' ? (
                    <Button onClick={handleVerifySmsOtp} className="w-full" disabled={isLoading || otp.length < 4}>
                      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'تأكيد الرمز'}
                    </Button>
                  ) : (
                    <Button onClick={handleSendSmsOtp} className="w-full" disabled={isLoading || !phone}>
                      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'إرسال رمز SMS (Twilio Verify)'}
                    </Button>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="whatsapp">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone-wa">رقم واتساب</Label>
                    <Input id="phone-wa" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01234567890" dir="ltr" />
                  </div>
                  {otpSent === 'whatsapp' && (
                    <div className="space-y-2">
                      <Label htmlFor="otp-wa">رمز التحقق</Label>
                      <Input id="otp-wa" inputMode="numeric" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="123456" dir="ltr" />
                    </div>
                  )}
                  {otpSent === 'whatsapp' ? (
                    <Button onClick={handleVerifyWhatsappOtp} className="w-full bg-[#25D366] hover:bg-[#20b859]" disabled={isLoading || otp.length < 4}>
                      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'تأكيد الرمز'}
                    </Button>
                  ) : (
                    <Button onClick={handleSendWhatsappOtp} className="w-full bg-[#25D366] hover:bg-[#20b859]" disabled={isLoading || !phone}>
                      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'إرسال رمز عبر واتساب'}
                    </Button>
                  )}
                </div>
              </TabsContent>
            </Tabs>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">أو تسجيل الدخول عبر</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Button type="button" variant="outline" onClick={() => oauthSignIn('google')} disabled={isLoading} title="Google">
                <FcGoogle className="h-5 w-5" />
              </Button>
              <Button type="button" variant="outline" onClick={() => oauthSignIn('facebook')} disabled={isLoading} title="Facebook">
                <FaFacebook className="h-5 w-5 text-[#1877F2]" />
              </Button>
              <Button type="button" variant="outline" onClick={() => oauthSignIn('azure')} disabled={isLoading} title="Microsoft / Azure">
                <FaMicrosoft className="h-5 w-5 text-[#0078D4]" />
              </Button>
            </div>
            
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
