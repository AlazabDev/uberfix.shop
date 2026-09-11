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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ClipboardList,
  Building2,
  Wallet,
  Search,
  Eye,
  Wrench,
  RotateCcw,
} from "lucide-react";

interface LedgerRow {
  id: string;
  request_number: string | null;
  title: string | null;
  stage: string | null;
  status_group: string | null;
  service_type: string | null;
  category_name: string | null;
  branch_name: string | null;
  branch_city: string | null;
  client_name: string | null;
  technician_name: string | null;
  technician_specialization: string | null;
  items_count: number;
  items_total: number;
  invoice_number: string | null;
  invoice_status: string | null;
  invoice_amount: number;
  rating: number | null;
  created_at: string;
  closed_at: string | null;
}

const PAGE_SIZE = 50;
const ALL = "__all__";

const currency = (value: number) =>
  `${Number(value || 0).toLocaleString("ar-EG", { maximumFractionDigits: 2 })} ج.م`;

const stageLabels: Record<string, string> = {
  draft: "مسودة",
  submitted: "مُقدَّم",
  triaged: "تم الفرز",
  assigned: "مُسند",
  scheduled: "مجدول",
  in_progress: "قيد التنفيذ",
  inspection: "فحص",
  waiting_parts: "بانتظار قطع",
  on_hold: "معلق",
  completed: "منجز",
  billed: "تم الفوترة",
  paid: "محصّل",
  handover_to_admin: "تسليم للإدارة",
  closed: "مغلق",
  cancelled: "ملغي",
  rejected: "مرفوض",
};

const invoiceLabels: Record<string, string> = {
  paid: "مدفوعة",
  pending: "قيد التحصيل",
  draft: "بحاجة لتسعير",
  cancelled: "ملغاة",
};

