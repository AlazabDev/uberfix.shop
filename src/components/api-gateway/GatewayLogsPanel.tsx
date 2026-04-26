import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { ScrollText, Loader2, RefreshCcw } from 'lucide-react';

interface LogRow {
  id: string;
  request_id: string;
  method: string;
  route: string;
  status_code: number;
  duration_ms: number;
  consumer_id: string | null;
  consumer_type: string | null;
  client_ip: string | null;
  user_agent: string | null;
  created_at: string;
}

function statusVariant(code: number): 'default' | 'secondary' | 'destructive' {
  if (code >= 500) return 'destructive';
  if (code >= 400) return 'secondary';
  return 'default';
}

export function GatewayLogsPanel() {
  const { toast } = useToast();
  const [rows, setRows] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('api_gateway_logs')
      .select('id,request_id,method,route,status_code,duration_ms,consumer_id,consumer_type,client_ip,user_agent,created_at')
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) toast({ title: 'تعذر التحميل', description: error.message, variant: 'destructive' });
    else setRows((data ?? []) as unknown as LogRow[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = rows.filter(r => {
    if (!filter) return true;
    const f = filter.toLowerCase();
    return r.route.toLowerCase().includes(f)
      || r.method.toLowerCase().includes(f)
      || String(r.status_code).includes(f)
      || (r.consumer_id ?? '').includes(f);
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <ScrollText className="h-5 w-5" />سجل البوابة
          </CardTitle>
          <CardDescription>آخر 200 طلب مرّ عبر maintenance-gateway / bot-gateway</CardDescription>
        </div>
        <div className="flex gap-2">
          <Input value={filter} onChange={e => setFilter(e.target.value)}
            placeholder="بحث: route, method, status, consumer_id" className="w-72" />
          <Button variant="outline" onClick={load} disabled={loading}>
            <RefreshCcw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">لا سجلات.</div>
        ) : (
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الوقت</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>المسار</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>المدة</TableHead>
                  <TableHead>المستهلك</TableHead>
                  <TableHead>IP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(r.created_at).toLocaleString('ar-EG')}
                    </TableCell>
                    <TableCell><Badge variant="outline">{r.method}</Badge></TableCell>
                    <TableCell className="text-xs"><code>{r.route}</code></TableCell>
                    <TableCell><Badge variant={statusVariant(r.status_code)}>{r.status_code}</Badge></TableCell>
                    <TableCell className="text-xs">{r.duration_ms}ms</TableCell>
                    <TableCell className="text-xs">
                      {r.consumer_type && <Badge variant="outline" className="text-[10px] mr-1">{r.consumer_type}</Badge>}
                      <code className="text-[10px] text-muted-foreground">{r.consumer_id?.slice(0, 8) ?? '—'}</code>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{r.client_ip ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}