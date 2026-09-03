import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { resolveUserRedirectAfterAuth, completeFirstTimeOnboarding, type UserRole } from "@/lib/roleRedirect";
import { BrandLogo } from "@/components/shared/BrandLogo";
import { RolePicker } from "@/pages/auth/Login";

type SignupRole = Extract<UserRole, "customer" | "technician" | "vendor">;

/**
 * بوابة الإعداد الأول بعد المصادقة.
 * - إن كان المستخدم قد اختار فئته مسبقًا (أو كانت معروفة من التسجيل) → توجيه فوري دون أي سؤال.
 * - وإلا → اختيار الفئة مرة واحدة فقط ثم تُحفظ في النظام نهائيًا.
 */
export default function ConfirmRole() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isLoading } = useAuth();
  const [checking, setChecking] = useState(true);
  const [role, setRole] = useState<SignupRole>("customer");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (!user) { navigate("/login", { replace: true }); return; }

    resolveUserRedirectAfterAuth(user.id, user.email)
      .then((info) => {
        if (info.isNewUser) { setChecking(false); return; }
        navigate(info.redirectPath, { replace: true });
      })
      .catch(() => setChecking(false));
  }, [isLoading, user, navigate]);

  const confirm = async () => {
    setSaving(true);
    try {
      const info = await completeFirstTimeOnboarding(role);
      toast({ title: "تم إعداد حسابك", description: "مرحبًا بك في UberFix" });
      navigate(info.redirectPath, { replace: true });
    } catch (err) {
      toast({ title: "تعذر حفظ نوع الحساب", description: (err as Error).message, variant: "destructive" });
      setSaving(false);
    }
  };

  if (isLoading || checking) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">جاري تجهيز حسابك...</p>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-b from-muted/60 via-background to-background flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border bg-card shadow-[0_20px_60px_-20px_hsl(var(--primary)/0.35)] p-7 sm:p-9 space-y-6">
        <div className="flex flex-col items-center gap-3">
          <BrandLogo variant="full" />
          <h1 className="text-xl font-bold">خطوة أخيرة — ما نوع حسابك؟</h1>
          <p className="text-sm text-muted-foreground text-center">
            {user?.name ? `أهلاً ${user.name}، ` : ""}نحتاج هذا الاختيار مرة واحدة فقط لتوجيهك للوحة المناسبة.
          </p>
        </div>

        <RolePicker value={role} onChange={setRole} />

        <Button onClick={confirm} disabled={saving} className="h-11 w-full rounded-xl bg-[#030957] text-[#FFB900] hover:bg-[#030957]/90 font-bold text-base gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4 rotate-180" />}
          متابعة
        </Button>
      </div>
    </div>
  );
}
