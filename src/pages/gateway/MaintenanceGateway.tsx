import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Activity, ArrowUpRight, GitBranch, Globe, MessageSquare, Phone, 
  QrCode, FileText, Mail, Zap, RefreshCw, Copy, CheckCircle2,
  Clock, AlertTriangle, TrendingUp, BarChart3
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface GatewayLog {
  id: string;
  route: string;
  method: string;
  status_code: number;
  duration_ms: number;
  consumer_type: string | null;
  consumer_id: string | null;
  request_id: string;
  created_at: string | null;
}

interface ChannelStats {
  channel: string;
  count: number;
  icon: React.ReactNode;
  color: string;
  label: string;
}

const CHANNEL_CONFIG: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  whatsapp_flow: { icon: <MessageSquare className="h-4 w-4" />, color: "bg-green-500/10 text-green-600 border-green-500/20", label: "واتساب Flow" },
  whatsapp_chat: { icon: <MessageSquare className="h-4 w-4" />, color: "bg-green-500/10 text-green-600 border-green-500/20", label: "واتساب محادثة" },
  jotform: { icon: <FileText className="h-4 w-4" />, color: "bg-orange-500/10 text-orange-600 border-orange-500/20", label: "JotForm" },
  public_form: { icon: <Globe className="h-4 w-4" />, color: "bg-blue-500/10 text-blue-600 border-blue-500/20", label: "نموذج عام" },
  qr_guest: { icon: <QrCode className="h-4 w-4" />, color: "bg-purple-500/10 text-purple-600 border-purple-500/20", label: "QR Code" },
  facebook_lead: { icon: <ArrowUpRight className="h-4 w-4" />, color: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20", label: "فيسبوك" },
  phone: { icon: <Phone className="h-4 w-4" />, color: "bg-teal-500/10 text-teal-600 border-teal-500/20", label: "هاتف" },
  internal: { icon: <Zap className="h-4 w-4" />, color: "bg-amber-500/10 text-amber-600 border-amber-500/20", label: "داخلي" },
  email: { icon: <Mail className="h-4 w-4" />, color: "bg-red-500/10 text-red-600 border-red-500/20", label: "بريد إلكتروني" },
  api: { icon: <GitBranch className="h-4 w-4" />, color: "bg-gray-500/10 text-gray-600 border-gray-500/20", label: "API" },
};

