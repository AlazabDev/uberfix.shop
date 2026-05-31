import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function CustomerDetails() {
  const { id } = useParams();
  const [customer, setCustomer] = useState<any>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const [{ data: c }, { data: r }, { data: i }] = await Promise.all([
        (supabase as any).from("v_customers_dashboard").select("*").eq("id", id).maybeSingle(),
        (supabase as any)
          .from("maintenance_requests")
          .select("id, request_number, title, status, workflow_stage, estimated_cost, created_at")
          .eq("customer_id", id)
          .order("created_at", { ascending: false }),
        (supabase as any)
          .from("invoices")
          .select("id, invoice_number, total_amount, status, issue_date, paid_at")
          .eq("customer_id", id)
          .order("issue_date", { ascending: false }),
      ]);
      setCustomer(c);
      setRequests(r || []);
      setInvoices(i || []);
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <div className="container mx-auto p-6" dir="rtl">جاري التحميل...</div>;
  if (!customer) return <div className="container mx-auto p-6" dir="rtl">العميل غير موجود</div>;

  return (
    <div className="container mx-auto p-6 space-y-6" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <span>{customer.name || "بدون اسم"}</span>
            <Badge>{customer.customer_code}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div><span className="text-muted-foreground">الهاتف:</span> <span dir="ltr">{customer.phone}</span></div>
          <div><span className="text-muted-foreground">البريد:</span> {customer.email || "—"}</div>
          <div><span className="text-muted-foreground">عدد الطلبات:</span> {customer.requests_count}</div>
          <div><span className="text-muted-foreground">عدد الفواتير:</span> {customer.invoices_count}</div>
          <div><span className="text-muted-foreground">إجمالي مفوتر:</span> {Number(customer.total_billed).toFixed(2)}</div>
          <div><span className="text-muted-foreground">مدفوع:</span> {Number(customer.total_paid).toFixed(2)}</div>
          <div><span className="text-muted-foreground">مستحق:</span> {Number(customer.total_outstanding).toFixed(2)}</div>
          <div><span className="text-muted-foreground">متوسط التقييم:</span> {Number(customer.avg_rating).toFixed(2)}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>الطلبات ({requests.length})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الرقم</TableHead>
                <TableHead>العنوان</TableHead>
                <TableHead>المرحلة</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>التكلفة</TableHead>
                <TableHead>التاريخ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <Link to={`/maintenance/${r.id}`} className="text-primary underline">
                      {r.request_number || r.id.slice(0, 8)}
                    </Link>
                  </TableCell>
                  <TableCell>{r.title}</TableCell>
                  <TableCell><Badge variant="outline">{r.workflow_stage || "—"}</Badge></TableCell>
                  <TableCell>{r.status}</TableCell>
                  <TableCell>{Number(r.estimated_cost || 0).toFixed(2)}</TableCell>
                  <TableCell>{new Date(r.created_at).toLocaleDateString("ar-EG")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>الفواتير ({invoices.length})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>رقم الفاتورة</TableHead>
                <TableHead>الإجمالي</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>تاريخ الإصدار</TableHead>
                <TableHead>تاريخ الدفع</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell>{inv.invoice_number || inv.id.slice(0, 8)}</TableCell>
                  <TableCell>{Number(inv.total_amount || 0).toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant={inv.status === "paid" ? "default" : "secondary"}>
                      {inv.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{inv.issue_date ? new Date(inv.issue_date).toLocaleDateString("ar-EG") : "—"}</TableCell>
                  <TableCell>{inv.paid_at ? new Date(inv.paid_at).toLocaleDateString("ar-EG") : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}