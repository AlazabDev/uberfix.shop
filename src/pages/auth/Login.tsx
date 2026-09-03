import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation, useSearchParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ArrowRight, Eye, EyeOff, User, Wrench, Building2, MessageCircle, Mail, ShieldCheck } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { FaFacebook, FaMicrosoft, FaWhatsapp } from "react-icons/fa";
import { resolveUserRedirectAfterAuth, savePendingOAuthContext, clearPendingOAuthContext, type UserRole } from "@/lib/roleRedirect";
import { useAuth } from "@/contexts/AuthContext";
import { BrandLogo } from "@/components/shared/BrandLogo";
import { cn } from "@/lib/utils";
import { detectRegion, normalizePhoneForRegion, maskPhone } from "@/lib/phoneRegion";

/**
 * الوجهة الواحدة للمصادقة (دخول + تسجيل) — UberFix SSO
 *
 * - مزوّدو الهوية: Google / Facebook / Microsoft / WhatsApp OTP / بريد + كلمة مرور.
 * - فئة الحساب (عميل / فني / مورد) تُختار مرة واحدة فقط عند التسجيل الأول وتُحفظ في النظام.
 * - بعد أي مصادقة ناجحة يمرّ الجميع عبر resolveUserRedirectAfterAuth (مصدر واحد للتوجيه).
 */

type Mode = "login" | "signup";
type Panel = "main" | "whatsapp";
type SignupRole = Extract<UserRole, "customer" | "technician" | "vendor">;

const ROLE_OPTIONS: { value: SignupRole; label: string; hint: string; icon: typeof User }[] = [
  { value: "customer", label: "عميل", hint: "أطلب خدمات الصيانة", icon: User },
  { value: "technician", label: "فني", hint: "أنفّذ أعمال الصيانة", icon: Wrench },
  { value: "vendor", label: "مورد", hint: "شركة / فريق خدمات", icon: Building2 },
];

