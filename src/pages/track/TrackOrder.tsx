import { useEffect, useState } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  CheckCircle2, Clock, Truck, Wrench, FileText, Calendar,
  Phone, MessageCircle, Star, Loader2, AlertCircle, Home,
  Shield, Search, Copy, ExternalLink, Timer, MapPin,
  Zap, ChevronLeft
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { openWhatsApp } from '@/config/whatsapp';
import { useToast } from '@/hooks/use-toast';

interface RequestData {
  id: string;
  request_number: string;
  title: string;
  description?: string;
  status: string;
  workflow_stage: string;
  created_at: string;
  updated_at?: string;
  client_name?: string;
  client_phone?: string;
  location?: string;
  priority?: string;
  service_type?: string;
  sla_due_date?: string;
  assigned_technician_id?: string;
  rating?: number;
  branch_name?: string;
  channel?: string;
}

const TRACKING_STAGES = [
  { key: 'received', label: 'تم الاستلام', labelEn: 'Received', icon: FileText, description: 'تم استلام طلبك بنجاح' },
  { key: 'reviewed', label: 'قيد المراجعة', labelEn: 'Reviewed', icon: CheckCircle2, description: 'جاري مراجعة التفاصيل وتحديد الفني' },
  { key: 'scheduled', label: 'تم الجدولة', labelEn: 'Scheduled', icon: Calendar, description: 'تم تحديد موعد الزيارة' },
  { key: 'on_the_way', label: 'في الطريق', labelEn: 'On the way', icon: Truck, description: 'الفني في طريقه إليك' },
  { key: 'in_progress', label: 'جاري التنفيذ', labelEn: 'In Progress', icon: Wrench, description: 'يتم العمل على طلبك الآن' },
  { key: 'completed', label: 'تم الانتهاء', labelEn: 'Completed', icon: CheckCircle2, description: 'تم إنجاز العمل بنجاح' },
  { key: 'closed', label: 'مغلق', labelEn: 'Closed', icon: Star, description: 'تم إغلاق الطلب' },
];

const WORKFLOW_MAP: Record<string, string> = {
  'draft': 'received', 'submitted': 'received',
  'acknowledged': 'reviewed', 'assigned': 'reviewed',
  'scheduled': 'scheduled', 'on_the_way': 'on_the_way',
  'in_progress': 'in_progress', 'inspection': 'in_progress',
  'completed': 'completed', 'billed': 'completed',
  'paid': 'closed', 'closed': 'closed',
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  high: { label: 'عاجل', color: 'bg-red-500/10 text-red-600 border-red-500/30' },
  medium: { label: 'متوسط', color: 'bg-amber-500/10 text-amber-600 border-amber-500/30' },
  low: { label: 'عادي', color: 'bg-green-500/10 text-green-600 border-green-500/30' },
};

const SERVICE_ICONS: Record<string, string> = {
  plumbing: '🔧', electrical: '⚡', ac: '❄️', carpentry: '🪚',
  metalwork: '⚙️', painting: '🎨', cleaning: '🧹', other: '🛠️',
};

const SERVICE_LABELS: Record<string, string> = {
  plumbing: 'سباكة', electrical: 'كهرباء', ac: 'تكييف', carpentry: 'نجارة',
  metalwork: 'حدادة', painting: 'دهانات', cleaning: 'تنظيف', other: 'أخرى',
};