const MaintenanceGateway = () => {
  const [logs, setLogs] = useState<GatewayLog[]>([]);
  const [channelStats, setChannelStats] = useState<ChannelStats[]>([]);
  const [totalToday, setTotalToday] = useState(0);
  const [avgDuration, setAvgDuration] = useState(0);
  const [successRate, setSuccessRate] = useState(100);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const gatewayUrl = `https://zrrffsjbfkphridqyais.supabase.co/functions/v1/maintenance-gateway`;

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch gateway logs
      const { data: logData } = await supabase
        .from('api_gateway_logs')
        .select('*')
        .like('route', '%gateway%')
        .order('created_at', { ascending: false })
        .limit(100);

      setLogs((logData as GatewayLog[]) || []);

      // Calculate stats
      const today = new Date().toISOString().split('T')[0];
      const todayLogs = (logData || []).filter((l: any) => l.created_at?.startsWith(today));
      setTotalToday(todayLogs.length);

      const durations = (logData || []).filter((l: any) => l.duration_ms).map((l: any) => l.duration_ms);
      setAvgDuration(durations.length ? Math.round(durations.reduce((a: number, b: number) => a + b, 0) / durations.length) : 0);

      const successCount = (logData || []).filter((l: any) => l.status_code < 400).length;
      setSuccessRate(logData?.length ? Math.round((successCount / logData.length) * 100) : 100);

      // Fetch channel distribution from maintenance_requests
      const { data: requests } = await supabase
        .from('maintenance_requests')
        .select('channel')
        .not('channel', 'is', null);

      const channelCounts: Record<string, number> = {};
      (requests || []).forEach((r: any) => {
        const ch = r.channel || 'unknown';
        channelCounts[ch] = (channelCounts[ch] || 0) + 1;
      });

      const stats: ChannelStats[] = Object.entries(channelCounts)
        .map(([channel, count]) => ({
          channel,
          count,
          ...(CHANNEL_CONFIG[channel] || { icon: <Activity className="h-4 w-4" />, color: "bg-muted text-muted-foreground", label: channel }),
        }))
        .sort((a, b) => b.count - a.count);

      setChannelStats(stats);
    } catch (err) {
      console.error('Failed to fetch gateway data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const copyUrl = () => {
    navigator.clipboard.writeText(gatewayUrl);
    setCopied(true);
    toast({ title: "✓ تم النسخ", description: "تم نسخ رابط الـ Gateway" });
    setTimeout(() => setCopied(false), 2000);
  };

  const examplePayload = JSON.stringify({
    channel: "api",
    client_name: "أحمد محمد",
    client_phone: "+201234567890",
    service_type: "plumbing",
    priority: "medium",
    description: "تسريب مياه في المطبخ",
    branch_name: "فرع المعادي"
  }, null, 2);

  return (
    <div className="space-y-6 p-4 sm:p-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <GitBranch className="h-6 w-6 text-primary" />
            بوابة الصيانة الموحدة
          </h1>
          <p className="text-muted-foreground mt-1">نقطة الدخول الواحدة لجميع طلبات الصيانة من كافة القنوات</p>
        </div>
        <Button onClick={fetchData} variant="outline" size="sm" disabled={loading}>
          <RefreshCw className={`h-4 w-4 ml-2 ${loading ? 'animate-spin' : ''}`} />
          تحديث
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">طلبات اليوم</p>
                <p className="text-2xl font-bold text-foreground">{totalToday}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-primary/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">القنوات النشطة</p>
                <p className="text-2xl font-bold text-foreground">{channelStats.length}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-primary/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">متوسط الاستجابة</p>
                <p className="text-2xl font-bold text-foreground">{avgDuration}ms</p>
              </div>
              <Clock className="h-8 w-8 text-primary/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">معدل النجاح</p>
                <p className="text-2xl font-bold text-foreground">{successRate}%</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-500/30" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="channels" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="channels">القنوات</TabsTrigger>
          <TabsTrigger value="logs">سجل الطلبات</TabsTrigger>
          <TabsTrigger value="docs">التوثيق</TabsTrigger>
        </TabsList>

        {/* Channels Tab */}
        <TabsContent value="channels" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {channelStats.map((ch) => (
              <Card key={ch.channel} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg border ${ch.color}`}>
                        {ch.icon}
                      </div>
                      <div>
                        <p className="font-medium text-sm text-foreground">{ch.label}</p>
                        <p className="text-xs text-muted-foreground">{ch.channel}</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-lg font-bold">{ch.count}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
            {channelStats.length === 0 && !loading && (
              <div className="col-span-full text-center py-8 text-muted-foreground">
                لا توجد طلبات بعد. ابدأ بإرسال طلب عبر أي قناة.
              </div>
            )}
          </div>

          {/* Architecture Diagram */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">هندسة البوابة الموحدة</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-muted/50 rounded-lg p-4 font-mono text-xs leading-relaxed text-foreground">
                <pre className="whitespace-pre-wrap">{`
┌─────────────┐  ┌──────────────┐  ┌──────────────┐
│ WhatsApp    │  │  JotForm     │  │  Public Form │
│ Flow        │  │  Webhook     │  │  /QR Code    │
└──────┬──────┘  └──────┬───────┘  └──────┬───────┘
       │                │                  │
       └────────────────┼──────────────────┘
                        │
                ┌───────▼────────┐
                │  🌐 Gateway    │
                │  maintenance-  │
                │  gateway       │
                ├────────────────┤
                │ • Validate     │
                │ • Sanitize     │
                │ • Normalize    │
                │ • Route        │
                └───────┬────────┘
                        │
              ┌─────────▼──────────┐
              │  maintenance_      │
              │  requests (DB)     │
              └─────────┬──────────┘
                        │
              ┌─────────▼──────────┐
              │  Notifications     │
              │  WhatsApp / Email  │
              └────────────────────┘`}
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs">
          <Card>
            <CardContent className="pt-4">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">القناة</TableHead>
                      <TableHead className="text-right">الحالة</TableHead>
                      <TableHead className="text-right">الاستجابة</TableHead>
                      <TableHead className="text-right">الوقت</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.slice(0, 50).map((log) => {
                      const ch = CHANNEL_CONFIG[log.consumer_type || ''] || { label: log.consumer_type || 'غير معروف', color: 'bg-muted text-muted-foreground' };
                      return (
                        <TableRow key={log.id}>
                          <TableCell>
                            <Badge variant="outline" className={`text-xs ${ch.color}`}>
                              {ch.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={log.status_code < 400 ? "default" : "destructive"} className="text-xs">
                              {log.status_code}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{log.duration_ms}ms</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {log.created_at ? new Date(log.created_at).toLocaleString('ar-EG') : '-'}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {logs.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                          لا توجد سجلات بعد
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documentation Tab */}
        <TabsContent value="docs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">رابط الـ Gateway</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 bg-muted rounded-lg p-3">
                <code className="text-xs flex-1 text-foreground break-all" dir="ltr">{gatewayUrl}</code>
                <Button size="sm" variant="ghost" onClick={copyUrl}>
                  {copied ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">مثال على الطلب (POST)</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted rounded-lg p-4 text-xs overflow-x-auto text-foreground" dir="ltr">
                {examplePayload}
              </pre>
              <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                <p><strong className="text-foreground">channel</strong> (مطلوب): {Object.keys(CHANNEL_CONFIG).join(', ')}</p>
                <p><strong className="text-foreground">client_name</strong> (مطلوب): اسم العميل</p>
                <p><strong className="text-foreground">service_type</strong>: plumbing, electrical, ac, carpentry, metalwork, painting, cleaning, other</p>
                <p><strong className="text-foreground">priority</strong>: high, medium, low</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                القنوات المتصلة
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                {[
                  { name: 'JotForm Webhook', status: 'متصل', route: 'jotform-webhook → gateway' },
                  { name: 'WhatsApp Flow', status: 'متصل', route: 'whatsapp-flow → gateway' },
                  { name: 'نموذج عام / QR', status: 'متصل', route: 'submit-public-request → gateway' },
                  { name: 'فيسبوك Lead Ads', status: 'متصل', route: 'facebook-leads-webhook → gateway' },
                  { name: 'لوحة التحكم', status: 'متصل', route: 'useMaintenanceRequests → gateway' },
                ].map((ch) => (
                  <div key={ch.name} className="flex items-center justify-between border-b border-border pb-2">
                    <div>
                      <p className="font-medium text-foreground">{ch.name}</p>
                      <p className="text-xs text-muted-foreground" dir="ltr">{ch.route}</p>
                    </div>
                    <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                      {ch.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MaintenanceGateway;
