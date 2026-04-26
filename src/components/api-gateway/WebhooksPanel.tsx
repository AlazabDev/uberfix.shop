import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  Webhook, Plus, Power, Trash2, Loader2, AlertTriangle, Copy, Activity,
} from 'lucide-react';

interface Subscription {
  id: string;
  consumer_id: string;
  endpoint_url: string;
  event_types: string[];
  is_active: boolean;
  description: string | null;
  failure_count: number;
  last_delivery_at: string | null;
  last_delivery_status: string | null;
  created_at: string;
}
interface ConsumerLite { id: string; name: string }
interface Delivery {
  id: string;
  subscription_id: string;
  event_type: string;
  status: string;
  attempt_number: number;
  response_status: number | null;
  delivered_at: string | null;
  created_at: string;
  error_message: string | null;
}

const EVENT_TYPES = [
  'maintenance_request.created',
  'maintenance_request.assigned',
  'maintenance_request.status_changed',
  'maintenance_request.completed',
  'invoice.created',
  'invoice.paid',
  'technician.location_updated',
];

export function WebhooksPanel() {
  const { toast } = useToast();
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [consumers, setConsumers] = useState<ConsumerLite[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [revealSecret, setRevealSecret] = useState<string | null>(null);
  const [inspectId, setInspectId] = useState<string | null>(null);

  const [consumerId, setConsumerId] = useState('');
  const [endpoint, setEndpoint] = useState('');
  const [description, setDescription] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);

  const load = async () => {
    setLoading(true);
    const [s, c, d] = await Promise.all([
      supabase.from('api_webhook_subscriptions').select('*').order('created_at', { ascending: false }),
      supabase.from('api_consumers').select('id,name').order('name'),
      supabase.from('api_webhook_deliveries').select('*').order('created_at', { ascending: false }).limit(50),
    ]);
    if (s.error) toast({ title: 'تعذر تحميل الاشتراكات', description: s.error.message, variant: 'destructive' });
    else setSubs((s.data ?? []) as Subscription[]);
    if (!c.error) setConsumers((c.data ?? []) as ConsumerLite[]);
    if (!d.error) setDeliveries((d.data ?? []) as Delivery[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!consumerId || !endpoint || selectedEvents.length === 0) {
      toast({ title: 'بيانات ناقصة', description: 'اختر مستهلك، رابط، وأحداث', variant: 'destructive' });
      return;
    }
    setCreating(true);
    const { data, error } = await supabase.rpc('fn_create_webhook_subscription', {
      p_consumer_id: consumerId,
      p_endpoint_url: endpoint,
      p_event_types: selectedEvents,
      p_description: description || null,
    });
    setCreating(false);
    if (error) return toast({ title: 'فشل', description: error.message, variant: 'destructive' });
    setCreateOpen(false);
    setRevealSecret((data as any).secret);
    setConsumerId(''); setEndpoint(''); setDescription(''); setSelectedEvents([]);
    load();
  };

  const toggle = async (id: string, active: boolean) => {
    const { error } = await supabase.rpc('fn_toggle_webhook_subscription', { p_id: id, p_active: active });
    if (error) return toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.rpc('fn_delete_webhook_subscription', { p_id: id });
    if (error) return toast({ title: 'فشل الحذف', description: error.message, variant: 'destructive' });
    toast({ title: 'تم الحذف' });
    load();
  };

  const consumerName = (id: string) => consumers.find(c => c.id === id)?.name ?? '—';
  const deliveriesFor = (subId: string) => deliveries.filter(d => d.subscription_id === subId);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Webhook className="h-5 w-5" />
              اشتراكات Webhooks
            </CardTitle>
            <CardDescription>الشركاء يستقبلون أحداث الصيانة والفواتير عبر HTTPS موقّعة بـ HMAC-SHA256</CardDescription>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 ml-2" />اشتراك جديد</Button>
            </DialogTrigger>
            <DialogContent dir="rtl" className="max-w-lg">
              <DialogHeader>
                <DialogTitle>إنشاء اشتراك Webhook</DialogTitle>
                <DialogDescription>سيُعرض الـ secret مرة واحدة بعد الإنشاء.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>المستهلك *</Label>
                  <Select value={consumerId} onValueChange={setConsumerId}>
                    <SelectTrigger><SelectValue placeholder="اختر شريك" /></SelectTrigger>
                    <SelectContent>
                      {consumers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>رابط الاستقبال *</Label>
                  <Input value={endpoint} onChange={e => setEndpoint(e.target.value)}
                    placeholder="https://partner.com/webhooks/uberfix" />
                </div>
                <div>
                  <Label>الوصف</Label>
                  <Input value={description} onChange={e => setDescription(e.target.value)} />
                </div>
                <div>
                  <Label className="mb-2 block">الأحداث *</Label>
                  <div className="grid grid-cols-1 gap-2 max-h-48 overflow-auto">
                    {EVENT_TYPES.map(ev => (
                      <label key={ev} className="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="checkbox"
                          checked={selectedEvents.includes(ev)}
                          onChange={() => setSelectedEvents(prev =>
                            prev.includes(ev) ? prev.filter(x => x !== ev) : [...prev, ev]
                          )}
                          className="rounded border-input" />
                        <code className="text-xs">{ev}</code>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)}>إلغاء</Button>
                <Button onClick={create} disabled={creating}>
                  {creating && <Loader2 className="h-4 w-4 ml-2 animate-spin" />}
                  إنشاء
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : subs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">لا توجد اشتراكات.</div>
          ) : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>المستهلك</TableHead>
                    <TableHead>الرابط</TableHead>
                    <TableHead>الأحداث</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>الفشل</TableHead>
                    <TableHead>آخر تسليم</TableHead>
                    <TableHead>الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subs.map(s => (
                    <TableRow key={s.id}>
                      <TableCell>{consumerName(s.consumer_id)}</TableCell>
                      <TableCell className="max-w-xs truncate text-xs"><code>{s.endpoint_url}</code></TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {s.event_types.slice(0, 2).map(e => (
                            <Badge key={e} variant="outline" className="text-[10px]">{e.split('.')[1] ?? e}</Badge>
                          ))}
                          {s.event_types.length > 2 && <Badge variant="outline" className="text-[10px]">+{s.event_types.length - 2}</Badge>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={s.is_active ? 'default' : 'secondary'}>{s.is_active ? 'نشط' : 'معطل'}</Badge>
                      </TableCell>
                      <TableCell>
                        <span className={s.failure_count > 0 ? 'text-destructive font-medium' : ''}>
                          {s.failure_count}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {s.last_delivery_at ? new Date(s.last_delivery_at).toLocaleString('ar-EG') : '—'}
                        {s.last_delivery_status && (
                          <Badge variant="outline" className="ml-1 text-[10px]">{s.last_delivery_status}</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" title="عرض التسليمات"
                            onClick={() => setInspectId(s.id)}>
                            <Activity className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => toggle(s.id, !s.is_active)}>
                            <Power className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="outline" className="text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent dir="rtl">
                              <AlertDialogHeader>
                                <AlertDialogTitle>حذف الاشتراك؟</AlertDialogTitle>
                                <AlertDialogDescription>سيتوقف إرسال الأحداث إلى هذا الرابط.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                <AlertDialogAction className="bg-destructive text-destructive-foreground"
                                  onClick={() => remove(s.id)}>حذف</AlertDialogAction>
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
      </Card>

      <Dialog open={!!revealSecret} onOpenChange={(o) => !o && setRevealSecret(null)}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />احفظ الـ webhook secret
            </DialogTitle>
            <DialogDescription>يُستخدم للتحقق من توقيع X-UberFix-Signature (HMAC-SHA256). لن يظهر مرة أخرى.</DialogDescription>
          </DialogHeader>
          <div className="bg-muted p-4 rounded-lg break-all font-mono text-sm">{revealSecret}</div>
          <DialogFooter>
            <Button variant="outline" onClick={() => revealSecret && (navigator.clipboard.writeText(revealSecret), toast({ title: 'تم النسخ' }))}>
              <Copy className="h-4 w-4 ml-2" />نسخ
            </Button>
            <Button onClick={() => setRevealSecret(null)}>تم</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!inspectId} onOpenChange={(o) => !o && setInspectId(null)}>
        <DialogContent dir="rtl" className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>سجل التسليمات</DialogTitle>
            <DialogDescription>آخر محاولات التسليم لهذا الاشتراك</DialogDescription>
          </DialogHeader>
          <div className="overflow-auto max-h-96">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الحدث</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>المحاولة</TableHead>
                  <TableHead>HTTP</TableHead>
                  <TableHead>الوقت</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(inspectId ? deliveriesFor(inspectId) : []).map(d => (
                  <TableRow key={d.id}>
                    <TableCell className="text-xs"><code>{d.event_type}</code></TableCell>
                    <TableCell>
                      <Badge variant={d.status === 'delivered' ? 'default' : d.status === 'failed' ? 'destructive' : 'secondary'}>
                        {d.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{d.attempt_number}</TableCell>
                    <TableCell>{d.response_status ?? '—'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(d.created_at).toLocaleString('ar-EG')}
                    </TableCell>
                  </TableRow>
                ))}
                {inspectId && deliveriesFor(inspectId).length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">لا تسليمات بعد.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}