import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle } from "lucide-react";

interface Props {
  /** يُستدعى عند الضغط على "عرض الطلبات" لتطبيق فلتر الفواتير بحاجة لتسعير */
  onFocus?: () => void;
}

interface GapRow {
  branch_name: string | null;
  service_type: string | null;
}

/**
 * لوحة صغيرة تُبرز الطلبات المغلقة التي فاتورتها بقيمة صفر وتحتاج تسعيرًا يدويًا
 */
export function PricingGapPanel({ onFocus }: Props) {
  const [loading, setLoading] = useState(true);
  const [count, setCount] = useState(0);
  const [topBranches, setTopBranches] = useState<{ name: string; count: number }[]>([]);
  const [topTrades, setTopTrades] = useState<{ name: string; count: number }[]>([]);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data, count: total } = await supabase
        .from("v_maintenance_requests_full")
        .select("branch_name, service_type", { count: "exact" })
        .eq("invoice_status", "draft")
        .limit(1000);

      if (!active) return;
      const rows = (data || []) as GapRow[];
      const tally = (key: keyof GapRow) => {
        const map = new Map<string, number>();
        rows.forEach((r) => {
          const value = (r[key] as string | null) || "غير محدد";
          map.set(value, (map.get(value) || 0) + 1);
        });
        return Array.from(map.entries())
          .map(([name, c]) => ({ name, count: c }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 4);
      };

      setCount(total || rows.length);
      setTopBranches(tally("branch_name"));
      setTopTrades(tally("service_type"));
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  if (!loading && count === 0) return null;

  return (
    <Card className="border-warning/40 bg-warning/5" dir="rtl">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="h-4 w-4 text-warning" />
          طلبات بحاجة لتسعير
        </CardTitle>
        {onFocus && (
          <Button size="sm" variant="outline" onClick={onFocus}>
            عرض الطلبات
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <Skeleton className="h-16 w-full" />
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              <span className="text-2xl font-bold text-foreground">
                {count.toLocaleString("ar-EG")}
              </span>{" "}
              طلبًا مغلقًا بفاتورة قيمتها صفر — السجل الأصلي لا يحتوي مبلغًا وتحتاج تسعيرًا يدويًا.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="mb-1 text-xs text-muted-foreground">أكثر الفروع</p>
                <div className="flex flex-wrap gap-1">
                  {topBranches.map((b) => (
                    <Badge key={b.name} variant="secondary">
                      {b.name} ({b.count})
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-1 text-xs text-muted-foreground">أكثر المهن</p>
                <div className="flex flex-wrap gap-1">
                  {topTrades.map((t) => (
                    <Badge key={t.name} variant="secondary">
                      {t.name} ({t.count})
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
