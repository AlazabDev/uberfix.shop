import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, ExternalLink, Copy, CheckCircle2, AlertCircle, Send, Database, Workflow, Shield, Settings2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AppFooter } from "@/components/shared/AppFooter";

const FLOW_ID = "1946584099618562";
const FLOW_PREVIEW_URL = `https://business.facebook.com/wa/manage/flows/${FLOW_ID}/preview/`;
const EDGE_FUNCTION_URL = `https://zrrffsjbfkphridqyais.supabase.co/functions/v1/whatsapp-flow`;

// Flow JSON definition
const FLOW_JSON = {
  screens: [
    {
      id: "SELECT_BRANCH",
      data: {
        branches: { type: "array", items: { type: "object", properties: { id: { type: "string" }, title: { type: "string" } } }, __example__: [{ id: "1", title: "فرع المعادي" }] }
      },
      title: "اختر الفرع",
      layout: {
        type: "SingleColumnLayout",
        children: [
          { text: "طلب صيانة جديد", type: "TextHeading" },
          { text: "اختر الفرع المطلوب عمل صيانة له", type: "TextBody" },
          { name: "branch_id", type: "Dropdown", label: "الفرع", required: true, "data-source": "${data.branches}" },
          { type: "Footer", label: "التالي", "on-click-action": { name: "navigate", next: { type: "screen", name: "REQUEST_FORM" }, payload: { branch_id: "${form.branch_id}" } } }
        ]
      }
    },
    {
      id: "REQUEST_FORM",
      data: { branch_name: { type: "string", __example__: "فرع المعادي" } },
      title: "طلب صيانة",
      layout: {
        type: "SingleColumnLayout",
        children: [
          { text: "طلب صيانة جديد", type: "TextHeading" },
          { text: "يرجى ملء البيانات التالية لإرسال طلب الصيانة", type: "TextBody" },
          { name: "requester_name", type: "TextInput", label: "اسم مقدم الطلب", required: true, "max-chars": 80 },
          { name: "maintenance_type", type: "TextInput", label: "نوع الصيانة", required: true, "max-chars": 80, "helper-text": "مثال: تكييف، كهرباء، سباكة" },
          { name: "priority", type: "Dropdown", label: "الأولوية", required: true, "data-source": [{ id: "urgent", title: "🔴 عاجل" }, { id: "medium", title: "🟡 متوسط" }, { id: "normal", title: "🟢 عادي" }] },
          { name: "description", type: "TextArea", label: "وصف المشكلة", required: true, "max-length": 600, "helper-text": "اشرح المشكلة بالتفصيل" },
          { name: "problem_photo", type: "PhotoPicker", label: "صورة المشكلة (اختياري)", description: "التقط صورة للمشكلة إن أمكن", "max-uploaded-photos": 3, "min-uploaded-photos": 0 },
          { type: "Footer", label: "إرسال الطلب", "on-click-action": { name: "data_exchange", payload: { priority: "${form.priority}", branch_id: "${screen.branch_id}", description: "${form.description}", problem_photo: "${form.problem_photo}", requester_name: "${form.requester_name}", maintenance_type: "${form.maintenance_type}" } } }
        ]
      }
    },
    {
      id: "SUCCESS",
      data: { request_number: { type: "string", __example__: "UF/MR/260314/00001" }, requester_name: { type: "string", __example__: "" } },
      title: "تم بنجاح",
      terminal: true,
      success: true,
      layout: {
        type: "SingleColumnLayout",
        children: [
          { text: "✅ تم إرسال الطلب بنجاح", type: "TextHeading" },
          { text: "`'شكراً ' ${data.requester_name}`", type: "TextBody", "font-weight": "bold" },
          { text: "`'رقم طلبك: ' ${data.request_number}`", type: "TextBody", "font-weight": "bold" },
          { text: "سيتم التواصل معك قريباً لمعاينة الطلب", type: "TextBody" },
          { type: "Footer", label: "إغلاق", "on-click-action": { name: "complete", payload: { request_number: "${data.request_number}" } } }
        ]
      }
    }
  ],
  version: "7.3",
  routing_model: { SELECT_BRANCH: ["REQUEST_FORM"], REQUEST_FORM: ["SUCCESS"] },
  data_api_version: "3.0"
};

