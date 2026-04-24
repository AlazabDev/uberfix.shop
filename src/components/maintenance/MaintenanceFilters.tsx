import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { 
  Search, 
  Filter, 
  Calendar as CalendarIcon, 
  X,
  SlidersHorizontal,
  MapPin,
  DollarSign,
  Star
} from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { 
  FILTER_STATUS_OPTIONS, 
  FILTER_PRIORITY_OPTIONS,
  getStatusConfig,
  getPriorityConfig
} from "@/constants/maintenanceStatusConstants";

interface MaintenanceFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  priorityFilter: string;
  setPriorityFilter: (priority: string) => void;
  serviceTypeFilter: string;
  setServiceTypeFilter: (serviceType: string) => void;
  locationFilter: string;
  setLocationFilter: (location: string) => void;
  dateFromFilter: Date | undefined;
  setDateFromFilter: (date: Date | undefined) => void;
  dateToFilter: Date | undefined;
  setDateToFilter: (date: Date | undefined) => void;
  minCostFilter: string;
  setMinCostFilter: (cost: string) => void;
  maxCostFilter: string;
  setMaxCostFilter: (cost: string) => void;
  ratingFilter: string;
  setRatingFilter: (rating: string) => void;
  onClearFilters: () => void;
  filteredCount: number;
  totalCount: number;
}