export default function RequestsLedger() {
  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [branch, setBranch] = useState(ALL);
  const [trade, setTrade] = useState(ALL);
  const [stage, setStage] = useState(ALL);
  const [invoiceStatus, setInvoiceStatus] = useState(ALL);
  const [page, setPage] = useState(0);

  const [branches, setBranches] = useState<string[]>([]);
  const [trades, setTrades] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("v_maintenance_requests_full")
        .select("branch_name, service_type")
        .limit(5000);
      const rowsData = (data || []) as { branch_name: string | null; service_type: string | null }[];
      setBranches(
        Array.from(new Set(rowsData.map((r) => r.branch_name).filter(Boolean) as string[])).sort(
          (a, b) => a.localeCompare(b, "ar")
        )
      );
      setTrades(
        Array.from(new Set(rowsData.map((r) => r.service_type).filter(Boolean) as string[])).sort(
          (a, b) => a.localeCompare(b, "ar")
        )
      );
    })();
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    (async () => {
      let query = supabase
        .from("v_maintenance_requests_full")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

      if (branch !== ALL) query = query.eq("branch_name", branch);
      if (trade !== ALL) query = query.eq("service_type", trade);
      if (stage !== ALL) query = query.eq("stage", stage as never);
      if (invoiceStatus !== ALL) query = query.eq("invoice_status", invoiceStatus);
      if (search.trim()) {
        const term = `%${search.trim()}%`;
        query = query.or(
          `request_number.ilike.${term},title.ilike.${term},client_name.ilike.${term},invoice_number.ilike.${term}`
        );
      }

      const { data, error: fetchError, count } = await query;
      if (!active) return;
      if (fetchError) setError(fetchError.message);
      else {
        setError(null);
        setRows((data || []) as unknown as LedgerRow[]);
        setTotal(count || 0);
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [branch, trade, stage, invoiceStatus, search, page]);

  const pageStats = useMemo(() => {
    const amount = rows.reduce((s, r) => s + Number(r.invoice_amount || 0), 0);
    const closed = rows.filter((r) => r.stage === "closed").length;
    return { amount, closed };
  }, [rows]);

  const resetFilters = () => {
    setSearch("");
    setBranch(ALL);
    setTrade(ALL);
    setStage(ALL);
    setInvoiceStatus(ALL);
    setPage(0);
  };

  const lastPage = Math.max(0, Math.ceil(total / PAGE_SIZE) - 1);

  return (
    <PageContainer>
      <div className="space-y-6" dir="rtl">
        <div>
          <h1 className="text-2xl font-bold">سجل طلبات الصيانة</h1>
          <p className="text-muted-foreground text-sm">
            كل الطلبات بدورة حياة كاملة: الفرع، المهنة، الفني، البنود والفاتورة
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">إجمالي الطلبات</CardTitle>
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="text-2xl font-bold">
              {total.toLocaleString("ar-EG")}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">مغلق في هذه الصفحة</CardTitle>
              <Wrench className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="text-2xl font-bold">{pageStats.closed}</CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">قيمة فواتير الصفحة</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="text-2xl font-bold">{currency(pageStats.amount)}</CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">الفلاتر</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-5">
            <div className="relative md:col-span-1">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
                placeholder="رقم الطلب أو العنوان أو العميل"
                className="pr-9"
              />
            </div>

            <Select
              value={branch}
              onValueChange={(v) => {
                setBranch(v);
                setPage(0);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="الفرع" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value={ALL}>كل الفروع</SelectItem>
                {branches.map((b) => (
                  <SelectItem key={b} value={b}>
                    {b}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={trade}
              onValueChange={(v) => {
                setTrade(v);
                setPage(0);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="المهنة" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value={ALL}>كل المهن</SelectItem>
                {trades.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={stage}
              onValueChange={(v) => {
                setStage(v);
                setPage(0);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="المرحلة" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value={ALL}>كل المراحل</SelectItem>
                {Object.entries(stageLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex gap-2">
              <Select
                value={invoiceStatus}
                onValueChange={(v) => {
                  setInvoiceStatus(v);
                  setPage(0);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="الفاتورة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>كل الفواتير</SelectItem>
                  {Object.entries(invoiceLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={resetFilters} title="إعادة تعيين">
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            {error && <p className="text-sm text-destructive mb-4">{error}</p>}
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>رقم الطلب</TableHead>
                      <TableHead>العنوان</TableHead>
                      <TableHead>الفرع</TableHead>
                      <TableHead>المهنة</TableHead>
                      <TableHead>الفني</TableHead>
                      <TableHead>البنود</TableHead>
                      <TableHead>المرحلة</TableHead>
                      <TableHead>الفاتورة</TableHead>
                      <TableHead>القيمة</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-mono text-xs">{r.request_number}</TableCell>
                        <TableCell className="max-w-[240px] truncate" title={r.title || ""}>
                          {r.title}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <span className="inline-flex items-center gap-1">
                            <Building2 className="h-3 w-3 text-muted-foreground" />
                            {r.branch_name || "—"}
                          </span>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{r.service_type || "—"}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          {r.technician_name || "—"}
                        </TableCell>
                        <TableCell>{r.items_count}</TableCell>
                        <TableCell>
                          <Badge variant={r.stage === "closed" ? "default" : "secondary"}>
                            {stageLabels[r.stage || ""] || r.stage}
                          </Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {r.invoice_number ? (
                            <span className="flex flex-col">
                              <span className="font-mono text-xs">{r.invoice_number}</span>
                              <span className="text-xs text-muted-foreground">
                                {invoiceLabels[r.invoice_status || ""] || r.invoice_status}
                              </span>
                            </span>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {currency(r.invoice_amount)}
                        </TableCell>
                        <TableCell>
                          <Button asChild variant="ghost" size="icon">
                            <Link to={`/requests/${r.id}`}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {rows.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                          لا توجد نتائج مطابقة للفلاتر
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}

            <div className="flex items-center justify-between pt-4">
              <span className="text-sm text-muted-foreground">
                صفحة {page + 1} من {lastPage + 1}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                >
                  السابق
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= lastPage}
                  onClick={() => setPage((p) => p + 1)}
                >
                  التالي
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
