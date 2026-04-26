import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import {
  Copy, KeyRound, Loader2, Plus, RefreshCw, Trash2, Power, AlertTriangle,
  Settings2, ShieldCheck, Cloud,
} from 'lucide-react';

interface Consumer {
  id: string;
  name: string;
  channel: string;
  is_active: boolean;
  rate_limit_per_minute: number;
  allowed_origins: string[] | null;
  api_key_prefix: string | null;
  client_secret_hash: string | null;
  scopes: string[];
  auth_type: string;
  storage_target: string;
  last_used_at: string | null;
  last_rotated_at: string | null;
  total_requests: number;
  created_at: string;
}

const CHANNELS = ['bot', 'web', 'mobile', 'integration', 'webhook', 'partner'];
const AUTH_TYPES = ['api_key', 'oauth2', 'hybrid'] as const;
const STORAGE_TARGETS = ['local', 'aws', 'gcs', 'oci'] as const;
const AVAILABLE_SCOPES = [
  'requests:read',
  'requests:write',
  'properties:read',
  'properties:write',
  'technicians:read',
  'invoices:read',
  'webhooks:manage',
  'media:upload',
];

type Reveal = { kind: 'api_key' | 'client_secret'; value: string; clientId?: string; name: string };

export function ConsumersPanel() {
  const { toast } = useToast();
  const [items, setItems] = useState<Consumer[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Consumer | null>(null);
  const [reveal, setReveal] = useState<Reveal | null>(null);

  const [name, setName] = useState('');
  const [channel, setChannel] = useState('partner');
  const [rateLimit, setRateLimit] = useState(120);
  const [origins, setOrigins] = useState('');

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('api_consumers')
      .select('id,name,channel,is_active,rate_limit_per_minute,allowed_origins,api_key_prefix,client_secret_hash,scopes,auth_type,storage_target,last_used_at,last_rotated_at,total_requests,created_at')
      .order('created_at', { ascending: false });
    if (error) {
      toast({ title: 'تعذر التحميل', description: error.message, variant: 'destructive' });
    } else {
      setItems((data ?? []) as Consumer[]);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!name.trim() || name.trim().length < 2) {
      toast({ title: 'الاسم مطلوب', variant: 'destructive' });
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
      toast({ title: 'فشل الإنشاء', description: error.message, variant: 'destructive' });
      return;
    }
    const result = data as { api_key: string };
    setCreateOpen(false);
    setReveal({ kind: 'api_key', value: result.api_key, name: name.trim() });
    setName(''); setChannel('partner'); setRateLimit(120); setOrigins('');
    load();
  };

  const rotateKey = async (id: string, n: string) => {
    const { data, error } = await supabase.rpc('fn_rotate_api_consumer', { p_id: id });
    if (error) return toast({ title: 'فشل التدوير', description: error.message, variant: 'destructive' });
    setReveal({ kind: 'api_key', value: (data as any).api_key, name: n });
    load();
  };

  const issueClientSecret = async (id: string, n: string) => {
    const { data, error } = await supabase.rpc('fn_issue_client_secret', { p_id: id });
    if (error) return toast({ title: 'فشل الإصدار', description: error.message, variant: 'destructive' });
    const r = data as { client_id: string; client_secret: string };
    setReveal({ kind: 'client_secret', value: r.client_secret, clientId: r.client_id, name: n });
    load();
  };

  const toggleActive = async (id: string, active: boolean) => {
    const { error } = await supabase.rpc('fn_toggle_api_consumer', { p_id: id, p_active: active });
    if (error) return toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    toast({ title: active ? 'تم التفعيل' : 'تم التعطيل' });
    load();
  };

  const revoke = async (id: string) => {
    const { error } = await supabase.rpc('fn_revoke_api_consumer', { p_id: id });
    if (error) return toast({ title: 'فشل الحذف', description: error.message, variant: 'destructive' });
    toast({ title: 'تم الحذف' });
    load();
  };

  const copy = (t: string) => {
    navigator.clipboard.writeText(t);
    toast({ title: 'تم النسخ' });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            مستهلكي البوابة
          </CardTitle>
          <CardDescription>إدارة الشركاء، API Keys، OAuth2 client_secret، الصلاحيات، وجهة التخزين</CardDescription>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 ml-2" />مستهلك جديد</Button>
          </DialogTrigger>
          <DialogContent dir="rtl">
            <DialogHeader>
              <DialogTitle>إنشاء مستهلك API</DialogTitle>
              <DialogDescription>سيُعرض الـ API key مرة واحدة فقط بعد الإنشاء.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>الاسم الوصفي *</Label>
                <Input value={name} onChange={e => setName(e.target.value)}
                  placeholder="مثال: شريك التوصيل — جمعية" />
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
                <Label>حد الطلبات / دقيقة</Label>
                <Input type="number" min={1} max={10000} value={rateLimit}
                  onChange={e => setRateLimit(parseInt(e.target.value) || 120)} />
              </div>
              <div>
                <Label>النطاقات المسموحة (اختياري)</Label>
                <Input value={origins} onChange={e => setOrigins(e.target.value)}
                  placeholder="https://partner.com, https://app.partner.com" />
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
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : items.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">لا يوجد مستهلكون. أنشئ أول واحد.</div>
        ) : (
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الاسم</TableHead>
                  <TableHead>القناة</TableHead>
                  <TableHead>المصادقة</TableHead>
                  <TableHead>التخزين</TableHead>
                  <TableHead>Scopes</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>الحد/د</TableHead>
                  <TableHead>الطلبات</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map(it => (
                  <TableRow key={it.id}>
                    <TableCell>
                      <div className="font-medium">{it.name}</div>
                      <code className="text-xs text-muted-foreground">{it.api_key_prefix ?? '—'}…</code>
                    </TableCell>
                    <TableCell><Badge variant="outline">{it.channel}</Badge></TableCell>
                    <TableCell>
                      <Badge variant={it.auth_type === 'oauth2' ? 'default' : 'secondary'}>
                        {it.auth_type}
                      </Badge>
                      {it.client_secret_hash && (
                        <ShieldCheck className="h-3 w-3 inline mr-1 text-emerald-600" />
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1 text-xs">
                        <Cloud className="h-3 w-3" />
                        {it.storage_target}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-[180px]">
                        {(it.scopes ?? []).slice(0, 2).map(s => (
                          <Badge key={s} variant="outline" className="text-[10px]">{s}</Badge>
                        ))}
                        {(it.scopes?.length ?? 0) > 2 && (
                          <Badge variant="outline" className="text-[10px]">+{(it.scopes?.length ?? 0) - 2}</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={it.is_active ? 'default' : 'secondary'}>
                        {it.is_active ? 'نشط' : 'معطل'}
                      </Badge>
                    </TableCell>
                    <TableCell>{it.rate_limit_per_minute}</TableCell>
                    <TableCell>{it.total_requests.toLocaleString('ar-EG')}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" title="إعدادات"
                          onClick={() => setEditTarget(it)}>
                          <Settings2 className="h-4 w-4" />
                        </Button>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="outline" title="تدوير API key">
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent dir="rtl">
                            <AlertDialogHeader>
                              <AlertDialogTitle>تدوير الـ API key؟</AlertDialogTitle>
                              <AlertDialogDescription>
                                المفتاح الحالي سيتوقف فوراً.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>إلغاء</AlertDialogCancel>
                              <AlertDialogAction onClick={() => rotateKey(it.id, it.name)}>تدوير</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="outline" title="إصدار client_secret (OAuth2)">
                              <ShieldCheck className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent dir="rtl">
                            <AlertDialogHeader>
                              <AlertDialogTitle>إصدار client_secret جديد؟</AlertDialogTitle>
                              <AlertDialogDescription>
                                سيُستخدم في تدفّق OAuth2 client_credentials. أي secret سابق سيُلغى.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>إلغاء</AlertDialogCancel>
                              <AlertDialogAction onClick={() => issueClientSecret(it.id, it.name)}>إصدار</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>

                        <Button size="sm" variant="outline" title={it.is_active ? 'تعطيل' : 'تفعيل'}
                          onClick={() => toggleActive(it.id, !it.is_active)}>
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
                              <AlertDialogTitle>حذف "{it.name}" نهائياً؟</AlertDialogTitle>
                              <AlertDialogDescription>هذا الإجراء لا يمكن التراجع عنه.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>إلغاء</AlertDialogCancel>
                              <AlertDialogAction className="bg-destructive text-destructive-foreground"
                                onClick={() => revoke(it.id)}>حذف</AlertDialogAction>
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

      <EditConsumerDialog
        consumer={editTarget}
        onClose={() => setEditTarget(null)}
        onSaved={() => { setEditTarget(null); load(); }}
      />

      <Dialog open={!!reveal} onOpenChange={(o) => !o && setReveal(null)}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              {reveal?.kind === 'api_key' ? 'احفظ الـ API key الآن' : 'احفظ الـ client_secret الآن'}
            </DialogTitle>
            <DialogDescription>لن يظهر مرة أخرى — {reveal?.name}</DialogDescription>
          </DialogHeader>
          {reveal?.kind === 'client_secret' && reveal.clientId && (
            <div className="space-y-2">
              <Label>client_id</Label>
              <div className="bg-muted p-3 rounded font-mono text-xs break-all">{reveal.clientId}</div>
            </div>
          )}
          <Label>{reveal?.kind === 'api_key' ? 'API key' : 'client_secret'}</Label>
          <div className="bg-muted p-4 rounded-lg break-all font-mono text-sm">{reveal?.value}</div>
          <DialogFooter>
            <Button variant="outline" onClick={() => reveal && copy(reveal.value)}>
              <Copy className="h-4 w-4 ml-2" />نسخ
            </Button>
            <Button onClick={() => setReveal(null)}>تم الحفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function EditConsumerDialog({
  consumer, onClose, onSaved,
}: { consumer: Consumer | null; onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast();
  const [scopes, setScopes] = useState<string[]>([]);
  const [authType, setAuthType] = useState<typeof AUTH_TYPES[number]>('api_key');
  const [storageTarget, setStorageTarget] = useState<typeof STORAGE_TARGETS[number]>('local');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (consumer) {
      setScopes(consumer.scopes ?? []);
      setAuthType((consumer.auth_type as any) ?? 'api_key');
      setStorageTarget((consumer.storage_target as any) ?? 'local');
    }
  }, [consumer]);

  const toggleScope = (s: string) =>
    setScopes(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);

  const save = async () => {
    if (!consumer) return;
    setSaving(true);
    const { error } = await supabase.rpc('fn_update_api_consumer_extended', {
      p_id: consumer.id,
      p_scopes: scopes,
      p_auth_type: authType,
      p_storage_target: storageTarget,
    });
    setSaving(false);
    if (error) return toast({ title: 'فشل الحفظ', description: error.message, variant: 'destructive' });
    toast({ title: 'تم الحفظ' });
    onSaved();
  };

  return (
    <Dialog open={!!consumer} onOpenChange={(o) => !o && onClose()}>
      <DialogContent dir="rtl" className="max-w-lg">
        <DialogHeader>
          <DialogTitle>إعدادات: {consumer?.name}</DialogTitle>
          <DialogDescription>الصلاحيات، نوع المصادقة، وجهة التخزين</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>نوع المصادقة</Label>
            <Select value={authType} onValueChange={(v) => setAuthType(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {AUTH_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>وجهة التخزين</Label>
            <Select value={storageTarget} onValueChange={(v) => setStorageTarget(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STORAGE_TARGETS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-2 block">Scopes</Label>
            <div className="grid grid-cols-2 gap-2">
              {AVAILABLE_SCOPES.map(s => (
                <label key={s} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={scopes.includes(s)}
                    onChange={() => toggleScope(s)}
                    className="rounded border-input"
                  />
                  <code className="text-xs">{s}</code>
                </label>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>إلغاء</Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 ml-2 animate-spin" />}
            حفظ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}