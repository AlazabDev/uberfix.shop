import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useUserRoles } from "@/hooks/useUserRoles";
import { Bot, Copy, Check, Loader2, Trash2, KeyRound, RefreshCw, Link2 } from "lucide-react";

const PROJECT_REF = import.meta.env.VITE_SUPABASE_PROJECT_ID as string | undefined;
export const MCP_URL = `https://${PROJECT_REF ?? "zrrffsjbfkphridqyais"}.supabase.co/functions/v1/mcp`;

type Grant = { client: { id: string; name?: string; uri?: string; logo_uri?: string }; scopes: string[]; granted_at: string };
type ServerState = "checking" | "ready" | "pending";

const STEPS = [
  "انسخ رابط الاتصال بالأسفل.",
  "في تطبيق الذكاء الاصطناعي الذي تفضّله، أضف «MCP server / Custom connector» والصق الرابط.",
  "سيفتح التطبيق صفحة دخول UberFix — سجّل دخولك ووافق على الصلاحيات.",
  "اطلب من المساعد مثلًا: «سجّل طلب صيانة تكييف» أو «ما حالة طلبي الأخير؟».",
];

export function AIConnectionsSettings() {
  const { toast } = useToast();
  const { hasRole } = useUserRoles();
  const isAdmin = hasRole("admin") || hasRole("owner");
  const [copied, setCopied] = useState(false);
  const [grants, setGrants] = useState<Grant[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [server, setServer] = useState<ServerState>("checking");

  const load = useCallback(async () => {
    setLoading(true);
    setListError(null);
    const { data, error } = await supabase.auth.oauth.listGrants();
    if (error) {
      setListError(error.message);
    } else {
      setGrants((data ?? []) as Grant[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    fetch(`https://${PROJECT_REF ?? "zrrffsjbfkphridqyais"}.supabase.co/auth/v1/.well-known/oauth-authorization-server`)
      .then(async (r) => setServer(r.ok && (await r.json())?.issuer ? "ready" : "pending"))
      .catch(() => setServer("pending"));
  }, [load]);

  const copy = async () => {
    await navigator.clipboard.writeText(MCP_URL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const revoke = async (clientId: string) => {
    setRevoking(clientId);
    const { error } = await supabase.auth.oauth.revokeGrant({ clientId });
    setRevoking(null);
    if (error) {
      toast({ title: "تعذر إلغاء الاتصال", description: error.message, variant: "destructive" });
      return;
    }
    setGrants((g) => g.filter((x) => x.client.id !== clientId));
    toast({ title: "تم إلغاء الاتصال", description: "لن يتمكن هذا التطبيق من الوصول لحسابك بعد الآن." });
  };

  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          اتصالات الذكاء الاصطناعي — AI Connections
        </CardTitle>
        <CardDescription>
          اربط حسابك بأي مساعد ذكاء اصطناعي يدعم MCP (مثل ChatGPT أو Claude أو Gemini أو غيرها) — رابط واحد يعمل مع الجميع.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Connect */}
        <div className="space-y-3 p-4 rounded-lg border border-primary/20 bg-primary/5">
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-medium flex items-center gap-2">
              <Link2 className="h-4 w-4 text-primary" />
              ربط مساعد ذكاء اصطناعي
            </h4>
            <Badge variant={server === "ready" ? "default" : "secondary"}>
              {server === "checking" ? "جارٍ الفحص…" : server === "ready" ? "الخدمة متاحة" : "بانتظار التفعيل"}
            </Badge>
          </div>
          <div className="flex gap-2">
            <Input readOnly dir="ltr" value={MCP_URL} className="font-mono text-xs" onFocus={(e) => e.target.select()} />
            <Button type="button" variant="outline" onClick={copy} className="shrink-0">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              <span className="mr-2">{copied ? "تم النسخ" : "نسخ الرابط"}</span>
            </Button>
          </div>
          <ol className="list-decimal pr-5 space-y-1 text-sm text-muted-foreground">
            {STEPS.map((s) => <li key={s}>{s}</li>)}
          </ol>
          {server === "pending" && (
            <p className="text-xs text-muted-foreground">
              خدمة التفويض لم تُفعَّل بعد على الخادم؛ ستعمل تلقائيًا بعد نشر التطبيق.
            </p>
          )}
        </div>

        {/* Authorized apps */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">التطبيقات المصرّح لها</h4>
            <Button variant="ghost" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
          {loading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
          ) : listError ? (
            <p className="text-sm text-muted-foreground p-4 rounded-lg border border-border/50 bg-muted/20">
              لا يمكن عرض الاتصالات الآن ({listError}).
            </p>
          ) : grants.length === 0 ? (
            <p className="text-sm text-muted-foreground p-4 rounded-lg border border-border/50 bg-muted/20">
              لا توجد تطبيقات مرتبطة بحسابك حتى الآن.
            </p>
          ) : (
            <ul className="space-y-2">
              {grants.map((g) => (
                <li key={g.client.id} className="flex items-center justify-between gap-3 p-4 rounded-lg border border-border/50 bg-muted/20">
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{g.client.name || "تطبيق بدون اسم"}</span>
                      <Badge variant="default">متصل</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      تاريخ التفويض: {new Date(g.granted_at).toLocaleString("ar-EG")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      الصلاحيات: نفس صلاحيات حسابك{g.scopes?.length ? ` (${g.scopes.join("، ")})` : ""}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive shrink-0"
                    disabled={revoking === g.client.id}
                    onClick={() => revoke(g.client.id)}
                  >
                    {revoking === g.client.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    <span className="mr-2">إلغاء الاتصال</span>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Machine credentials */}
        {isAdmin && (
          <div className="flex items-center justify-between gap-3 p-4 rounded-lg border border-border/50 bg-muted/20">
            <div className="space-y-0.5">
              <p className="font-medium flex items-center gap-2"><KeyRound className="h-4 w-4" />بيانات اعتماد التطبيقات الآلية</p>
              <p className="text-sm text-muted-foreground">مفاتيح API وأسرار OAuth (Client Credentials) للتكاملات بين الأنظمة.</p>
            </div>
            <Button asChild variant="outline" size="sm"><Link to="/admin/api-gateway">إدارة المفاتيح</Link></Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
