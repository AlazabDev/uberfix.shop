import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowRight } from "lucide-react";

interface Voucher {
  id: string;
  voucher_no: string;
  voucher_date: string;
  branch_name: string;
  branch_name_raw: string | null;
  branch_location_id: string | null;
  items_count: number;
  total_amount: number;
  status: string;
  notes: string | null;
}

interface Item {
  id: string;
  seq: number | null;
  description: string;
  unit: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

const currency = (value: number) =>
  `${Number(value || 0).toLocaleString("ar-EG", { maximumFractionDigits: 2 })} ج.م`;

export default function ReceiptVoucherDetails() {
  const { id } = useParams<{ id: string }>();
  const [voucher, setVoucher] = useState<Voucher | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let active = true;
    (async () => {
      const [headRes, itemsRes] = await Promise.all([
        supabase.from("receipt_vouchers").select("*").eq("id", id).maybeSingle(),
        supabase
          .from("receipt_voucher_items")
          .select("*")
          .eq("voucher_id", id)
          .order("seq", { ascending: true }),
      ]);

      if (!active) return;
      if (headRes.error || itemsRes.error) {
        setError(headRes.error?.message || itemsRes.error?.message || "خطأ غير معروف");
      } else {
        setVoucher(headRes.data as unknown as Voucher);
        setItems((itemsRes.data || []) as unknown as Item[]);
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [id]);

  return (
    <PageContainer>
      <div className="space-y-6" dir="rtl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">
              إذن استلام {voucher?.voucher_no ?? ""}
            </h1>
            <p className="text-muted-foreground">{voucher?.branch_name}</p>
          </div>
          <Button asChild variant="outline">
            <Link to="/receipts">
              <ArrowRight className="h-4 w-4 me-1" />
              رجوع للسجل
            </Link>
          </Button>
        </div>

        {error && (
          <Card className="border-destructive">
            <CardContent className="p-4 text-destructive text-sm">
              تعذر تحميل الإذن: {error}
            </CardContent>
          </Card>
        )}

        {loading ? (
          <Skeleton className="h-32 w-full" />
        ) : (
          voucher && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">التاريخ</p>
                  <p className="font-semibold">{voucher.voucher_date}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">عدد البنود</p>
                  <p className="font-semibold">{voucher.items_count}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">الإجمالي</p>
                  <p className="font-semibold">{currency(voucher.total_amount)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground mb-1">ربط الفرع</p>
                  {voucher.branch_location_id ? (
                    <Badge variant="secondary">{voucher.branch_location_id}</Badge>
                  ) : (
                    <Badge variant="outline">غير مرتبط</Badge>
                  )}
                </CardContent>
              </Card>
            </div>
          )
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">بنود الإذن</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">م</TableHead>
                    <TableHead className="text-right">البيان</TableHead>
                    <TableHead className="text-right">الوحدة</TableHead>
                    <TableHead className="text-right">الكمية</TableHead>
                    <TableHead className="text-right">سعر الوحدة</TableHead>
                    <TableHead className="text-right">الإجمالي</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading &&
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={6}>
                          <Skeleton className="h-6 w-full" />
                        </TableCell>
                      </TableRow>
                    ))}
                  {!loading &&
                    items.map((item, index) => (
                      <TableRow key={item.id}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>{item.description}</TableCell>
                        <TableCell>{item.unit}</TableCell>
                        <TableCell>{Number(item.quantity)}</TableCell>
                        <TableCell>{currency(item.unit_price)}</TableCell>
                        <TableCell className="font-semibold">
                          {currency(item.total_price)}
                        </TableCell>
                      </TableRow>
                    ))}
                  {!loading && items.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        لا توجد بنود
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
