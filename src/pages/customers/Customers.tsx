import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface CustomerRow {
  id: string;
  customer_code: string | null;
  name: string | null;
  phone: string;
  email: string | null;
  is_active: boolean;
  requests_count: number;
  invoices_count: number;
  total_billed: number;
  total_paid: number;
  total_outstanding: number;
  avg_rating: number;
  last_request_at: string | null;
}

export default function Customers() {
  const [rows, setRows] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      const { data, error } = await (supabase as any)
        .from("v_customers_dashboard")
        .select("*")
        .order("last_request_at", { ascending: false })
        .limit(500);
      if (!error) setRows((data as CustomerRow[]) || []);
      setLoading(false);
    })();
  }, []);

  const filtered = rows.filter((r) => {
    const s = q.trim().toLowerCase();
    if (!s) return true;
    return (
      (r.name || "").toLowerCase().includes(s) ||
      (r.phone || "").toLowerCase().includes(s) ||
      (r.email || "").toLowerCase().includes(s) ||
      (r.customer_code || "").toLowerCase().includes(s)
    );
  });

  return (
    <div className="container mx-auto p-6" dir="rtl">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle className="text-2xl">العملاء ({rows.length})</CardTitle>
          <Input
            placeholder="بحث بالاسم / الهاتف / الكود..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="max-w-xs"
          />
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">جاري التحميل...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الكود</TableHead>
                  <TableHead>الاسم</TableHead>
                  <TableHead>الهاتف</TableHead>
                  <TableHead>الطلبات</TableHead>
                  <TableHead>الفواتير</TableHead>
                  <TableHead>إجمالي مفوتر</TableHead>
                  <TableHead>مدفوع</TableHead>
                  <TableHead>مستحق</TableHead>
                  <TableHead>التقييم</TableHead>
                  <TableHead>آخر طلب</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Link to={`/customers/${c.id}`} className="text-primary underline">
                        {c.customer_code || "—"}
                      </Link>
                    </TableCell>
                    <TableCell>{c.name || "—"}</TableCell>
                    <TableCell dir="ltr">{c.phone}</TableCell>
                    <TableCell>{c.requests_count}</TableCell>
                    <TableCell>{c.invoices_count}</TableCell>
                    <TableCell>{Number(c.total_billed).toFixed(2)}</TableCell>
                    <TableCell>{Number(c.total_paid).toFixed(2)}</TableCell>
                    <TableCell>
                      {Number(c.total_outstanding) > 0 ? (
                        <Badge variant="destructive">{Number(c.total_outstanding).toFixed(2)}</Badge>
                      ) : (
                        <Badge variant="secondary">0.00</Badge>
                      )}
                    </TableCell>
                    <TableCell>{Number(c.avg_rating).toFixed(2)}</TableCell>
                    <TableCell>
                      {c.last_request_at ? new Date(c.last_request_at).toLocaleDateString("ar-EG") : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}