export function MaintenanceFilters({
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  priorityFilter,
  setPriorityFilter,
  serviceTypeFilter,
  setServiceTypeFilter,
  locationFilter,
  setLocationFilter,
  dateFromFilter,
  setDateFromFilter,
  dateToFilter,
  setDateToFilter,
  minCostFilter,
  setMinCostFilter,
  maxCostFilter,
  setMaxCostFilter,
  ratingFilter,
  setRatingFilter,
  onClearFilters,
  filteredCount,
  totalCount
}: MaintenanceFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const activeFiltersCount = [
    statusFilter !== "all",
    priorityFilter !== "all",
    serviceTypeFilter !== "all",
    locationFilter !== "",
    dateFromFilter,
    dateToFilter,
    minCostFilter !== "",
    maxCostFilter !== "",
    ratingFilter !== "all"
  ].filter(Boolean).length;

  const serviceTypes = [
    { value: "plumbing", label: "سباكة" },
    { value: "electrical", label: "كهرباء" },
    { value: "hvac", label: "تكييف" },
    { value: "general", label: "صيانة عامة" },
    { value: "cleaning", label: "نظافة" },
    { value: "painting", label: "طلاء" },
    { value: "carpentry", label: "نجارة" },
    { value: "other", label: "أخرى" },
  ];

  const locations = [
    "القاهرة",
    "الجيزة",
    "الإسكندرية",
    "المعادي",
    "مدينة نصر",
    "التجمع الخامس",
    "الشيخ زايد",
    "6 أكتوبر"
  ];

  return (
    <Card className="card-elegant">
      <CardContent className="p-6 space-y-4">
        {/* Search and Quick Filters */}
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="البحث في الطلبات..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10"
            />
          </div>
          
          <div className="flex flex-wrap gap-2">
            {/* فلتر الحالة - استخدام قيم قاعدة البيانات */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="الحالة" />
              </SelectTrigger>
              <SelectContent>
                {FILTER_STATUS_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* فلتر الأولوية */}
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="الأولوية" />
              </SelectTrigger>
              <SelectContent>
                {FILTER_PRIORITY_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="gap-2"
            >
              <SlidersHorizontal className="h-4 w-4" />
              فلاتر متقدمة
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="mr-1">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>

            {activeFiltersCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearFilters}
                className="gap-2 text-muted-foreground"
              >
                <X className="h-4 w-4" />
                مسح الفلاتر
              </Button>
            )}
          </div>
        </div>

        {/* Results Summary */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            عرض {filteredCount} من أصل {totalCount} طلب
            {searchTerm && ` • البحث عن "${searchTerm}"`}
          </span>
          
          {activeFiltersCount > 0 && (
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <span>{activeFiltersCount} فلتر نشط</span>
            </div>
          )}
        </div>

        {/* Advanced Filters */}
        {showAdvanced && (
          <div className="border-t pt-4 space-y-4">
            <h4 className="font-medium text-foreground">فلاتر متقدمة</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Service Type */}
              <div className="space-y-2">
                <Label>نوع الخدمة</Label>
                <Select value={serviceTypeFilter} onValueChange={setServiceTypeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر نوع الخدمة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كل الخدمات</SelectItem>
                    {serviceTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Location */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  الموقع
                </Label>
                <Select value={locationFilter} onValueChange={setLocationFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الموقع" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">كل المواقع</SelectItem>
                    {locations.map((location) => (
                      <SelectItem key={location} value={location}>
                        {location}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Rating */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Star className="h-4 w-4" />
                  التقييم
                </Label>
                <Select value={ratingFilter} onValueChange={setRatingFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر التقييم" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كل التقييمات</SelectItem>
                    <SelectItem value="5">5 نجوم</SelectItem>
                    <SelectItem value="4">4 نجوم فأكثر</SelectItem>
                    <SelectItem value="3">3 نجوم فأكثر</SelectItem>
                    <SelectItem value="2">2 نجوم فأكثر</SelectItem>
                    <SelectItem value="1">نجمة واحدة فأكثر</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Date Range */}
              <div className="space-y-2">
                <Label>فترة زمنية</Label>
                <div className="flex gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="flex-1 justify-start">
                        <CalendarIcon className="h-4 w-4 ml-2" />
                        {dateFromFilter ? format(dateFromFilter, "PPP", { locale: ar }) : "من تاريخ"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dateFromFilter}
                        onSelect={setDateFromFilter}
                        disabled={(date) => date > new Date() || (dateToFilter && date > dateToFilter)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="flex-1 justify-start">
                        <CalendarIcon className="h-4 w-4 ml-2" />
                        {dateToFilter ? format(dateToFilter, "PPP", { locale: ar }) : "إلى تاريخ"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dateToFilter}
                        onSelect={setDateToFilter}
                        disabled={(date) => date > new Date() || (dateFromFilter && date < dateFromFilter)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Cost Range */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  نطاق التكلفة (جنيه)
                </Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="الحد الأدنى"
                    value={minCostFilter}
                    onChange={(e) => setMinCostFilter(e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    placeholder="الحد الأقصى"
                    value={maxCostFilter}
                    onChange={(e) => setMaxCostFilter(e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Active Filters Display */}
        {activeFiltersCount > 0 && (
          <div className="border-t pt-4">
            <div className="flex flex-wrap gap-2">
              {statusFilter !== "all" && (
                <Badge variant="secondary" className="gap-1">
                  حالة: {getStatusConfig(statusFilter).label}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => setStatusFilter("all")}
                  />
                </Badge>
              )}
              
              {priorityFilter !== "all" && (
                <Badge variant="secondary" className="gap-1">
                  أولوية: {getPriorityConfig(priorityFilter).label}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => setPriorityFilter("all")}
                  />
                </Badge>
              )}
              
              {serviceTypeFilter !== "all" && serviceTypeFilter && (
                <Badge variant="secondary" className="gap-1">
                  خدمة: {serviceTypes.find(s => s.value === serviceTypeFilter)?.label || serviceTypeFilter}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => setServiceTypeFilter("all")}
                  />
                </Badge>
              )}
              
              {locationFilter && (
                <Badge variant="secondary" className="gap-1">
                  موقع: {locationFilter}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => setLocationFilter("")}
                  />
                </Badge>
              )}
              
              {(dateFromFilter || dateToFilter) && (
                <Badge variant="secondary" className="gap-1">
                  تاريخ: {dateFromFilter ? format(dateFromFilter, "dd/MM", { locale: ar }) : '...'} - {dateToFilter ? format(dateToFilter, "dd/MM", { locale: ar }) : '...'}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => {
                      setDateFromFilter(undefined);
                      setDateToFilter(undefined);
                    }}
                  />
                </Badge>
              )}
              
              {(minCostFilter || maxCostFilter) && (
                <Badge variant="secondary" className="gap-1">
                  تكلفة: {minCostFilter || '0'} - {maxCostFilter || '∞'} ج.م
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => {
                      setMinCostFilter("");
                      setMaxCostFilter("");
                    }}
                  />
                </Badge>
              )}
              
              {ratingFilter !== "all" && (
                <Badge variant="secondary" className="gap-1">
                  تقييم: {ratingFilter}+ نجوم
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => setRatingFilter("all")}
                  />
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
