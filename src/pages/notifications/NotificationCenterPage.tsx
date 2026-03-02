import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { PageContainer } from '@/components/layout/PageContainer';
import {
  MessageSquare,
  CheckCircle,
  Clock,
  XCircle,
  Search,
  RefreshCw,
  ArrowLeft,
  ArrowRight,
  Send,
  Mail,
  Eye,
  RotateCcw,
  Activity,
  TrendingUp,
  Bell,
  Zap,
  BarChart3,
  Phone,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useWhatsAppNotifications } from '@/hooks/useWhatsAppNotifications';

// ==========================================
// Types
// ==========================================
interface MessageLog {
  id: string;
  recipient: string;
  message_type: 'sms' | 'whatsapp' | 'email';
  message_content: string;
  provider: string;
  status: string;
  external_id: string | null;
  sent_at: string;
  delivered_at: string | null;
  read_at: string | null;
  error_message: string | null;
  metadata: any;
  request_id: string | null;
  created_at: string;
  notification_stage: string | null;
  retry_count: number;
}

interface KPIStats {
  total: number;
  whatsapp: number;
  email: number;
  sms: number;
  delivered: number;
  failed: number;
  read: number;
  deliveryRate: number;
  todayCount: number;
}

// ==========================================
// Constants
// ==========================================
const STATUS_MAP: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  delivered: { label: 'تم التسليم', variant: 'default' },
  sent: { label: 'تم الإرسال', variant: 'secondary' },
  read: { label: 'تمت القراءة', variant: 'default' },
  queued: { label: 'في الانتظار', variant: 'outline' },
  sending: { label: 'جاري الإرسال', variant: 'outline' },
  failed: { label: 'فشل', variant: 'destructive' },
  undelivered: { label: 'لم يتم التسليم', variant: 'destructive' },
};

const STAGE_LABELS: Record<string, string> = {
  received: '📥 تم الاستلام',
  reviewed: '📝 تمت المراجعة',
  scheduled: '🗓 تم الجدولة',
  on_the_way: '🚚 في الطريق',
  in_progress: '🛠 جاري التنفيذ',
  completed: '✅ تم الانتهاء',
  closed: '🏁 تم الإغلاق',
};

const TYPE_CONFIG: Record<string, { label: string; icon: typeof MessageSquare; className: string }> = {
  whatsapp: { label: 'واتساب', icon: MessageSquare, className: 'text-green-600' },
  sms: { label: 'SMS', icon: Phone, className: 'text-blue-600' },
  email: { label: 'بريد', icon: Mail, className: 'text-purple-600' },
};