export default function TrackOrder() {
  const { orderId } = useParams<{ orderId: string }>();
  const [searchParams] = useSearchParams();
  const [request, setRequest] = useState<RequestData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const { toast } = useToast();

  const fetchByQuery = async (query: string) => {
    // Use public RPC that supports UUID, request_number, and phone lookup
    const { data, error } = await supabase
      .rpc('public_track_request', { query_text: query.trim() });
    
    if (error) return { data: null, error };
    if (!data || data.length === 0) {
      return { data: null, error: { code: 'PGRST116', message: 'Not found' } as any };
    }
    // If single result, return it; if multiple (phone search), return array
    return { data: data.length === 1 ? data[0] : data, error: null };
  };

  const loadRequest = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await fetchByIdOrNumber(id);
      if (fetchError) {
        setError(fetchError.code === 'PGRST116' ? 'لم يتم العثور على الطلب' : 'حدث خطأ في تحميل البيانات');
        return;
      }
      setRequest(data);
    } catch {
      setError('حدث خطأ غير متوقع');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (orderId) {
      loadRequest(orderId);
      const channel = supabase
        .channel(`track-${orderId}`)
        .on('postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'maintenance_requests', filter: `id=eq.${orderId}` },
          (payload) => setRequest(payload.new as RequestData)
        )
        .subscribe();
      return () => { channel.unsubscribe(); };
    } else {
      setLoading(false);
    }
  }, [orderId]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const { data, error } = await fetchByIdOrNumber(searchQuery.trim());
      if (error || !data) {
        toast({ title: 'لم يتم العثور على الطلب', description: 'تأكد من رقم الطلب وحاول مرة أخرى', variant: 'destructive' });
      } else {
        setRequest(data);
        setError(null);
      }
    } catch {
      toast({ title: 'خطأ', description: 'حدث خطأ أثناء البحث', variant: 'destructive' });
    } finally {
      setSearching(false);
    }
  };

  const copyRequestNumber = () => {
    if (request?.request_number) {
      navigator.clipboard.writeText(request.request_number);
      toast({ title: '✓ تم النسخ', description: 'تم نسخ رقم الطلب' });
    }
  };

  const getStages = () => {
    if (!request) return [];
    const currentKey = WORKFLOW_MAP[request.workflow_stage || 'submitted'] || 'received';
    const currentIdx = TRACKING_STAGES.findIndex(s => s.key === currentKey);
    return TRACKING_STAGES.map((stage, i) => ({
      ...stage,
      status: i < currentIdx ? 'completed' as const : i === currentIdx ? 'current' as const : 'pending' as const,
    }));
  };

  const getSlaInfo = () => {
    if (!request?.sla_due_date) return null;
    const due = new Date(request.sla_due_date);
    const now = new Date();
    const isOverdue = due < now;
    const distance = formatDistanceToNow(due, { locale: ar, addSuffix: true });
    return { isOverdue, distance, due };
  };

  // ─── Search-only mode (no orderId) ───
  if (!orderId && !request) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary/5 via-background to-background" dir="rtl">
        <div className="max-w-lg mx-auto px-4 pt-16 pb-8">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
              <Search className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2">تتبع طلبك</h1>
            <p className="text-muted-foreground">أدخل رقم الطلب لمعرفة حالته</p>
          </div>

          <Card className="border-2 border-primary/10">
            <CardContent className="pt-6">
              <div className="flex gap-2">
                <Input
                  placeholder="MR-26-01016"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="text-lg font-mono h-12"
                  dir="ltr"
                />
                <Button onClick={handleSearch} disabled={searching} className="h-12 px-6">
                  {searching ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-3 text-center">
                مثال: MR-26-01016 أو UUID الطلب
              </p>
            </CardContent>
          </Card>

          <div className="text-center mt-8">
            <Link to="/" className="text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1">
              <Home className="h-4 w-4" />
              العودة للرئيسية
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ─── Loading ───
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary/5 via-background to-background flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="absolute inset-0 animate-ping opacity-20 bg-primary rounded-full w-16 h-16 mx-auto" />
            <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto relative" />
          </div>
          <p className="text-muted-foreground mt-6 text-lg">جاري تحميل بيانات الطلب...</p>
        </div>
      </div>
    );
  }

  // ─── Error ───
  if (error || !request) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary/5 via-background to-background flex items-center justify-center p-4" dir="rtl">
        <Card className="max-w-md w-full border-destructive/20">
          <CardContent className="pt-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10 mb-4">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <h2 className="text-xl font-bold mb-2">لم يتم العثور على الطلب</h2>
            <p className="text-muted-foreground mb-6">{error || 'تأكد من رقم الطلب وحاول مرة أخرى'}</p>
            
            <div className="flex gap-2 mb-4">
              <Input
                placeholder="أدخل رقم الطلب"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="font-mono"
                dir="ltr"
              />
              <Button onClick={handleSearch} disabled={searching}>
                {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>

            <Link to="/">
              <Button variant="ghost" className="text-muted-foreground">
                <Home className="ml-2 h-4 w-4" />
                العودة للرئيسية
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const stages = getStages();
  const currentStage = stages.find(s => s.status === 'current');
  const sla = getSlaInfo();
  const progress = Math.round(((stages.filter(s => s.status === 'completed').length) / (stages.length - 1)) * 100);
  const serviceIcon = SERVICE_ICONS[request.service_type || 'other'] || '🛠️';
  const serviceLabel = SERVICE_LABELS[request.service_type || 'other'] || request.service_type;
  const priorityConfig = PRIORITY_CONFIG[request.priority || 'medium'];

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 via-background to-background" dir="rtl">
      {/* ─── Branded Header ─── */}
      <div className="bg-primary text-primary-foreground">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight">UberFix</h1>
              <p className="text-xs opacity-80">نظام تتبع الطلبات</p>
            </div>
          </div>
          <Link to="/">
            <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-white/10">
              <Home className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* ─── Request Number Hero Card ─── */}
        <Card className="overflow-hidden border-0 shadow-lg">
          <div className="bg-gradient-to-l from-primary/10 to-primary/5 p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">رقم الطلب</p>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold font-mono text-foreground tracking-wide" dir="ltr">
                    {request.request_number || request.id.substring(0, 8).toUpperCase()}
                  </span>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={copyRequestNumber}>
                    <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </div>
              </div>
              {priorityConfig && (
                <Badge variant="outline" className={`${priorityConfig.color} text-xs font-semibold`}>
                  <Zap className="h-3 w-3 ml-1" />
                  {priorityConfig.label}
                </Badge>
              )}
            </div>

            {/* ─── Progress Bar ─── */}
            <div className="mb-4">
              <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                <span>{currentStage?.label}</span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-l from-primary to-primary/70 rounded-full transition-all duration-700"
                  style={{ width: `${Math.max(progress, 5)}%` }}
                />
              </div>
            </div>

            {/* ─── Quick Info Grid ─── */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-background/60 backdrop-blur rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{serviceIcon}</span>
                  <span className="text-sm font-semibold text-foreground">{serviceLabel}</span>
                </div>
                <p className="text-xs text-muted-foreground">نوع الخدمة</p>
              </div>
              <div className="bg-background/60 backdrop-blur rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-semibold text-foreground">
                    {format(new Date(request.created_at), 'dd/MM', { locale: ar })}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">تاريخ الإنشاء</p>
              </div>
            </div>

            {/* SLA Timer */}
            {sla && (
              <div className={`mt-3 flex items-center gap-2 rounded-lg p-2.5 text-sm ${
                sla.isOverdue 
                  ? 'bg-red-500/10 text-red-600' 
                  : 'bg-green-500/10 text-green-600'
              }`}>
                <Timer className="h-4 w-4" />
                <span className="font-medium">
                  {sla.isOverdue ? 'متأخر: ' : 'الموعد المتوقع: '}
                  {sla.distance}
                </span>
              </div>
            )}
          </div>

          {/* Description */}
          {(request.title || request.description) && (
            <CardContent className="pt-4 pb-4">
              {request.title && <h3 className="font-semibold text-foreground mb-1">{request.title}</h3>}
              {request.description && <p className="text-sm text-muted-foreground">{request.description}</p>}
              {request.location && (
                <p className="text-sm text-muted-foreground mt-2 flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" /> {request.location}
                </p>
              )}
            </CardContent>
          )}
        </Card>

        {/* ─── Timeline ─── */}
        <Card className="border-0 shadow-lg">
          <CardContent className="pt-5 pb-4">
            <h2 className="font-bold text-base mb-5 flex items-center gap-2">
              <div className="w-1 h-5 rounded-full bg-primary" />
              مسار الطلب
            </h2>
            <div className="relative">
              {stages.map((stage, index) => {
                const Icon = stage.icon;
                const isLast = index === stages.length - 1;
                
                return (
                  <div key={stage.key} className="flex gap-4 relative">
                    {/* Connector line */}
                    {!isLast && (
                      <div className="absolute right-[19px] top-10 bottom-0 w-0.5">
                        <div className={`h-full ${
                          stage.status === 'completed' 
                            ? 'bg-gradient-to-b from-green-500 to-green-500' 
                            : stage.status === 'current'
                            ? 'bg-gradient-to-b from-primary to-muted'
                            : 'bg-muted'
                        }`} />
                      </div>
                    )}

                    {/* Icon */}
                    <div className="relative z-10">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                        stage.status === 'completed' 
                          ? 'bg-green-500 text-white shadow-lg shadow-green-500/20' 
                          : stage.status === 'current'
                          ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30 ring-4 ring-primary/20'
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        <Icon className="h-4.5 w-4.5" />
                      </div>
                    </div>

                    {/* Content */}
                    <div className={`flex-1 pb-7 ${isLast ? 'pb-0' : ''}`}>
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold text-sm ${
                          stage.status === 'pending' ? 'text-muted-foreground' : 'text-foreground'
                        }`}>
                          {stage.label}
                        </span>
                        {stage.status === 'current' && (
                          <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
                          </span>
                        )}
                      </div>
                      {stage.status !== 'pending' && (
                        <p className="text-xs text-muted-foreground mt-0.5">{stage.description}</p>
                      )}
                      {stage.status === 'current' && request.updated_at && (
                        <p className="text-xs text-primary/70 mt-1 font-medium">
                          {format(new Date(request.updated_at), 'dd MMMM yyyy - hh:mm a', { locale: ar })}
                        </p>
                      )}
                      {stage.status === 'completed' && (
                        <p className="text-xs text-green-600/70 mt-0.5">✓ تم</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* ─── Actions ─── */}
        <Card className="border-0 shadow-lg">
          <CardContent className="pt-5 pb-5">
            <h2 className="font-bold text-base mb-4 flex items-center gap-2">
              <div className="w-1 h-5 rounded-full bg-primary" />
              تحتاج مساعدة؟
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <Button 
                variant="outline" 
                className="h-14 flex-col gap-1 border-green-500/30 hover:bg-green-500/5 hover:border-green-500/50"
                onClick={() => openWhatsApp(`مرحباً، أريد الاستفسار عن الطلب رقم: ${request.request_number || request.id.substring(0, 8)}`)}
              >
                <MessageCircle className="h-5 w-5 text-green-600" />
                <span className="text-xs font-medium">واتساب</span>
              </Button>
              <a href="tel:+15557285727" className="contents">
                <Button variant="outline" className="h-14 flex-col gap-1">
                  <Phone className="h-5 w-5 text-primary" />
                  <span className="text-xs font-medium">اتصل بنا</span>
                </Button>
              </a>
            </div>

            {(request.workflow_stage === 'completed' || request.workflow_stage === 'closed') && !request.rating && (
              <Button className="w-full mt-3 h-12 bg-amber-500 hover:bg-amber-600 text-white font-semibold">
                <Star className="ml-2 h-5 w-5" />
                قيّم الخدمة
              </Button>
            )}
          </CardContent>
        </Card>

        {/* ─── Search Another ─── */}
        <Card className="border-0 shadow-lg bg-muted/30">
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-muted-foreground mb-2 text-center">تتبع طلب آخر</p>
            <div className="flex gap-2">
              <Input
                placeholder="أدخل رقم الطلب..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="font-mono text-sm h-10"
                dir="ltr"
              />
              <Button size="sm" onClick={handleSearch} disabled={searching} className="h-10 px-4">
                {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ─── Footer ─── */}
        <div className="text-center py-4 space-y-2">
          <p className="text-sm text-muted-foreground">
            شكراً لثقتك في <span className="font-bold text-primary">UberFix</span>
          </p>
          <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
            <Shield className="h-3 w-3" />
            <span>بياناتك محمية ومشفرة</span>
          </div>
        </div>
      </div>
    </div>
  );
}
