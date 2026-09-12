import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Eye, Calendar, Phone, DollarSign, Plus, MapPin, List } from "lucide-react";
import { MaintenanceRequestActions } from "./MaintenanceRequestActions";
import { MaintenanceExport } from "./MaintenanceExport";
import { MaintenanceStats } from "./MaintenanceStats";
import { RequestStatusBadge } from "./RequestStatusBadge";
import { RequestPriorityBadge } from "./RequestPriorityBadge";
import { WorkOrdersCalendar } from "./WorkOrdersCalendar";
import { AdvancedRequestFilters } from "./AdvancedRequestFilters";
import { getServiceTypeLabel } from "@/constants/maintenanceStatusConstants";
import { supabaseLegacy } from "@/integrations/supabase/client";
import {
  useAdvancedRequests,
  emptyFilters,
  type AdvancedRequestFiltersState,
} from "@/hooks/useAdvancedRequests";
import { useRequestsCounts } from "@/hooks/useRequestsCount";

interface MaintenanceRequestsListProps {
  onNewRequestClick?: () => void;
}

export function MaintenanceRequestsList({ onNewRequestClick }: MaintenanceRequestsListProps) {
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState<"list" | "calendar">("list");
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [filters, setFilters] = useState<AdvancedRequestFiltersState>(emptyFilters);

  const { rows, total, page, totalPages, loading, error, setPage } = useAdvancedRequests(filters, {
    pageSize: 25,
  });
  const { counts } = useRequestsCounts(true);

  const patchFilters = useCallback((patch: Partial<AdvancedRequestFiltersState>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
  }, []);

  useEffect(() => {
    (async () => {
      const { data } = await supabaseLegacy
        .from("categories")
        .select("id, name")
        .order("sort_order");
      if (data) setCategories(data);
    })();
  }, []);

  if (error) {
    return (
      <Card>
        <CardContent className="py-6">
          <p className="text-center text-destructive">خطأ في تحميل الطلبات: {error.message}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="flex items-center gap-6">
          <h2 className="text-3xl font-bold bg-gradient-hero bg-clip-text text-transparent">
            كل الطلبات
          </h2>

          <div className="flex items-center border-b border-border">
            <button
              onClick={() => setActiveView("list")}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                activeView === "list"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="flex items-center gap-2">
                <List className="h-4 w-4" />
                قائمة
              </span>
            </button>
            <button
              onClick={() => setActiveView("calendar")}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                activeView === "calendar"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                تقويم
              </span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <MaintenanceExport requests={rows} filteredRequests={rows} />
          <Button
            className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
            onClick={() => onNewRequestClick?.()}
          >
            <Plus className="h-4 w-4" />
            طلب جديد
          </Button>
        </div>
      </div>

      {activeView === "calendar" ? (
        <WorkOrdersCalendar
          requests={rows}
          categories={categories}
          onRequestClick={(id) => navigate(`/requests/${id}`)}
        />
      ) : (
        <>
          <MaintenanceStats
            stats={{
              total: counts.total,
              open: counts.open,
              inProgress: counts.inProgress,
              completed: counts.completed,
              overdue: 0,
            }}
          />

          <AdvancedRequestFilters
            filters={filters}
            onChange={patchFilters}
            onReset={() => setFilters(emptyFilters)}
            resultCount={total}
            totalCount={counts.total}
          />

          <Card className="card-elegant">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl">قائمة طلبات الصيانة</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-right font-semibold">رقم الطلب</TableHead>
                      <TableHead className="text-right font-semibold">التفاصيل</TableHead>
                      <TableHead className="text-right font-semibold">العميل</TableHead>
                      <TableHead className="text-right font-semibold">الخدمة</TableHead>
                      <TableHead className="text-right font-semibold">الحالة</TableHead>
                      <TableHead className="text-right font-semibold">الأولوية</TableHead>
                      <TableHead className="text-right font-semibold">التوقيت والتكلفة</TableHead>
                      <TableHead className="text-right font-semibold">الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      Array.from({ length: 8 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell colSpan={8}>
                            <Skeleton className="h-8 w-full" />
                          </TableCell>
                        </TableRow>
                      ))
                    ) : rows.length > 0 ? (
                      rows.map((request) => (
                        <TableRow key={request.id} className="hover:bg-muted/20 transition-colors">
                          <TableCell className="font-mono text-sm font-medium">
                            <Badge variant="outline" className="font-mono">
                              {request.request_number || `#${request.id.slice(0, 8)}`}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-2 max-w-xs">
                              <p className="font-semibold text-foreground leading-tight">
                                {request.title}
                              </p>
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {request.description}
                              </p>
                              {request.location && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <MapPin className="h-3 w-3" />
                                  {request.location}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-2">
                              <p className="font-medium text-foreground">{request.client_name}</p>
                              {request.client_phone && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Phone className="h-3 w-3" />
                                  {request.client_phone}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="whitespace-nowrap">
                              {getServiceTypeLabel(request.service_type)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <RequestStatusBadge
                              status={request.status}
                              workflowStage={request.workflow_stage}
                            />
                          </TableCell>
                          <TableCell>
                            <RequestPriorityBadge priority={request.priority} />
                          </TableCell>
                          <TableCell>
                            <div className="space-y-2 min-w-32">
                              <div className="flex items-center gap-1 text-sm">
                                <Calendar className="h-3 w-3 text-muted-foreground" />
                                <span className="text-xs">
                                  {new Date(request.created_at).toLocaleDateString("ar-EG")}
                                </span>
                              </div>
                              {(request.estimated_cost || request.actual_cost) ? (
                                <div className="flex items-center gap-1 text-xs">
                                  <DollarSign className="h-3 w-3 text-success" />
                                  <span className="font-medium text-success">
                                    {(request.actual_cost || request.estimated_cost)?.toLocaleString()} ج.م
                                  </span>
                                </div>
                              ) : (
                                <Badge variant="outline" className="text-xs">
                                  بحاجة لتسعير
                                </Badge>
                              )}
                              {request.rating && (
                                <div className="flex items-center gap-1 text-xs">
                                  <span className="text-warning">⭐</span>
                                  <span className="font-medium">{request.rating}/5</span>
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate(`/requests/${request.id}`)}
                                className="hover:bg-primary/10"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <MaintenanceRequestActions request={request} />
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="py-12 text-center">
                          <div className="space-y-3">
                            <div className="text-4xl opacity-50">📋</div>
                            <p className="text-muted-foreground">
                              لا توجد طلبات مطابقة للبحث والفلاتر المحددة
                            </p>
                            <Button
                              variant="outline"
                              onClick={() => setFilters(emptyFilters)}
                              className="mt-3"
                            >
                              مسح جميع الفلاتر
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between p-4 border-t">
                <span className="text-sm text-muted-foreground">
                  صفحة {page + 1} من {totalPages} — {total.toLocaleString("ar-EG")} طلب
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 0}
                    onClick={() => setPage(Math.max(0, page - 1))}
                  >
                    السابق
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page + 1 >= totalPages}
                    onClick={() => setPage(page + 1)}
                  >
                    التالي
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
