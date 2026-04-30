import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldCheck, Users, Wrench, Building2, AlertTriangle, ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  detectUserRole,
  getRoleRedirectPath,
  type UserRole,
} from "@/lib/roleRedirect";
import { useToast } from "@/hooks/use-toast";

/**
 * شاشة التحقق بعد OAuth
 *
 * تعرض الدور المكتشف من DB للمستخدم، تسمح بتأكيده أو تغييره
 * قبل التوجيه للداشبورد. تمنع أي انهيار إذا كان الدور مفقوداً
 * عبر عرض اختيار يدوي بدلاً من إعادة توجيه أعمى.
 */

const ROLE_OPTIONS: Array<{
  role: Extract<UserRole, "customer" | "technician" | "vendor">;
  label: string;
  description: string;
  icon: typeof Users;
  color: string;
}> = [
  {
    role: "customer",
    label: "عميل",
    description: "أطلب خدمات الصيانة وأتابع طلباتي",
    icon: Users,
    color: "blue",
  },
  {
    role: "technician",
    label: "فني",
    description: "أقدم خدمات الصيانة وأستقبل الطلبات",
    icon: Wrench,
    color: "green",
  },
  {
    role: "vendor",
    label: "شركة / مورد",
    description: "أدير عمليات صيانة كشركة أو مورد",
    icon: Building2,
    color: "purple",
  },
];

export default function ConfirmRole() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isLoading: authLoading, signOut } = useAuth();

  const [isDetecting, setIsDetecting] = useState(true);
  const [detectedRole, setDetectedRole] = useState<UserRole | null>(null);
  const [isNewUser, setIsNewUser] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ Step 1: لو لا يوجد user بعد تحميل AuthContext → عودة للدخول (لا انهيار)
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/login", { replace: true });
    }
  }, [authLoading, user, navigate]);

  // ✅ Step 2: اكتشاف الدور
  useEffect(() => {
    if (authLoading || !user) return;

    let cancelled = false;
    (async () => {
      try {
        const result = await detectUserRole(user.id, user.email);
        if (cancelled) return;
        setDetectedRole(result.primaryRole);
        setIsNewUser(result.isNewUser);
        setSelectedRole(result.primaryRole);
      } catch (e) {
        if (cancelled) return;
        console.error("[ConfirmRole] detect error", e);
        setError("تعذر اكتشاف نوع الحساب — اختر يدوياً للمتابعة");
        setIsNewUser(true);
      } finally {
        if (!cancelled) setIsDetecting(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user]);

  const handleConfirm = async () => {
    if (!user || !selectedRole) return;
    setIsSaving(true);

    try {
      // إذا كان دور موجود مسبقاً ومطابق → فقط وجّه
      if (!isNewUser && detectedRole === selectedRole) {
        navigate(getRoleRedirectPath(selectedRole), { replace: true });
        return;
      }

      // إنشاء/تحديث profile بالدور المختار
      const fullName =
        (user.supabaseUser.user_metadata?.full_name as string) ||
        (user.supabaseUser.user_metadata?.name as string) ||
        user.email ||
        "UberFix User";
      const avatarUrl =
        (user.supabaseUser.user_metadata?.avatar_url as string) ||
        (user.supabaseUser.user_metadata?.picture as string) ||
        null;

      const { error: upsertError } = await supabase
        .from("profiles")
        .upsert(
          {
            id: user.id,
            email: user.email || `${user.id}@oauth.local`,
            name: fullName,
            full_name: fullName,
            avatar_url: avatarUrl,
            role: selectedRole,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" },
        );

      if (upsertError) {
        throw upsertError;
      }

      toast({
        title: "تم تأكيد نوع الحساب",
        description: `مرحباً بك كـ ${ROLE_OPTIONS.find((o) => o.role === selectedRole)?.label || selectedRole}`,
      });
      navigate(getRoleRedirectPath(selectedRole), { replace: true });
    } catch (e: any) {
      console.error("[ConfirmRole] save error", e);
      toast({
        title: "تعذر حفظ نوع الحساب",
        description: e?.message || "حاول مرة أخرى",
        variant: "destructive",
      });
      setIsSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  // عرض loading أثناء اكتشاف الدور
  if (authLoading || isDetecting) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="animate-spin h-12 w-12 text-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">جاري التحقق من نوع حسابك...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <ShieldCheck className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">تأكيد نوع الحساب</h1>
          <p className="text-muted-foreground mt-2">
            مرحباً <span className="font-medium text-foreground">{user?.name || user?.email}</span>
          </p>
        </div>

        {/* بطاقة التأكيد */}
        <Card className="border-2">
          <CardHeader>
            {detectedRole && !isNewUser ? (
              <>
                <CardTitle className="flex items-center gap-2 text-green-600 dark:text-green-400">
                  <ShieldCheck className="h-5 w-5" />
                  تم اكتشاف نوع حسابك
                </CardTitle>
                <CardDescription>
                  حسابك مسجل سابقاً كـ <strong>{ROLE_OPTIONS.find((o) => o.role === detectedRole)?.label || detectedRole}</strong>.
                  أكد أو غيّر نوع الحساب للمتابعة.
                </CardDescription>
              </>
            ) : (
              <>
                <CardTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="h-5 w-5" />
                  لم يتم اكتشاف نوع حساب
                </CardTitle>
                <CardDescription>
                  حسابك جديد على المنصة. اختر نوع الحساب المناسب للمتابعة بأمان.
                </CardDescription>
              </>
            )}
            {error && (
              <div className="mt-3 text-sm text-destructive bg-destructive/10 rounded-md p-2">
                {error}
              </div>
            )}
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-3 gap-3">
              {ROLE_OPTIONS.map((option) => {
                const Icon = option.icon;
                const isSelected = selectedRole === option.role;
                const isDetected = detectedRole === option.role;
                return (
                  <button
                    key={option.role}
                    type="button"
                    onClick={() => setSelectedRole(option.role)}
                    className={`relative text-right p-4 rounded-lg border-2 transition-all ${
                      isSelected
                        ? "border-primary bg-primary/5 shadow-md"
                        : "border-border hover:border-primary/40 hover:bg-muted/50"
                    }`}
                  >
                    {isDetected && (
                      <span className="absolute top-2 left-2 text-[10px] font-bold bg-green-500/15 text-green-700 dark:text-green-400 px-2 py-0.5 rounded">
                        مكتشف
                      </span>
                    )}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 bg-${option.color}-100 dark:bg-${option.color}-900/30`}>
                      <Icon className={`h-5 w-5 text-${option.color}-600 dark:text-${option.color}-400`} />
                    </div>
                    <div className="font-bold">{option.label}</div>
                    <div className="text-xs text-muted-foreground mt-1">{option.description}</div>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                onClick={handleConfirm}
                disabled={!selectedRole || isSaving}
                className="flex-1"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                    جاري الحفظ...
                  </>
                ) : (
                  <>
                    تأكيد ومتابعة
                    <ArrowRight className="mr-2 h-4 w-4" />
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={handleSignOut}
                disabled={isSaving}
              >
                تسجيل خروج
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
