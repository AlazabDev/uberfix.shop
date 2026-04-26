import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { BookOpen, Copy } from 'lucide-react';

const SUPABASE_URL = 'https://zrrffsjbfkphridqyais.supabase.co';

const OAUTH_TOKEN = `curl -X POST "${SUPABASE_URL}/functions/v1/api-oauth-token" \\
  -H "Content-Type: application/x-www-form-urlencoded" \\
  -d "grant_type=client_credentials" \\
  -d "client_id=YOUR_CLIENT_ID" \\
  -d "client_secret=YOUR_CLIENT_SECRET" \\
  -d "scope=requests:read requests:write"

# Response:
# {
#   "access_token": "eyJhbGciOiJIUzI1Ni...",
#   "token_type": "Bearer",
#   "expires_in": 3600,
#   "scope": "requests:read requests:write"
# }`;

const API_KEY_CALL = `curl -X POST "${SUPABASE_URL}/functions/v1/maintenance-gateway/requests" \\
  -H "X-API-Key: uf_YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -H "Idempotency-Key: $(uuidgen)" \\
  -d '{
    "client_phone": "+201001234567",
    "service_type": "ac_repair",
    "description": "Air conditioner not cooling",
    "address": "Cairo, Maadi"
  }'`;

const OAUTH_CALL = `curl -X POST "${SUPABASE_URL}/functions/v1/maintenance-gateway/requests" \\
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \\
  -H "Content-Type: application/json" \\
  -H "Idempotency-Key: $(uuidgen)" \\
  -d '{ "client_phone": "+201001234567", "service_type": "ac_repair" }'`;

const WEBHOOK_VERIFY_NODE = `import crypto from "node:crypto";

function verify(req) {
  const sig = req.headers["x-uberfix-signature"];     // hex
  const ts  = req.headers["x-uberfix-timestamp"];     // unix seconds
  const raw = req.rawBody;                            // exact bytes

  // reject anything older than 5 minutes
  if (Math.abs(Date.now()/1000 - Number(ts)) > 300) return false;

  const expected = crypto
    .createHmac("sha256", process.env.UBERFIX_WEBHOOK_SECRET)
    .update(\`\${ts}.\${raw}\`)
    .digest("hex");

  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}`;

const SCOPES_TABLE = [
  ['requests:read', 'قراءة طلبات الصيانة'],
  ['requests:write', 'إنشاء وتعديل الطلبات'],
  ['properties:read', 'قراءة العقارات'],
  ['properties:write', 'تعديل العقارات'],
  ['technicians:read', 'قراءة بيانات الفنيين'],
  ['invoices:read', 'قراءة الفواتير'],
  ['webhooks:manage', 'إدارة اشتراكات Webhooks'],
  ['media:upload', 'رفع ملفات للتخزين الموجه (AWS/GCS/OCI)'],
];

function CodeBlock({ code }: { code: string }) {
  const { toast } = useToast();
  return (
    <div className="relative">
      <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-xs leading-relaxed border" dir="ltr">
        <code>{code}</code>
      </pre>
      <Button
        size="sm"
        variant="outline"
        className="absolute top-2 left-2"
        onClick={() => { navigator.clipboard.writeText(code); toast({ title: 'تم النسخ' }); }}
      >
        <Copy className="h-3 w-3" />
      </Button>
    </div>
  );
}

export function IntegrationDocsPanel() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          دليل التكامل
        </CardTitle>
        <CardDescription>
          البوابة الموحّدة: <code dir="ltr">maintenance-gateway</code>. تدعم API Key و OAuth2 client_credentials.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="auth" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="auth">المصادقة</TabsTrigger>
            <TabsTrigger value="calls">طلبات API</TabsTrigger>
            <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
            <TabsTrigger value="scopes">Scopes</TabsTrigger>
          </TabsList>

          <TabsContent value="auth" className="space-y-4 mt-4">
            <div>
              <h4 className="font-semibold mb-2">OAuth2 — client_credentials</h4>
              <p className="text-sm text-muted-foreground mb-2">
                للشركاء الإنتاجيين. التوكن صالح ساعة، يحمل scopes المعتمدة.
              </p>
              <CodeBlock code={OAUTH_TOKEN} />
            </div>
          </TabsContent>

          <TabsContent value="calls" className="space-y-4 mt-4">
            <div>
              <h4 className="font-semibold mb-2">باستخدام API Key (للبوتات والأدوات الداخلية)</h4>
              <CodeBlock code={API_KEY_CALL} />
            </div>
            <div>
              <h4 className="font-semibold mb-2">باستخدام OAuth2 Bearer (للشركاء)</h4>
              <CodeBlock code={OAUTH_CALL} />
            </div>
            <div className="bg-muted/50 border rounded p-3 text-xs">
              <strong>Idempotency-Key</strong>: مطلوب لكل POST/PUT/PATCH لتجنّب التكرار. القيمة UUID فريدة، صالحة 24 ساعة.
            </div>
          </TabsContent>

          <TabsContent value="webhooks" className="space-y-4 mt-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                كل تسليم يحمل رأسين: <code dir="ltr">X-UberFix-Signature</code> (HMAC-SHA256 hex) و <code dir="ltr">X-UberFix-Timestamp</code>.
                التحقق إلزامي.
              </p>
              <CodeBlock code={WEBHOOK_VERIFY_NODE} />
            </div>
            <div className="bg-muted/50 border rounded p-3 text-xs space-y-1">
              <div><strong>إعادة المحاولة</strong>: 5 محاولات بفواصل تصاعدية (1m → 5m → 30m → 2h → 12h).</div>
              <div><strong>الحدّ الزمني</strong>: 10 ثوانٍ لكل تسليم. ردّ بـ 2xx لاعتباره ناجحاً.</div>
            </div>
          </TabsContent>

          <TabsContent value="scopes" className="mt-4">
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-right p-2 font-medium">Scope</th>
                    <th className="text-right p-2 font-medium">الوصف</th>
                  </tr>
                </thead>
                <tbody>
                  {SCOPES_TABLE.map(([s, d]) => (
                    <tr key={s} className="border-t">
                      <td className="p-2"><code className="text-xs">{s}</code></td>
                      <td className="p-2 text-muted-foreground">{d}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}