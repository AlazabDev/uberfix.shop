import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BrandLogo } from "@/components/shared/BrandLogo";
import { Loader2, ShieldCheck, CheckCircle2, AlertTriangle } from "lucide-react";

type Details = {
  client?: { id?: string; name?: string; uri?: string; logo_uri?: string };
  scope?: string;
  redirect_uri?: string;
  user?: { email?: string };
};

const PERMISSIONS = [
  "تسجيل طلبات صيانة وطلبات عرض سعر باسمك",
  "متابعة طلباتك وتفاصيلها وإضافة ملاحظات",
  "إلغاء طلب عند طلبك الصريح فقط",
  "تصفح الخدمات والتصنيفات والفروع",
];

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<Details | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"approve" | "deny" | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) return setError("رابط التفويض ناقص (authorization_id).");
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = "/login?next=" + encodeURIComponent(next);
        return;
      }
      const { data, error } = await supabase.auth.oauth.getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (error) return setError(error.message);
      const d = data as Details & { redirect_url?: string };
      if (d?.redirect_url && !d.client) {
        window.location.href = d.redirect_url;
        return;
      }
      setDetails(d);
    })().catch((e) => active && setError(e instanceof Error ? e.message : String(e)));
    return () => { active = false; };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(approve ? "approve" : "deny");
    setError(null);
    const { data, error } = approve
      ? await supabase.auth.oauth.approveAuthorization(authorizationId, { skipBrowserRedirect: true })
      : await supabase.auth.oauth.denyAuthorization(authorizationId, { skipBrowserRedirect: true });
    if (error) { setBusy(null); return setError(error.message); }
    if (!data?.redirect_url) { setBusy(null); return setError("لم يُرجع خادم التفويض رابط العودة."); }
    window.location.href = data.redirect_url;
  }

  const appName = details?.client?.name || "تطبيق ذكاء اصطناعي";

  return (
    <main dir="rtl" className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-border/50 shadow-sm">
        <CardHeader className="text-center space-y-3">
          <div className="flex justify-center"><BrandLogo /></div>
          <CardTitle className="flex items-center justify-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            {details ? `ربط ${appName} بحسابك` : "تفويض اتصال"}
          </CardTitle>
          {details && (
            <CardDescription>
              {appName} يطلب استخدام UberFix باسمك
              {details.user?.email ? ` (${details.user.email})` : ""} وبصلاحياتك الحالية فقط.
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>تعذر إكمال طلب التفويض: {error}</span>
            </div>
          )}
          {!details && !error && (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          )}
          {details && (
            <>
              <ul className="space-y-2 rounded-lg border border-border/50 bg-muted/20 p-4 text-sm">
                {PERMISSIONS.map((p) => (
                  <li key={p} className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground">
                لن يرى المساعد بيانات أي شركة أو فرع خارج صلاحياتك. يمكنك إلغاء الاتصال في أي وقت من
                الإعدادات ← اتصالات الذكاء الاصطناعي.
              </p>
              {details.client?.uri && (
                <p className="text-xs text-muted-foreground break-all">موقع التطبيق: {details.client.uri}</p>
              )}
              <div className="flex gap-2">
                <Button className="flex-1" disabled={!!busy} onClick={() => decide(true)}>
                  {busy === "approve" && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
                  موافقة
                </Button>
                <Button className="flex-1" variant="outline" disabled={!!busy} onClick={() => decide(false)}>
                  {busy === "deny" && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
                  رفض
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
