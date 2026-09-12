import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, RotateCcw, SlidersHorizontal, ChevronDown } from "lucide-react";
import {
  FILTER_STATUS_OPTIONS,
  FILTER_PRIORITY_OPTIONS,
  SERVICE_TYPE_MAP,
} from "@/constants/maintenanceStatusConstants";
import { WORKFLOW_STAGES } from "@/constants/workflowStages";
import {
  ALL_OPTION,
  emptyFilters,
  type AdvancedRequestFiltersState,
} from "@/hooks/useAdvancedRequests";

interface Props {
  filters: AdvancedRequestFiltersState;
  onChange: (patch: Partial<AdvancedRequestFiltersState>) => void;
  onReset: () => void;
  resultCount: number;
  totalCount: number;
}

interface Option {
  value: string;
  label: string;
}

const serviceTypeOptions: Option[] = Array.from(
  new Set(Object.values(SERVICE_TYPE_MAP))
).map((label) => ({ value: label, label }));

export function AdvancedRequestFilters({
  filters,
  onChange,
  onReset,
  resultCount,
  totalCount,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [branches, setBranches] = useState<Option[]>([]);
  const [categories, setCategories] = useState<Option[]>([]);
  const [technicians, setTechnicians] = useState<Option[]>([]);

  useEffect(() => {
    let active = true;
    (async () => {
      const [branchRes, categoryRes, techRes] = await Promise.all([
        supabase.from("branches").select("id, name").order("name").limit(500),
        supabase.from("service_categories").select("id, name").order("sort_order").limit(200),
        supabase.from("technicians").select("id, name, specialization").order("name").limit(300),
      ]);
      if (!active) return;
      setBranches(((branchRes.data || []) as { id: string; name: string }[]).map((b) => ({
        value: b.id,
        label: b.name,
      })));
      setCategories(((categoryRes.data || []) as { id: string; name: string }[]).map((c) => ({
        value: c.id,
        label: c.name,
      })));
      setTechnicians(
        ((techRes.data || []) as { id: string; name: string; specialization: string | null }[]).map(
          (t) => ({
            value: t.id,
            label: t.specialization ? `${t.name} — ${t.specialization}` : t.name,
          })
        )
      );
    })();
    return () => {
      active = false;
    };
  }, []);

  const activeCount = Object.entries(filters).filter(([key, value]) => {
    const initial = emptyFilters[key as keyof AdvancedRequestFiltersState];
    return value !== initial && value !== undefined && value !== "";
  }).length;

  const renderSelect = (
    label: string,
    value: string,
    options: Option[],
    allLabel: string,
    key: keyof AdvancedRequestFiltersState
  ) => (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Select value={value} onValueChange={(v) => onChange({ [key]: v })}>
        <SelectTrigger>
          <SelectValue placeholder={allLabel} />
        </SelectTrigger>
        <SelectContent className="max-h-72">
          <SelectItem value={ALL_OPTION}>{allLabel}</SelectItem>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <Card dir="rtl">
      <CardContent className="space-y-4 pt-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={filters.search}
              onChange={(e) => onChange({ search: e.target.value })}
              placeholder="ابحث برقم الطلب، العنوان، الوصف، العميل أو الهاتف"
              className="pr-9"
            />
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="whitespace-nowrap">
              {resultCount.toLocaleString("ar-EG")} من {totalCount.toLocaleString("ar-EG")}
            </Badge>
            <Button
              variant={filters.unpriced ? "default" : "outline"}
              size="sm"
              onClick={() => onChange({ unpriced: !filters.unpriced })}
            >
              بحاجة لتسعير
            </Button>
            <Button variant="outline" size="sm" onClick={() => setExpanded((v) => !v)}>
              <SlidersHorizontal className="ml-1 h-4 w-4" />
              فلاتر متقدمة
              {activeCount > 0 && (
                <Badge variant="secondary" className="mr-1">
                  {activeCount}
                </Badge>
              )}
              <ChevronDown
                className={`ml-1 h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`}
              />
            </Button>
            <Button variant="ghost" size="icon" onClick={onReset} title="إعادة تعيين">
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {expanded && (
          <div className="grid gap-3 border-t pt-4 md:grid-cols-3 xl:grid-cols-4">
            {renderSelect(
              "الحالة",
              filters.status,
              FILTER_STATUS_OPTIONS.filter((o) => o.value !== "all"),
              "كل الحالات",
              "status"
            )}
            {renderSelect(
              "المرحلة",
              filters.stage,
              Object.entries(WORKFLOW_STAGES).map(([key, cfg]) => ({
                value: key,
                label: cfg.label,
              })),
              "كل المراحل",
              "stage"
            )}
            {renderSelect(
              "الأولوية",
              filters.priority,
              FILTER_PRIORITY_OPTIONS.filter((o) => o.value !== "all"),
              "كل الأولويات",
              "priority"
            )}
            {renderSelect("المهنة", filters.serviceType, serviceTypeOptions, "كل المهن", "serviceType")}
            {renderSelect("التصنيف", filters.categoryId, categories, "كل التصنيفات", "categoryId")}
            {renderSelect("الفرع", filters.branchId, branches, "كل الفروع", "branchId")}
            {renderSelect("الفني", filters.technicianId, technicians, "كل الفنيين", "technicianId")}
            {renderSelect(
              "التقييم",
              filters.rating,
              [
                { value: "5", label: "5 نجوم" },
                { value: "4", label: "4 نجوم وأكثر" },
                { value: "3", label: "3 نجوم وأكثر" },
              ],
              "كل التقييمات",
              "rating"
            )}

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">الموقع</Label>
              <Input
                value={filters.location}
                onChange={(e) => onChange({ location: e.target.value })}
                placeholder="اسم الموقع أو المنطقة"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">من تاريخ</Label>
              <Input
                type="date"
                value={filters.dateFrom || ""}
                onChange={(e) => onChange({ dateFrom: e.target.value || undefined })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">إلى تاريخ</Label>
              <Input
                type="date"
                value={filters.dateTo || ""}
                onChange={(e) => onChange({ dateTo: e.target.value || undefined })}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">أقل تكلفة</Label>
                <Input
                  type="number"
                  value={filters.minCost}
                  onChange={(e) => onChange({ minCost: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">أعلى تكلفة</Label>
                <Input
                  type="number"
                  value={filters.maxCost}
                  onChange={(e) => onChange({ maxCost: e.target.value })}
                  placeholder="—"
                />
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