// مفتاح الدولة يُضاف في الخلفية حسب منطقة المستخدم (انظر src/lib/phoneRegion.ts)

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const { toast } = useToast();
  const { user, isLoading: authLoading } = useAuth();

  const mode: Mode = params.get("mode") === "signup" ? "signup" : "login";
  const initialRole = (params.get("role") as SignupRole | null) || null;

  const [panel, setPanel] = useState<Panel>("main");
  const [role, setRole] = useState<SignupRole>(
    initialRole && ROLE_OPTIONS.some((r) => r.value === initialRole) ? initialRole : "customer",
  );
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(false);

  const isSignup = mode === "signup";
  const redirectTo = useMemo(() => `${window.location.origin}/auth/callback`, []);

  const setMode = (m: Mode) => {
    const next = new URLSearchParams(params);
    if (m === "signup") next.set("mode", "signup"); else next.delete("mode");
    setParams(next, { replace: true });
    setPanel("main");
  };

  // مستخدم مسجّل بالفعل → توجيه واحد ذكي
  useEffect(() => {
    if (authLoading || !user || redirecting) return;
    setRedirecting(true);
    const from = (location.state as { from?: string } | null)?.from;
    resolveUserRedirectAfterAuth(user.id, user.email)
      .then((info) => {
        const target = from && !from.startsWith("/login") && !from.startsWith("/register") && !info.isNewUser ? from : info.redirectPath;
        navigate(target, { replace: true });
      })
      .catch(() => navigate("/dashboard", { replace: true }));
  }, [authLoading, user, navigate, location.state, redirecting]);

  const rememberIntent = () => {
    if (isSignup) savePendingOAuthContext("signup", role); else clearPendingOAuthContext();
  };

  // ---------- Email / Password ----------
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy("email");
    try {
      if (isSignup) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectTo,
            data: { full_name: fullName.trim(), requested_role: role },
          },
        });
        if (error) throw error;
        savePendingOAuthContext("signup", role);
        if (!data.session) {
          toast({ title: "تحقق من بريدك", description: "أرسلنا رابط تأكيد إلى بريدك الإلكتروني لإكمال التسجيل." });
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          throw new Error(error.message === "Invalid login credentials" ? "البريد الإلكتروني أو كلمة المرور غير صحيحة" : error.message);
        }
      }
    } catch (err) {
      toast({ title: isSignup ? "تعذر إنشاء الحساب" : "خطأ في تسجيل الدخول", description: (err as Error).message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  // ---------- OAuth ----------
  const oauth = async (provider: "google" | "facebook" | "azure") => {
    setBusy(provider);
    rememberIntent();
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
        ...(provider === "google" ? { queryParams: { access_type: "offline", prompt: "consent" } } : {}),
        ...(provider === "facebook" ? { scopes: "email,public_profile" } : {}),
        ...(provider === "azure" ? { scopes: "email openid profile" } : {}),
      },
    });
    if (error) {
      setBusy(null);
      toast({ title: "تعذر الاتصال بمزوّد الهوية", description: error.message, variant: "destructive" });
    }
  };

  // ---------- WhatsApp OTP ----------
  // الدولة تُكتشف تلقائياً (منطقة زمنية / لغة المتصفح) والمفتاح يُضاف في الخلفية.
  const region = useMemo(() => detectRegion(), []);
  const normalized = useMemo(() => normalizePhoneForRegion(phone, region), [phone, region]);
  const [phoneE164, setPhoneE164] = useState<string | null>(null);

  const sendWhatsappOtp = async () => {
    if (!normalized.valid || !normalized.e164) {
      toast({ title: "رقم غير مكتمل", description: normalized.reason || `مثال: ${region.example}`, variant: "destructive" });
      return;
    }
    setBusy("wa-send");
    rememberIntent();
    const e164 = normalized.e164;
    const { data, error } = await supabase.functions.invoke("send-whatsapp-otp", { body: { phone: e164 } });
    setBusy(null);
    if (error || !data?.success) {
      toast({ title: "تعذر إرسال الرمز", description: error?.message || data?.error || "حاول لاحقاً", variant: "destructive" });
      return;
    }
    setPhoneE164(e164);
    setOtpSent(true);
    toast({ title: "تم إرسال الرمز عبر واتساب", description: "افتح واتساب وأدخل الرمز المكوّن من 6 أرقام" });
  };

  const verifyWhatsappOtp = async () => {
    if (!phoneE164) return;
    setBusy("wa-verify");
    const { data, error } = await supabase.functions.invoke("verify-whatsapp-otp", { body: { phone: phoneE164, code: otp } });
    if (error || !data?.token_hash) {
      setBusy(null);
      toast({ title: "رمز غير صحيح", description: error?.message || data?.error || "الرمز خاطئ أو منتهي", variant: "destructive" });
      return;
    }
    const { error: verifyErr } = await supabase.auth.verifyOtp({ token_hash: data.token_hash, type: "magiclink" });
    setBusy(null);
    if (verifyErr) toast({ title: "فشل بدء الجلسة", description: verifyErr.message, variant: "destructive" });
  };

  if (authLoading || redirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const providerBtn = "h-11 w-full justify-center gap-2 rounded-xl border bg-card text-sm font-semibold shadow-sm hover:bg-muted/60";

  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-b from-muted/60 via-background to-background flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="rounded-3xl border bg-card shadow-[0_20px_60px_-20px_hsl(var(--primary)/0.35)] p-7 sm:p-9">
          {/* Logo */}
          <div className="flex flex-col items-center gap-3 mb-6">
            <BrandLogo variant="full" />
            <p className="text-sm text-muted-foreground text-center">
              {isSignup ? "أنشئ حسابك لتبدأ" : "سجّل الدخول للمتابعة"}
            </p>
          </div>

          {panel === "whatsapp" ? (
            /* ---------------- WhatsApp panel (matches reference #1) ---------------- */
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center gap-2 text-foreground font-bold text-lg">
                <FaWhatsapp className="h-6 w-6 text-[hsl(142,70%,40%)]" />
                <span>{isSignup ? "التسجيل عبر واتساب" : "تسجيل الدخول عبر واتساب"}</span>
              </div>

              {isSignup && <RolePicker value={role} onChange={setRole} />}

              {!otpSent ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="wa-phone">رقم الهاتف</Label>
                    <div className="flex gap-2" dir="ltr">
                      <div className="flex items-center gap-1 rounded-xl border bg-muted px-3 text-sm font-semibold text-muted-foreground select-none">
                        <span>🇪🇬</span><span>+20</span>
                      </div>
                      <Input
                        id="wa-phone"
                        inputMode="tel"
                        placeholder="1012345678"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="h-11 rounded-xl text-left"
                        autoFocus
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">سنرسل رمز تحقق مكوّن من 6 أرقام إلى واتساب على هذا الرقم.</p>
                  </div>
                  <Button
                    type="button"
                    onClick={sendWhatsappOtp}
                    disabled={busy !== null}
                    className="h-11 w-full rounded-xl bg-[hsl(142,70%,40%)] text-[hsl(0,0%,100%)] hover:bg-[hsl(142,70%,35%)] font-bold gap-2"
                  >
                    {busy === "wa-send" ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
                    إرسال رمز التحقق
                  </Button>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="wa-otp">رمز التحقق</Label>
                    <Input
                      id="wa-otp"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="• • • • • •"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                      className="h-12 rounded-xl text-center text-2xl tracking-[0.5em] font-mono"
                      autoFocus
                    />
                    <p className="text-xs text-muted-foreground">أُرسل إلى {normalizePhone(phone)} — صالح لمدة 10 دقائق.</p>
                  </div>
                  <Button
                    type="button"
                    onClick={verifyWhatsappOtp}
                    disabled={busy !== null || otp.length !== 6}
                    className="h-11 w-full rounded-xl bg-[hsl(142,70%,40%)] text-[hsl(0,0%,100%)] hover:bg-[hsl(142,70%,35%)] font-bold gap-2"
                  >
                    {busy === "wa-verify" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                    تأكيد الرمز
                  </Button>
                  <button type="button" onClick={() => { setOtpSent(false); setOtp(""); }} className="w-full text-xs text-muted-foreground hover:text-primary">
                    تغيير الرقم أو إعادة الإرسال
                  </button>
                </>
              )}

              <Divider label="أو" />

              <Button type="button" variant="outline" className={providerBtn} onClick={() => setPanel("main")}>
                <Mail className="h-4 w-4" />
                {isSignup ? "التسجيل بالبريد الإلكتروني" : "تسجيل الدخول بالبريد الإلكتروني"}
              </Button>
            </div>
          ) : (
            /* ---------------- Main SSO panel (matches reference #2) ---------------- */
            <div className="space-y-4 animate-in fade-in">
              {isSignup && <RolePicker value={role} onChange={setRole} />}

              <div className="grid grid-cols-2 gap-2.5">
                <Button type="button" variant="outline" className={providerBtn} disabled={busy !== null} onClick={() => oauth("google")}>
                  {busy === "google" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FcGoogle className="h-5 w-5" />} Google
                </Button>
                <Button type="button" variant="outline" className={providerBtn} disabled={busy !== null} onClick={() => oauth("facebook")}>
                  {busy === "facebook" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FaFacebook className="h-5 w-5 text-[hsl(221,44%,41%)]" />} Facebook
                </Button>
                <Button type="button" variant="outline" className={providerBtn} disabled={busy !== null} onClick={() => oauth("azure")}>
                  {busy === "azure" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FaMicrosoft className="h-4 w-4 text-[hsl(199,100%,40%)]" />} Microsoft
                </Button>
                <Button type="button" variant="outline" className={providerBtn} disabled={busy !== null} onClick={() => { setPanel("whatsapp"); setOtpSent(false); }}>
                  <FaWhatsapp className="h-5 w-5 text-[hsl(142,70%,40%)]" /> WhatsApp
                </Button>
              </div>

              <Divider label={isSignup ? "أو بالبريد الإلكتروني" : "أو"} />

              <form onSubmit={handleEmailSubmit} className="space-y-3.5">
                {isSignup && (
                  <div className="space-y-1.5">
                    <Label htmlFor="name">الاسم الكامل</Label>
                    <Input id="name" required minLength={2} maxLength={120} value={fullName} onChange={(e) => setFullName(e.target.value)} className="h-11 rounded-xl" placeholder="الاسم كما سيظهر في النظام" />
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="email">البريد الإلكتروني</Label>
                  <Input id="email" type="email" required autoComplete="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} className="h-11 rounded-xl" placeholder="name@example.com" />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">كلمة المرور</Label>
                    {!isSignup && (
                      <Link to="/forgot-password" className="text-xs text-primary hover:underline">نسيت كلمة المرور؟</Link>
                    )}
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={isSignup ? 8 : 6}
                      autoComplete={isSignup ? "new-password" : "current-password"}
                      dir="ltr"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-11 rounded-xl pr-10"
                      placeholder={isSignup ? "8 أحرف على الأقل" : "••••••••"}
                    />
                    <button type="button" onClick={() => setShowPassword((s) => !s)} className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-foreground" aria-label="إظهار كلمة المرور">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {!isSignup && (
                  <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
                    <Checkbox checked={remember} onCheckedChange={(v) => setRemember(Boolean(v))} />
                    تذكرني على هذا الجهاز
                  </label>
                )}

                <Button type="submit" disabled={busy !== null} className="h-11 w-full rounded-xl bg-[#030957] text-[#FFB900] hover:bg-[#030957]/90 font-bold text-base gap-2">
                  {busy === "email" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4 rotate-180" />}
                  {isSignup ? "إنشاء الحساب" : "تسجيل الدخول"}
                </Button>
              </form>

              {isSignup && (
                <p className="text-[11px] leading-relaxed text-muted-foreground text-center">
                  بإنشاء الحساب فإنك توافق على{" "}
                  <Link to="/terms" className="underline hover:text-primary">الشروط</Link> و{" "}
                  <Link to="/privacy" className="underline hover:text-primary">سياسة الخصوصية</Link>.
                </p>
              )}
            </div>
          )}

          {/* Toggle */}
          <p className="mt-6 text-center text-sm text-muted-foreground">
            {isSignup ? "لديك حساب بالفعل؟ " : "ليس لديك حساب؟ "}
            <button type="button" onClick={() => setMode(isSignup ? "login" : "signup")} className="font-bold text-primary hover:underline">
              {isSignup ? "تسجيل الدخول" : "إنشاء حساب جديد"}
            </button>
          </p>
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          <Link to="/" className="hover:text-primary">العودة للصفحة الرئيسية</Link>
        </p>
      </div>
    </div>
  );
}

function Divider({ label }: { label: string }) {
  return (
    <div className="relative py-1">
      <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
      <div className="relative flex justify-center text-xs"><span className="bg-card px-3 text-muted-foreground">{label}</span></div>
    </div>
  );
}

/** اختيار فئة الحساب — يظهر فقط في وضع التسجيل (يُحفظ مرة واحدة) */
export function RolePicker({ value, onChange }: { value: SignupRole; onChange: (r: SignupRole) => void }) {
  return (
    <div className="space-y-2">
      <Label>نوع الحساب <span className="text-muted-foreground font-normal text-xs">(يُحدد مرة واحدة)</span></Label>
      <div role="radiogroup" className="grid grid-cols-3 gap-2">
        {ROLE_OPTIONS.map(({ value: v, label, hint, icon: Icon }) => {
          const active = v === value;
          return (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(v)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-xl border p-3 text-center transition-all",
                active ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary" : "hover:border-primary/40 hover:bg-muted/40",
              )}
            >
              <Icon className={cn("h-5 w-5", active ? "text-primary" : "text-muted-foreground")} />
              <span className="text-sm font-bold">{label}</span>
              <span className="text-[10px] leading-tight text-muted-foreground">{hint}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
