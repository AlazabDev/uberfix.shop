import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageSquare, Mail, CheckCircle, Clock, XCircle, Search, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface MessageLog {
  id: string;
  recipient: string;
  message_type: 'sms' | 'whatsapp' | 'email';
  message_content: string;
  provider: string;
  status: string;
  external_id: string;
  sent_at: string;
  delivered_at?: string;
  error_message?: string;
  metadata?: any;
  request_id?: string;
}

export default function MessageLogs() {
  const [logs, setLogs] = useState<MessageLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const { toast } = useToast();

  const fetchLogs = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('message_logs')
        .select('*')
        .order('sent_at', { ascending: false })
        .limit(100);

      if (typeFilter !== 'all') {
        query = query.eq('message_type', typeFilter);
      }

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (searchTerm) {
        query = query.or(`recipient.ilike.%${searchTerm}%,message_content.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setLogs((data || []) as MessageLog[]);
    } catch (error) {
      console.error('Error fetching message logs:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في تحميل سجل الرسائل',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [typeFilter, statusFilter]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered':
      case 'sent':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'queued':
      case 'sending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'failed':
      case 'undelivered':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'whatsapp':
        return <MessageSquare className="h-4 w-4 text-green-600" />;
      case 'sms':
        return <MessageSquare className="h-4 w-4 text-blue-600" />;
      case 'email':
        return <Mail className="h-4 w-4 text-purple-600" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      delivered: { variant: 'default', className: 'bg-green-500' },
      sent: { variant: 'default', className: 'bg-green-500' },
      queued: { variant: 'secondary', className: 'bg-yellow-500' },
      sending: { variant: 'secondary', className: 'bg-blue-500' },
      failed: { variant: 'destructive', className: 'bg-red-500' },
      undelivered: { variant: 'destructive', className: 'bg-red-500' }
    };

    const config = variants[status] || { variant: 'outline' };

    return (
      <Badge {...config}>
        {status === 'delivered' ? 'تم التسليم' :
         status === 'sent' ? 'تم الإرسال' :
         status === 'queued' ? 'في الانتظار' :
         status === 'sending' ? 'جاري الإرسال' :
         status === 'failed' ? 'فشل' :
         status === 'undelivered' ? 'لم يتم التسليم' : status}
      </Badge>
    );
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = !searchTerm || 
      log.recipient.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.message_content.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">سجل الرسائل</h1>
          <p className="text-muted-foreground">
            سجل جميع الرسائل المرسلة عبر SMS و WhatsApp
          </p>
        </div>
        <Button onClick={fetchLogs} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ml-2 ${loading ? 'animate-spin' : ''}`} />
          تحديث
        </Button>
      </div>

      {/* الفلاتر */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="بحث في الرسائل أو الأرقام..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10"
              />
            </div>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="نوع الرسالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الأنواع</SelectItem>
                <SelectItem value="sms">رسائل نصية (SMS)</SelectItem>
                <SelectItem value="whatsapp">واتساب</SelectItem>
                <SelectItem value="email">بريد إلكتروني</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحالات</SelectItem>
                <SelectItem value="delivered">تم التسليم</SelectItem>
                <SelectItem value="sent">تم الإرسال</SelectItem>
                <SelectItem value="queued">في الانتظار</SelectItem>
                <SelectItem value="failed">فشل</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* قائمة الرسائل */}
      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <Card>
            <CardContent className="p-6 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">جاري التحميل...</p>
            </CardContent>
          </Card>
        ) : filteredLogs.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">لا توجد رسائل</p>
            </CardContent>
          </Card>
        ) : (
          filteredLogs.map((log) => (
            <Card key={log.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getTypeIcon(log.message_type)}
                    <div>
                      <CardTitle className="text-base">
                        {log.recipient}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {new Date(log.sent_at).toLocaleString('ar-EG')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(log.status)}
                    {getStatusBadge(log.status)}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm text-foreground">
                    {log.message_content}
                  </p>
                  
                  {log.error_message && (
                    <div className="bg-destructive/10 text-destructive p-2 rounded text-sm">
                      خطأ: {log.error_message}
                    </div>
                  )}

                  {log.metadata && (
                    <div className="flex gap-4 text-xs text-muted-foreground pt-2 border-t">
                      {log.metadata.price && (
                        <span>التكلفة: {log.metadata.price} {log.metadata.price_unit}</span>
                      )}
                      {log.metadata.num_segments && (
                        <span>الأجزاء: {log.metadata.num_segments}</span>
                      )}
                      <span>المزود: {log.provider}</span>
                      {log.external_id && (
                        <span className="font-mono">ID: {log.external_id.slice(0, 10)}...</span>
                      )}
                    </div>
                  )}

                  {log.request_id && (
                    <Button
                      variant="link"
                      size="sm"
                      className="p-0 h-auto"
                      onClick={() => window.location.href = `/requests/${log.request_id}`}
                    >
                      عرض طلب الصيانة
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