export default function WhatsAppFlowManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [testPhone, setTestPhone] = useState("");
  const [testResult, setTestResult] = useState<string | null>(null);

  // Fetch branches from DB
  const { data: branches = [], isLoading: branchesLoading } = useQuery({
    queryKey: ["flow-branches"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("branches")
        .select("id, name, code, city, company_id")
        .order("name");
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch recent flow requests
  const { data: flowRequests = [], isLoading: requestsLoading } = useQuery({
    queryKey: ["flow-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("maintenance_requests")
        .select("id, title, request_number, status, priority, client_name, location, created_at, channel")
        .eq("channel", "whatsapp_flow")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
  });

  // Test endpoint
  const testEndpoint = useMutation({
    mutationFn: async () => {
      const res = await fetch(EDGE_FUNCTION_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          test: true,
          action: "ping"
        }),
      });
      return { status: res.status, body: await res.text() };
    },
    onSuccess: (data) => {
      setTestResult(`Status: ${data.status}\n${data.body}`);
      toast({ title: data.status === 200 ? "✅ نقطة النهاية تعمل" : "⚠️ استجابة غير متوقعة" });
    },
    onError: (err: Error) => {
      setTestResult(`Error: ${err.message}`);
      toast({ title: "❌ فشل الاتصال", variant: "destructive" });
    },
  });

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `✅ تم نسخ ${label}` });
  };

  const priorityBadge = (p: string | null) => {
    if (p === "high") return <Badge variant="destructive">عاجل</Badge>;
    if (p === "medium") return <Badge className="bg-yellow-500">متوسط</Badge>;
    return <Badge variant="secondary">عادي</Badge>;
  };

  return (
    <div className="space-y-6 p-4 md:p-6" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">إدارة نموذج تدفق الواتساب</h1>
          <p className="text-muted-foreground mt-1">إدارة ومراقبة نموذج طلبات الصيانة عبر WhatsApp Flow</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => window.open(FLOW_PREVIEW_URL, "_blank")}>
            <ExternalLink className="h-4 w-4 ml-2" /> معاينة النموذج
          </Button>
          <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ["flow-requests"] })}>
            <RefreshCw className="h-4 w-4 ml-2" /> تحديث
          </Button>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">حالة النقطة</p>
                <p className="text-lg font-bold text-green-600">نشطة</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Database className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">الفروع المتاحة</p>
                <p className="text-lg font-bold">{branches.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <Workflow className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">طلبات من التدفق</p>
                <p className="text-lg font-bold">{flowRequests.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <Shield className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">التشفير</p>
                <p className="text-lg font-bold text-amber-600">RSA/AES</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="requests" className="space-y-4">
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          <TabsTrigger value="requests">الطلبات</TabsTrigger>
          <TabsTrigger value="branches">الفروع</TabsTrigger>
          <TabsTrigger value="flow-json">كود التدفق</TabsTrigger>
          <TabsTrigger value="endpoint">نقطة النهاية</TabsTrigger>
        </TabsList>

        {/* Requests Tab */}
        <TabsContent value="requests">
          <Card>
            <CardHeader>
              <CardTitle>طلبات الصيانة من WhatsApp Flow</CardTitle>
              <CardDescription>آخر 20 طلب تم استلامه عبر نموذج التدفق</CardDescription>
            </CardHeader>
            <CardContent>
              {requestsLoading ? (
                <div className="text-center py-8 text-muted-foreground">جارٍ التحميل...</div>
              ) : flowRequests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>لا توجد طلبات من التدفق حتى الآن</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>رقم الطلب</TableHead>
                        <TableHead>العنوان</TableHead>
                        <TableHead>مقدم الطلب</TableHead>
                        <TableHead>الفرع</TableHead>
                        <TableHead>الأولوية</TableHead>
                        <TableHead>الحالة</TableHead>
                        <TableHead>التاريخ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {flowRequests.map((req) => (
                        <TableRow key={req.id}>
                          <TableCell className="font-mono text-xs">{req.request_number || req.id.slice(0, 8)}</TableCell>
                          <TableCell>{req.title}</TableCell>
                          <TableCell>{req.client_name || "-"}</TableCell>
                          <TableCell>{req.location || "-"}</TableCell>
                          <TableCell>{priorityBadge(req.priority)}</TableCell>
                          <TableCell><Badge variant="outline">{req.status}</Badge></TableCell>
                          <TableCell className="text-xs">{new Date(req.created_at).toLocaleDateString("ar-EG")}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Branches Tab */}
        <TabsContent value="branches">
          <Card>
            <CardHeader>
              <CardTitle>الفروع المتاحة في النموذج</CardTitle>
              <CardDescription>هذه الفروع تظهر كخيارات في قائمة الفروع داخل نموذج التدفق (يتم سحبها من جدول branches)</CardDescription>
            </CardHeader>
            <CardContent>
              {branchesLoading ? (
                <div className="text-center py-8 text-muted-foreground">جارٍ التحميل...</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>اسم الفرع</TableHead>
                        <TableHead>الكود</TableHead>
                        <TableHead>المدينة</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {branches.map((b) => (
                        <TableRow key={b.id}>
                          <TableCell className="font-mono text-xs">{b.id.slice(0, 8)}</TableCell>
                          <TableCell className="font-medium">{b.name}</TableCell>
                          <TableCell>{b.code || "-"}</TableCell>
                          <TableCell>{b.city || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Flow JSON Tab */}
        <TabsContent value="flow-json">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>كود نموذج التدفق (Flow JSON)</CardTitle>
                  <CardDescription>انسخ هذا الكود والصقه في Meta WhatsApp Flow Builder</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => copyToClipboard(JSON.stringify(FLOW_JSON, null, 2), "كود التدفق")}>
                  <Copy className="h-4 w-4 ml-2" /> نسخ
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-xs leading-relaxed max-h-[500px] overflow-y-auto" dir="ltr">
                {JSON.stringify(FLOW_JSON, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Endpoint Tab */}
        <TabsContent value="endpoint">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings2 className="h-5 w-5" />
                  إعدادات نقطة النهاية (Endpoint)
                </CardTitle>
                <CardDescription>بيانات الاتصال المطلوبة لربط النموذج بـ Meta</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Endpoint URL</Label>
                  <div className="flex gap-2">
                    <Input value={EDGE_FUNCTION_URL} readOnly className="font-mono text-xs" dir="ltr" />
                    <Button variant="outline" size="icon" onClick={() => copyToClipboard(EDGE_FUNCTION_URL, "URL")}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Flow ID</Label>
                  <div className="flex gap-2">
                    <Input value={FLOW_ID} readOnly className="font-mono" dir="ltr" />
                    <Button variant="outline" size="icon" onClick={() => copyToClipboard(FLOW_ID, "Flow ID")}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                  <h4 className="font-semibold text-sm">🔐 المفاتيح المطلوبة (Supabase Secrets)</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• <code className="text-xs bg-muted px-1 rounded">WHATSAPP_FLOW_PRIVATE_KEY</code> — المفتاح الخاص RSA 2048-bit (PEM)</li>
                    <li>• <code className="text-xs bg-muted px-1 rounded">WHATSAPP_ACCESS_TOKEN</code> — رمز الوصول الدائم (System User Token)</li>
                    <li>• <code className="text-xs bg-muted px-1 rounded">WHATSAPP_PHONE_NUMBER_ID</code> — معرف رقم الهاتف</li>
                    <li>• <code className="text-xs bg-muted px-1 rounded">WHATSAPP_VERIFY_TOKEN</code> — رمز التحقق من الويب هوك</li>
                  </ul>
                </div>

                <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                  <h4 className="font-semibold text-sm">📋 خطوات الربط في Meta</h4>
                  <ol className="text-sm text-muted-foreground space-y-1 list-decimal pr-4">
                    <li>إنشاء زوج مفاتيح RSA 2048-bit</li>
                    <li>رفع المفتاح العام (Public Key) في Meta Flow Builder → Settings</li>
                    <li>حفظ المفتاح الخاص (Private Key) في Supabase Secrets</li>
                    <li>إدخال Endpoint URL في حقل Data Exchange URL بالنموذج</li>
                    <li>نشر النموذج (Publish) واختباره</li>
                  </ol>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>اختبار نقطة النهاية</CardTitle>
                <CardDescription>أرسل طلب ping للتأكد من أن نقطة النهاية تعمل</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button onClick={() => testEndpoint.mutate()} disabled={testEndpoint.isPending}>
                  <Send className="h-4 w-4 ml-2" />
                  {testEndpoint.isPending ? "جارٍ الاختبار..." : "اختبار الاتصال"}
                </Button>
                {testResult && (
                  <pre className="bg-muted p-3 rounded text-xs overflow-x-auto" dir="ltr">
                    {testResult}
                  </pre>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <AppFooter />
    </div>
  );
}