// ==========================================
// Component
// ==========================================
export default function NotificationCenterPage() {
  const [logs, setLogs] = useState<MessageLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [stageFilter, setStageFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedLog, setSelectedLog] = useState<MessageLog | null>(null);
  const [kpis, setKpis] = useState<KPIStats>({
    total: 0, whatsapp: 0, email: 0, sms: 0,
    delivered: 0, failed: 0, read: 0, deliveryRate: 0, todayCount: 0
  });
  const [retrying, setRetrying] = useState<string | null>(null);
  const { sendCustomMessage } = useWhatsAppNotifications();
  const limit = 30;

  // Fetch KPIs
  const fetchKPIs = useCallback(async () => {
    try {
      const { data, error, count } = await supabase
        .from('message_logs')
        .select('message_type, status, read_at, created_at', { count: 'exact' });

      if (error) throw error;

      const today = startOfDay(new Date()).toISOString();
      const rows = data || [];
      const totalCount = count || 0;
      const whatsapp = rows.filter(r => r.message_type === 'whatsapp').length;
      const email = rows.filter(r => r.message_type === 'email').length;
      const sms = rows.filter(r => r.message_type === 'sms').length;
      const delivered = rows.filter(r => ['delivered', 'sent', 'read'].includes(r.status)).length;
      const failed = rows.filter(r => ['failed', 'undelivered'].includes(r.status)).length;
      const read = rows.filter(r => r.read_at || r.status === 'read').length;
      const todayCount = rows.filter(r => r.created_at >= today).length;

      setKpis({
        total: totalCount,
        whatsapp, email, sms,
        delivered, failed, read,
        deliveryRate: totalCount > 0 ? Math.round((delivered / totalCount) * 100) : 0,
        todayCount
      });
    } catch (err) {
      console.error('KPI fetch error:', err);
    }
  }, []);

  // Fetch logs
  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('message_logs')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((page - 1) * limit, page * limit - 1);

      if (typeFilter !== 'all') query = query.eq('message_type', typeFilter);
      if (statusFilter !== 'all') query = query.eq('status', statusFilter);
      if (stageFilter !== 'all') query = query.eq('notification_stage', stageFilter);
      if (searchTerm) {
        query = query.or(`recipient.ilike.%${searchTerm}%,message_content.ilike.%${searchTerm}%`);
      }

      const { data, error, count } = await query;
      if (error) throw error;

      setLogs((data || []) as MessageLog[]);
      setTotal(count || 0);
    } catch (error) {
      console.error('Error fetching logs:', error);
      toast.error('فشل في تحميل سجل الإشعارات');
    } finally {
      setLoading(false);
    }
  }, [page, typeFilter, statusFilter, stageFilter, searchTerm]);

  useEffect(() => { fetchLogs(); fetchKPIs(); }, [fetchLogs, fetchKPIs]);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel('notification-center-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'message_logs' }, () => {
        fetchLogs();
        fetchKPIs();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchLogs, fetchKPIs]);

  // Retry failed message
  const handleRetry = async (log: MessageLog) => {
    if (log.message_type !== 'whatsapp') {
      toast.error('إعادة الإرسال متاحة فقط لرسائل الواتساب');
      return;
    }
    setRetrying(log.id);
    try {
      const result = await sendCustomMessage(log.recipient, log.message_content, log.request_id || undefined);
      if (result.success) {
        // Update retry count
        await supabase.from('message_logs').update({ 
          retry_count: (log.retry_count || 0) + 1 
        }).eq('id', log.id);
        toast.success('تم إعادة الإرسال بنجاح');
        fetchLogs();
      }
    } catch {
      toast.error('فشل في إعادة الإرسال');
    } finally {
      setRetrying(null);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <PageContainer maxWidth="7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10">
            <Bell className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">مركز الإشعارات</h1>
            <p className="text-muted-foreground text-sm">
              إدارة ومراقبة جميع إشعارات التطبيق — WhatsApp أولاً
            </p>
          </div>
        </div>
        <Button onClick={() => { fetchLogs(); fetchKPIs(); }} variant="outline" disabled={loading}>
          <RefreshCw className={`h-4 w-4 ml-2 ${loading ? 'animate-spin' : ''}`} />
          تحديث
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
        {[
          { label: 'إجمالي', value: kpis.total, icon: BarChart3, className: 'text-primary' },
          { label: 'اليوم', value: kpis.todayCount, icon: Zap, className: 'text-amber-600' },
          { label: 'واتساب', value: kpis.whatsapp, icon: MessageSquare, className: 'text-green-600' },
          { label: 'بريد', value: kpis.email, icon: Mail, className: 'text-purple-600' },
          { label: 'تم التسليم', value: kpis.delivered, icon: CheckCircle, className: 'text-green-600' },
          { label: 'فشلت', value: kpis.failed, icon: XCircle, className: 'text-destructive' },
          { label: 'تمت القراءة', value: kpis.read, icon: Eye, className: 'text-blue-600' },
          { label: 'نسبة التسليم', value: `${kpis.deliveryRate}%`, icon: TrendingUp, className: 'text-emerald-600' },
        ].map((kpi) => (
          <Card key={kpi.label} className="border-border/50">
            <CardContent className="p-3 text-center">
              <kpi.icon className={`h-5 w-5 mx-auto mb-1 ${kpi.className}`} />
              <p className="text-xl font-bold">{kpi.value}</p>
              <p className="text-[10px] text-muted-foreground">{kpi.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="logs" className="space-y-4">
        <TabsList>
          <TabsTrigger value="logs">
            <Activity className="h-4 w-4 ml-1" />
            سجل الإشعارات
          </TabsTrigger>
          <TabsTrigger value="pipeline">
            <Send className="h-4 w-4 ml-1" />
            خط الإرسال
          </TabsTrigger>
        </TabsList>

        {/* ======== Logs Tab ======== */}
        <TabsContent value="logs" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3 p-4 bg-muted/30 rounded-lg">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="بحث بالرقم أو المحتوى..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                className="pr-10"
              />
            </div>
            <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1); }}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل القنوات</SelectItem>
                <SelectItem value="whatsapp">واتساب</SelectItem>
                <SelectItem value="email">بريد إلكتروني</SelectItem>
                <SelectItem value="sms">SMS</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الحالات</SelectItem>
                <SelectItem value="sent">تم الإرسال</SelectItem>
                <SelectItem value="delivered">تم التسليم</SelectItem>
                <SelectItem value="read">تمت القراءة</SelectItem>
                <SelectItem value="failed">فشل</SelectItem>
              </SelectContent>
            </Select>
            <Select value={stageFilter} onValueChange={(v) => { setStageFilter(v); setPage(1); }}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل المراحل</SelectItem>
                {Object.entries(STAGE_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-right w-12">القناة</TableHead>
                  <TableHead className="text-right">المرحلة</TableHead>
                  <TableHead className="text-right">المستلم</TableHead>
                  <TableHead className="text-right">المحتوى</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">التاريخ</TableHead>
                  <TableHead className="text-center w-20">إجراء</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  [...Array(8)].map((_, i) => (
                    <TableRow key={i}>
                      {[...Array(7)].map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-16">
                      <Bell className="h-12 w-12 mx-auto mb-4 opacity-20" />
                      <p className="text-muted-foreground">لا توجد إشعارات مطابقة</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => {
                    const typeInfo = TYPE_CONFIG[log.message_type] || TYPE_CONFIG.whatsapp;
                    const statusInfo = STATUS_MAP[log.status] || { label: log.status, variant: 'outline' as const };
                    const TypeIcon = typeInfo.icon;

                    return (
                      <TableRow key={log.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => setSelectedLog(log)}>
                        <TableCell>
                          <TypeIcon className={`h-4 w-4 ${typeInfo.className}`} />
                        </TableCell>
                        <TableCell>
                          {log.notification_stage ? (
                            <span className="text-xs">{STAGE_LABELS[log.notification_stage] || log.notification_stage}</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-sm" dir="ltr">
                          {log.recipient}
                        </TableCell>
                        <TableCell className="max-w-[200px]">
                          <p className="text-sm truncate">{log.message_content}</p>
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                          {log.retry_count > 0 && (
                            <span className="text-[10px] text-muted-foreground mr-1">↻{log.retry_count}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {format(new Date(log.created_at), 'dd/MM HH:mm', { locale: ar })}
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <div className="flex gap-1 justify-center">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedLog(log)}>
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            {log.status === 'failed' && log.message_type === 'whatsapp' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-primary"
                                disabled={retrying === log.id}
                                onClick={() => handleRetry(log)}
                              >
                                <RotateCcw className={`h-3.5 w-3.5 ${retrying === log.id ? 'animate-spin' : ''}`} />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {total} إشعار · صفحة {page} من {totalPages}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ======== Pipeline Tab ======== */}
        <TabsContent value="pipeline">
          <NotificationPipeline />
        </TabsContent>
      </Tabs>

      {/* Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="sm:max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              تفاصيل الإشعار
            </DialogTitle>
          </DialogHeader>
          {selectedLog && <NotificationDetail log={selectedLog} onRetry={handleRetry} retrying={retrying} />}
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}

// ==========================================
// Sub-components
// ==========================================

function NotificationDetail({ log, onRetry, retrying }: { log: MessageLog; onRetry: (l: MessageLog) => void; retrying: string | null }) {
  const typeInfo = TYPE_CONFIG[log.message_type] || TYPE_CONFIG.whatsapp;
  const statusInfo = STATUS_MAP[log.status] || { label: log.status, variant: 'outline' as const };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-muted-foreground text-xs">المستلم</p>
          <p className="font-mono" dir="ltr">{log.recipient}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">القناة</p>
          <div className="flex items-center gap-1">
            <typeInfo.icon className={`h-3.5 w-3.5 ${typeInfo.className}`} />
            <span>{typeInfo.label}</span>
          </div>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">الحالة</p>
          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">المزود</p>
          <p>{log.provider}</p>
        </div>
        {log.notification_stage && (
          <div>
            <p className="text-muted-foreground text-xs">المرحلة</p>
            <p>{STAGE_LABELS[log.notification_stage] || log.notification_stage}</p>
          </div>
        )}
        <div>
          <p className="text-muted-foreground text-xs">تاريخ الإرسال</p>
          <p>{format(new Date(log.created_at), 'dd/MM/yyyy HH:mm:ss', { locale: ar })}</p>
        </div>
        {log.delivered_at && (
          <div>
            <p className="text-muted-foreground text-xs">تاريخ التسليم</p>
            <p>{format(new Date(log.delivered_at), 'dd/MM/yyyy HH:mm:ss', { locale: ar })}</p>
          </div>
        )}
        {log.retry_count > 0 && (
          <div>
            <p className="text-muted-foreground text-xs">محاولات الإرسال</p>
            <p>{log.retry_count + 1}</p>
          </div>
        )}
      </div>

      {/* WhatsApp-style message preview */}
      <div>
        <p className="text-muted-foreground text-xs mb-1">محتوى الرسالة</p>
        <div className="bg-[hsl(var(--muted))] rounded-lg p-4">
          <div className="bg-background rounded-lg shadow-sm p-3 border">
            <p className="text-sm whitespace-pre-wrap leading-relaxed">{log.message_content}</p>
            <p className="text-[10px] text-muted-foreground text-left mt-2">
              {format(new Date(log.created_at), 'HH:mm')}
              {log.status === 'delivered' && ' ✓✓'}
              {log.status === 'read' && ' ✓✓'}
              {log.status === 'sent' && ' ✓'}
            </p>
          </div>
        </div>
      </div>

      {log.error_message && (
        <div className="bg-destructive/10 text-destructive p-3 rounded-lg text-sm">
          <p className="font-medium text-xs mb-1">سبب الفشل</p>
          {log.error_message}
        </div>
      )}

      <div className="flex gap-2 pt-2">
        {log.status === 'failed' && log.message_type === 'whatsapp' && (
          <Button size="sm" onClick={() => onRetry(log)} disabled={retrying === log.id}>
            <RotateCcw className={`h-4 w-4 ml-1 ${retrying === log.id ? 'animate-spin' : ''}`} />
            إعادة الإرسال
          </Button>
        )}
        {log.request_id && (
          <Button variant="outline" size="sm" onClick={() => window.location.href = `/requests/${log.request_id}`}>
            عرض الطلب المرتبط
          </Button>
        )}
      </div>
    </div>
  );
}

function NotificationPipeline() {
  const stages = [
    { key: 'received', label: 'استلام الطلب', icon: '📥', channels: ['whatsapp', 'email'] },
    { key: 'reviewed', label: 'مراجعة فنية', icon: '📝', channels: ['whatsapp', 'email'] },
    { key: 'scheduled', label: 'تحديد الموعد', icon: '🗓', channels: ['whatsapp', 'email'] },
    { key: 'on_the_way', label: 'الفني في الطريق', icon: '🚚', channels: ['whatsapp'] },
    { key: 'in_progress', label: 'جاري التنفيذ', icon: '🛠', channels: ['whatsapp'] },
    { key: 'completed', label: 'تم الانتهاء', icon: '✅', channels: ['whatsapp', 'email'] },
    { key: 'closed', label: 'إغلاق الطلب', icon: '🏁', channels: ['whatsapp', 'email'] },
  ];

  const [stageCounts, setStageCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const fetchCounts = async () => {
      const { data } = await supabase
        .from('message_logs')
        .select('notification_stage')
        .not('notification_stage', 'is', null);

      if (data) {
        const counts: Record<string, number> = {};
        data.forEach(row => {
          const stage = row.notification_stage as string;
          counts[stage] = (counts[stage] || 0) + 1;
        });
        setStageCounts(counts);
      }
    };
    fetchCounts();
  }, []);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            خط إرسال الإشعارات — دورة حياة الطلب
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-6">
            كل تغيير حالة مؤثر على العميل = إشعار WhatsApp فوري + بريد إلكتروني (حسب المرحلة)
          </p>
          
          <div className="relative">
            {/* Pipeline visual */}
            <div className="space-y-0">
              {stages.map((stage, index) => (
                <div key={stage.key} className="flex items-stretch gap-4">
                  {/* Timeline line */}
                  <div className="flex flex-col items-center w-8">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-lg border-2 ${
                      index === 0 ? 'border-primary bg-primary/10' : 'border-border bg-background'
                    }`}>
                      {stage.icon}
                    </div>
                    {index < stages.length - 1 && (
                      <div className="w-0.5 flex-1 bg-border min-h-[24px]" />
                    )}
                  </div>

                  {/* Stage info */}
                  <div className="flex-1 pb-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{stage.label}</p>
                        <div className="flex gap-1 mt-1">
                          {stage.channels.map(ch => (
                            <Badge key={ch} variant="outline" className="text-[10px] py-0">
                              {ch === 'whatsapp' ? '💬 واتساب' : '📧 بريد'}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="text-left">
                        <p className="text-lg font-bold text-foreground">{stageCounts[stage.key] || 0}</p>
                        <p className="text-[10px] text-muted-foreground">إشعار مُرسل</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Silent stages info */}
      <Card className="border-dashed">
        <CardContent className="p-4">
          <p className="text-sm font-medium mb-2">📵 المراحل الصامتة (بدون إشعارات)</p>
          <div className="flex flex-wrap gap-2">
            {['مسودة', 'انتظار قطع غيار', 'معلّق', 'ملغي', 'مفوتر'].map(s => (
              <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
