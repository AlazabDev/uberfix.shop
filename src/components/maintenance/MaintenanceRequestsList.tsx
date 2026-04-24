import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMaintenanceRequests } from "@/hooks/useMaintenanceRequests";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, Calendar, Phone, DollarSign, Plus, MapPin, List, LayoutGrid } from "lucide-react";
import { MaintenanceRequestActions } from "./MaintenanceRequestActions";
import { MaintenanceFilters } from "./MaintenanceFilters";
import { MaintenanceExport } from "./MaintenanceExport";
import { MaintenanceStats } from "./MaintenanceStats";
import { RequestStatusBadge } from "./RequestStatusBadge";
import { RequestPriorityBadge } from "./RequestPriorityBadge";
import { WorkOrdersCalendar } from "./WorkOrdersCalendar";
import { getServiceTypeLabel } from "@/constants/maintenanceStatusConstants";
import { supabase } from "@/integrations/supabase/client";

interface MaintenanceRequestsListProps {
  onNewRequestClick?: () => void;
}

export function MaintenanceRequestsList({ onNewRequestClick }: MaintenanceRequestsListProps) {
  const navigate = useNavigate();
  const { requests, loading, error } = useMaintenanceRequests();
  const [activeView, setActiveView] = useState<"list" | "calendar">("list");
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [serviceTypeFilter, setServiceTypeFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("");
  const [dateFromFilter, setDateFromFilter] = useState<Date | undefined>();
  const [dateToFilter, setDateToFilter] = useState<Date | undefined>();
  const [minCostFilter, setMinCostFilter] = useState("");
  const [maxCostFilter, setMaxCostFilter] = useState("");
  const [ratingFilter, setRatingFilter] = useState("all");

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase
        .from('categories')
        .select('id, name')
        .order('sort_order');
      if (data) setCategories(data);
    };
    fetchCategories();
  }, []);

  const filteredRequests = useMemo(() => {
    return requests?.filter(request => {
      const matchesSearch = request.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           request.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           request.client_name?.toLowerCase().includes(searchTerm.toLowerCase());
      
      // فلترة الحالة - استخدام قيم قاعدة البيانات الفعلية
      const matchesStatus = statusFilter === "all" || request.status === statusFilter;
      const matchesPriority = priorityFilter === "all" || request.priority === priorityFilter;
      
      const requestDate = new Date(request.created_at);
      const matchesDateFrom = !dateFromFilter || requestDate >= dateFromFilter;
      const matchesDateTo = !dateToFilter || requestDate <= dateToFilter;
      
      return matchesSearch && matchesStatus && matchesPriority && 
             matchesDateFrom && matchesDateTo;
    }) || [];
  }, [requests, searchTerm, statusFilter, priorityFilter, dateFromFilter, dateToFilter]);

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setPriorityFilter("all");
    setServiceTypeFilter("all");
    setLocationFilter("");
    setDateFromFilter(undefined);
    setDateToFilter(undefined);
    setMinCostFilter("");
    setMaxCostFilter("");
    setRatingFilter("all");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">جاري تحميل الطلبات...</p>
        </div>
      </div>
    );
  }

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
          <div>
            <h2 className="text-3xl font-bold bg-gradient-hero bg-clip-text text-transparent">
              Work Orders
            </h2>
          </div>
          
          {/* List/Calendar Toggle */}
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
                List
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
                Calendar
              </span>
            </button>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <MaintenanceExport 
            requests={requests || []} 
            filteredRequests={filteredRequests}
          />
          <Button 
            className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground" 
            onClick={() => onNewRequestClick?.()}
          >
            <Plus className="h-4 w-4" />
            + Work Order
          </Button>
        </div>
      </div>

      {/* Calendar View */}
      {activeView === "calendar" ? (
        <WorkOrdersCalendar
          requests={requests || []}
          categories={categories}
          onRequestClick={(id) => navigate(`/requests/${id}`)}
        />
      ) : (
        <>
          {/* Statistics - List View Only */}
          <MaintenanceStats stats={{
            total: requests?.length || 0,
            open: requests?.filter(r => r.status === 'Open').length || 0,
            inProgress: requests?.filter(r => r.status === 'In Progress').length || 0,
            completed: requests?.filter(r => r.status === 'Completed').length || 0,
            overdue: 0
          }} />

          {/* Advanced Filters */}
          <MaintenanceFilters
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            priorityFilter={priorityFilter}
            setPriorityFilter={setPriorityFilter}
            serviceTypeFilter={serviceTypeFilter}
            setServiceTypeFilter={setServiceTypeFilter}
            locationFilter={locationFilter}
            setLocationFilter={setLocationFilter}
            dateFromFilter={dateFromFilter}
            setDateFromFilter={setDateFromFilter}
            dateToFilter={dateToFilter}
            setDateToFilter={setDateToFilter}
            minCostFilter={minCostFilter}
            setMinCostFilter={setMinCostFilter}
            maxCostFilter={maxCostFilter}
            setMaxCostFilter={setMaxCostFilter}
            ratingFilter={ratingFilter}
            setRatingFilter={setRatingFilter}
            onClearFilters={clearFilters}
            filteredCount={filteredRequests.length}
            totalCount={requests?.length || 0}
          />

      {/* Requests Table */}
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
                {filteredRequests.length > 0 ? (
                  filteredRequests.map((request) => (
                    <TableRow key={request.id} className="hover:bg-muted/20 transition-colors">
                      <TableCell className="font-mono text-sm font-medium">
                        <Badge variant="outline" className="font-mono">
                          #{request.id.slice(0, 8)}
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
                          {request.client_email && (
                            <div className="text-xs text-muted-foreground truncate max-w-32">
                              {request.client_email}
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
                              {new Date(request.created_at).toLocaleDateString('ar-EG')}
                            </span>
                          </div>
                          {(request.estimated_cost || request.actual_cost) && (
                            <div className="flex items-center gap-1 text-xs">
                              <DollarSign className="h-3 w-3 text-success" />
                              <span className="font-medium text-success">
                                {(request.actual_cost || request.estimated_cost)?.toLocaleString()} ج.م
                              </span>
                            </div>
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
                          {requests?.length === 0 
                            ? "لا توجد طلبات صيانة بعد" 
                            : "لا توجد طلبات مطابقة للبحث والفلاتر المحددة"
                          }
                        </p>
                        {requests && requests.length > 0 && (
                          <Button variant="outline" onClick={clearFilters} className="mt-3">
                            مسح جميع الفلاتر
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
        </>
      )}
    </div>
  );
}
