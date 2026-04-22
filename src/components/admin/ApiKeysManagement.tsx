import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Copy, KeyRound, Loader2, Plus, RefreshCw, Trash2, Power, AlertTriangle } from 'lucide-react';

interface ApiConsumer {
  id: string;
  name: string;
  channel: string;
  is_active: boolean;
  rate_limit_per_minute: number;
  allowed_origins: string[] | null;
  api_key_prefix: string | null;
  last_used_at: string | null;
  last_rotated_at: string | null;
  total_requests: number;
  created_at: string;
}

const CHANNELS = ['bot', 'web', 'mobile', 'integration', 'webhook'];

export function ApiKeysManagement() {
  const { toast } = useToast();
  const [items, setItems] = useState<ApiConsumer[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [revealKey, setRevealKey] = useState<{ key: string; name: string } | null>(null);

  // form state
  const [name, setName] = useState('');
  const [channel, setChannel] = useState('bot');
  const [rateLimit, setRateLimit] = useState(60);
  const [origins, setOrigins] = useState('');

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('api_consumers')
      .select('id,name,channel,is_active,rate_limit_per_minute,allowed_origins,api_key_prefix,last_used_at,last_rotated_at,total_requests,created_at')
      .order('created_at', { ascending: false });
    if (error) {
      toast({ title: 'تعذر تحميل المفاتيح', description: error.message, variant: 'destructive' });
    } else {
      setItems((data ?? []) as ApiConsumer[]);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!name.trim() || name.trim().length < 2) {
      toast({ title: 'الاسم مطلوب', description: 'أدخل اسماً وصفياً للمفتاح', variant: 'destructive' });
      return;
    }
    setCreating(true);
    const allowed = origins.split(',').map(s => s.trim()).filter(Boolean);
    const { data, error } = await supabase.rpc('fn_create_api_consumer', {
      p_name: name.trim(),
      p_channel: channel,
      p_rate_limit: rateLimit,
      p_allowed_origins: allowed.length ? allowed : null,
    });
    setCreating(false);
    if (error) {
      toast({ title: 'فشل إنشاء المفتاح', description: error.message, variant: 'destructive' });
      return;
    }
    const result = data as { api_key: string };
    setCreateOpen(false);
    setRevealKey({ key: result.api_key, name: name.trim() });
    setName(''); setChannel('bot'); setRateLimit(60); setOrigins('');
    load();
  };

  const handleRotate = async (id: string, itemName: string) => {
    const { data, error } = await supabase.rpc('fn_rotate_api_consumer', { p_id: id });
    if (error) {
      toast({ title: 'فشل تدوير المفتاح', description: error.message, variant: 'destructive' });
      return;
    }
    const result = data as { api_key: string };
    setRevealKey({ key: result.api_key, name: itemName });
    load();
  };

  const handleToggle = async (id: string, active: boolean) => {
    const { error } = await supabase.rpc('fn_toggle_api_consumer', { p_id: id, p_active: active });
    if (error) {
      toast({ title: 'فشل التحديث', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: active ? 'تم التفعيل' : 'تم التعطيل' });
    load();
  };

  const handleRevoke = async (id: string) => {
    const { error } = await supabase.rpc('fn_revoke_api_consumer', { p_id: id });
    if (error) {
      toast({ title: 'فشل الإلغاء', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'تم إلغاء المفتاح' });
    load();
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'تم النسخ' });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            مفاتيح API
          </CardTitle>
          <CardDescription>إدارة وإنشاء مفاتيح الوصول لبوابة API والروبوتات</CardDescription>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 ml-2" />إنشاء مفتاح جديد</Button>
          </DialogTrigger>
          <DialogContent dir="rtl">
            <DialogHeader>
              <DialogTitle>إنشاء مفتاح API جديد</DialogTitle>
              <DialogDescription>سيُعرض المفتاح مرة واحدة فقط بعد الإنشاء.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>الاسم الوصفي *</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="مثال: WhatsApp Bot - فرع المعادي" />
              </div>
              <div>
                <Label>القناة</Label>
                <Select value={channel} onValueChange={setChannel}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CHANNELS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>حد الطلبات/دقيقة</Label>
                <Input type="number" min={1} max={10000} value={rateLimit}
                  onChange={e => setRateLimit(parseInt(e.target.value) || 60)} />
              </div>
              <div>
                <Label>النطاقات المسموحة (اختياري، مفصولة بفواصل)</Label>
                <Input value={origins} onChange={e => setOrigins(e.target.value)}
                  placeholder="https://example.com, https://app.example.com" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>إلغاء</Button>
              <Button onClick={handleCreate} disabled={creating}>
                {creating && <Loader2 className="h-4 w-4 ml-2 animate-spin" />}
                إنشاء
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            لا توجد مفاتيح. أنشئ أول مفتاح للبدء.
          </div>
        ) : (
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الاسم</TableHead>
                  <TableHead>القناة</TableHead>
                  <TableHead>المعرف</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>الحد/دقيقة</TableHead>
                  <TableHead>إجمالي الطلبات</TableHead>
                  <TableHead>آخر استخدام</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map(item => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell><Badge variant="outline">{item.channel}</Badge></TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {item.api_key_prefix ?? '—'}…
                      </code>
                    </TableCell>
                    <TableCell>
                      <Badge variant={item.is_active ? 'default' : 'secondary'}>
                        {item.is_active ? 'نشط' : 'معطل'}
                      </Badge>
                    </TableCell>
                    <TableCell>{item.rate_limit_per_minute}</TableCell>
                    <TableCell>{item.total_requests.toLocaleString('ar-EG')}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {item.last_used_at ? new Date(item.last_used_at).toLocaleString('ar-EG') : '—'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="outline" title="تدوير المفتاح">
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent dir="rtl">
                            <AlertDialogHeader>
                              <AlertDialogTitle>تدوير المفتاح؟</AlertDialogTitle>
                              <AlertDialogDescription>
                                سيتم إلغاء المفتاح الحالي فوراً. أي عميل يستخدمه سيتوقف حتى يحصل على المفتاح الجديد.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>إلغاء</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleRotate(item.id, item.name)}>
                                نعم، دوّر المفتاح
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>

                        <Button size="sm" variant="outline"
                          title={item.is_active ? 'تعطيل' : 'تفعيل'}
                          onClick={() => handleToggle(item.id, !item.is_active)}>
                          <Power className="h-4 w-4" />
                        </Button>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="outline" className="text-destructive" title="إلغاء نهائي">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent dir="rtl">
                            <AlertDialogHeader>
                              <AlertDialogTitle>إلغاء المفتاح نهائياً؟</AlertDialogTitle>
                              <AlertDialogDescription>
                                هذا الإجراء لا يمكن التراجع عنه. المفتاح "{item.name}" سيتم حذفه.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>إلغاء</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-destructive text-destructive-foreground"
                                onClick={() => handleRevoke(item.id)}>
                                نعم، احذف
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Reveal-once dialog */}
      <Dialog open={!!revealKey} onOpenChange={(o) => !o && setRevealKey(null)}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              احفظ المفتاح الآن
            </DialogTitle>
            <DialogDescription>
              هذا المفتاح لن يظهر مرة أخرى. خزّنه في مكان آمن. ({revealKey?.name})
            </DialogDescription>
          </DialogHeader>
          <div className="bg-muted p-4 rounded-lg break-all font-mono text-sm">
            {revealKey?.key}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => revealKey && copy(revealKey.key)}>
              <Copy className="h-4 w-4 ml-2" />نسخ
            </Button>
            <Button onClick={() => setRevealKey(null)}>تم الحفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}