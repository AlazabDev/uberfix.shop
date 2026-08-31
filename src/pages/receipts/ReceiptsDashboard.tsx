import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { FileText, Layers, Building2, Wallet, Search, Eye } from "lucide-react";

interface VoucherRow {
  id: string;
  voucher_no: string;
  voucher_date: string;
  branch_name: string;
  branch_location_id: string | null;
  branch_location_name: string | null;
  items_count: number;
  total_amount: number;
  status: string;
  month_bucket: string;
}

const currency = (value: number) =>
  `${Number(value || 0).toLocaleString("ar-EG", { maximumFractionDigits: 2 })} ج.م`;

export default function ReceiptsDashboard() {
  const [rows, setRows] = useState<VoucherRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error: fetchError } = await supabase
        .from("v_receipt_vouchers_dashboard")
        .select("*")
        .order("voucher_date", { ascending: false })
        .limit(1000);

      if (!active) return;
      if (fetchError) {
        setError(fetchError.message);
      } else {
        setRows((data || []) as unknown as VoucherRow[]);
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  const stats = useMemo(() => {
    const totalAmount = rows.reduce((sum, r) => sum + Number(r.total_amount || 0), 0);
    const totalItems = rows.reduce((sum, r) => sum + Number(r.items_count || 0), 0);
    const branches = new Set(rows.map((r) => r.branch_name)).size;
    return { count: rows.length, totalAmount, totalItems, branches };
  }, [rows]);

  const monthly = useMemo(() => {
    const map = new Map<string, number>();
    rows.forEach((r) => {
      const key = String(r.month_bucket || r.voucher_date || "").slice(0, 7);
      if (!key) return;
      map.set(key, (map.get(key) || 0) + Number(r.total_amount || 0));
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, amount]) => ({ month, amount }));
  }, [rows]);

  const topBranches = useMemo(() => {
    const map = new Map<string, number>();
    rows.forEach((r) => {
      const key = r.branch_name || "غير محدد";
      map.set(key, (map.get(key) || 0) + Number(r.total_amount || 0));
    });
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([branch, amount]) => ({ branch, amount }));
  }, [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.voucher_no?.toLowerCase().includes(q) ||
        r.branch_name?.toLowerCase().includes(q)
    );
  }, [rows, query]);

  const statCards = [
    { title: "إجمالي الأذونات", value: stats.count.toLocaleString("ar-EG"), icon: FileText },
    { title: "إجمالي البنود", value: stats.totalItems.toLocaleString("ar-EG"), icon: Layers },
    { title: "عدد الفروع", value: stats.branches.toLocaleString("ar-EG"), icon: Building2 },
    { title: "إجمالي القيمة", value: currency(stats.totalAmount), icon: Wallet },
  ];

  return (
    <PageContainer>
      <div className="space-y-6" dir="rtl">
        <div>
          <h1 className="text-3xl font-bold">أذونات الاستلام</h1>
          <p className="text-muted-foreground">
            سجل أعمال الصيانة المنفذة وقيمها مصنفة حسب الفرع والتاريخ
          </p>
        </div>

        {error && (
          <Card className="border-destructive">
            <CardContent className="p-4 text-destructive text-sm">
              تعذر تحميل البيانات: {error}
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat) => (
            <Card key={stat.title}>
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{stat.title}</p>
                  {loading ? (
                    <Skeleton className="h-8 w-24" />
                  ) : (
                    <p className="text-2xl font-bold">{stat.value}</p>
                  )}
                </div>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <stat.icon className="h-6 w-6 text-primary" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">القيمة الشهرية</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthly}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis width={70} className="text-xs" />
                    <Tooltip
                      formatter={(value: number) => [currency(value), "القيمة"]}
                      contentStyle={{ direction: "rtl" }}
                    />
                    <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">أعلى 10 فروع بالقيمة</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topBranches.map((item) => (
                  <div key={item.branch} className="flex items-center justify-between gap-4">
                    <span className="text-sm truncate">{item.branch}</span>
                    <span className="text-sm font-semibold whitespace-nowrap">
                      {currency(item.amount)}
                    </span>
                  </div>
                ))}
                {!loading && topBranches.length === 0 && (
                  <p className="text-sm text-muted-foreground">لا توجد بيانات</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <CardTitle className="text-lg">سجل الأذونات</CardTitle>
            <div className="relative w-full max-w-xs">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ابحث برقم الإذن أو الفرع"
                className="pr-9"
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">رقم الإذن</TableHead>
                    <TableHead className="text-right">التاريخ</TableHead>
                    <TableHead className="text-right">الفرع</TableHead>
                    <TableHead className="text-right">البنود</TableHead>
                    <TableHead className="text-right">القيمة</TableHead>
                    <TableHead className="text-right">الربط</TableHead>
                    <TableHead className="text-right">إجراء</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading &&
                    Array.from({ length: 6 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={7}>
                          <Skeleton className="h-6 w-full" />
                        </TableCell>
                      </TableRow>
                    ))}
                  {!loading &&
                    filtered.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium">{row.voucher_no}</TableCell>
                        <TableCell>{row.voucher_date}</TableCell>
                        <TableCell>{row.branch_name}</TableCell>
                        <TableCell>{row.items_count}</TableCell>
                        <TableCell>{currency(row.total_amount)}</TableCell>
                        <TableCell>
                          {row.branch_location_id ? (
                            <Badge variant="secondary">{row.branch_location_id}</Badge>
                          ) : (
                            <Badge variant="outline">غير مرتبط</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button asChild variant="ghost" size="sm">
                            <Link to={`/receipts/${row.id}`}>
                              <Eye className="h-4 w-4 me-1" />
                              عرض
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  {!loading && filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        لا توجد أذونات مطابقة
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
