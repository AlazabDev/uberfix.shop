import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Download, 
  FileText, 
  Table as TableIcon, 
  BarChart3,
  Calendar,
  CheckCircle2,
  Loader2
} from "lucide-react";
import { MaintenanceRequest } from "@/hooks/useMaintenanceRequests";

interface MaintenanceExportProps {
  requests: MaintenanceRequest[];
  filteredRequests: MaintenanceRequest[];
}

export function MaintenanceExport({ requests, filteredRequests }: MaintenanceExportProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [exportType, setExportType] = useState("csv");
  const [dataScope, setDataScope] = useState("filtered");
  const [isExporting, setIsExporting] = useState(false);
  const [selectedFields, setSelectedFields] = useState({
    id: true,
    title: true,
    client_name: true,
    service_type: true,
    status: true,
    priority: true,
    location: true,
    created_at: true,
    estimated_cost: true,
    actual_cost: true,
    description: false,
    client_phone: false,
    client_email: false,
    vendor_notes: false,
    customer_notes: false,
    rating: false,
    preferred_date: false,
    completion_photos: false
  });
  
  const { toast } = useToast();

  const dataToExport = dataScope === "filtered" ? filteredRequests : requests;

  const fieldLabels = {
    id: "رقم الطلب",
    title: "العنوان",
    client_name: "اسم العميل",
    client_phone: "هاتف العميل",
    client_email: "بريد العميل",
    service_type: "نوع الخدمة",
    status: "الحالة",
    priority: "الأولوية",
    location: "الموقع",
    description: "الوصف",
    created_at: "تاريخ الإنشاء",
    estimated_cost: "التكلفة المقدرة",
    actual_cost: "التكلفة الفعلية",
    vendor_notes: "ملاحظات الفني",
    customer_notes: "ملاحظات العميل",
    rating: "التقييم",
    preferred_date: "التاريخ المفضل",
    completion_photos: "صور الإنجاز"
  };

  const handleFieldChange = (field: string, checked: boolean) => {
    setSelectedFields(prev => ({
      ...prev,
      [field]: checked
    }));
  };

  const formatValue = (value: unknown, field: string) => {
    if (value === null || value === undefined) return "";
    
    switch (field) {
      case "status":
        return value === "pending" ? "في الانتظار" :
               value === "in_progress" ? "قيد التنفيذ" :
               value === "completed" ? "مكتمل" : "ملغي";
      case "priority":
        return value === "low" ? "منخفضة" :
               value === "medium" ? "متوسطة" : "عالية";
      case "created_at":
      case "preferred_date":
        return typeof value === 'string' ? new Date(value).toLocaleDateString('ar-EG') : "";
      case "estimated_cost":
      case "actual_cost":
        return typeof value === 'number' ? `${value} ج.م` : "";
      case "completion_photos":
        return Array.isArray(value) ? value.length + " صور" : "";
      default:
        return String(value);
    }
  };

  const generateCSV = () => {
    const selectedFieldsArray = Object.entries(selectedFields)
      .filter(([_, selected]) => selected)
      .map(([field, _]) => field);

    // Headers
    const headers = selectedFieldsArray.map(field => fieldLabels[field as keyof typeof fieldLabels]);
    
    // Data rows
    const rows = dataToExport.map(request => 
      selectedFieldsArray.map(field => 
        formatValue(request[field as keyof MaintenanceRequest], field)
      )
    );

    // Combine headers and rows
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    return csvContent;
  };

  const generateJSON = () => {
    const selectedFieldsArray = Object.entries(selectedFields)
      .filter(([_, selected]) => selected)
      .map(([field, _]) => field);

    return dataToExport.map(request => {
      const filteredRequest: Record<string, unknown> = {};
      selectedFieldsArray.forEach(field => {
        filteredRequest[fieldLabels[field as keyof typeof fieldLabels]] = 
          formatValue(request[field as keyof MaintenanceRequest], field);
      });
      return filteredRequest;
    });
  };

  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      let content: string;
      let filename: string;
      let mimeType: string;

      const timestamp = new Date().toISOString().split('T')[0];
      const scopeText = dataScope === "filtered" ? "مفلتر" : "كامل";

      if (exportType === "csv") {
        content = generateCSV();
        filename = `طلبات-الصيانة-${scopeText}-${timestamp}.csv`;
        mimeType = "text/csv;charset=utf-8;";
      } else {
        content = JSON.stringify(generateJSON(), null, 2);
        filename = `طلبات-الصيانة-${scopeText}-${timestamp}.json`;
        mimeType = "application/json;charset=utf-8;";
      }

      // Add BOM for proper Arabic encoding in CSV
      if (exportType === "csv") {
        content = "\uFEFF" + content;
      }

      const blob = new Blob([content], { type: mimeType });
      const link = document.createElement("a");
      
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", filename);
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      toast({
        title: "تم التصدير بنجاح",
        description: `تم تصدير ${dataToExport.length} طلب إلى ملف ${exportType.toUpperCase()}`,
      });

      setIsOpen(false);
    } catch {
      toast({
        title: "خطأ في التصدير",
        description: "فشل في تصدير البيانات. يرجى المحاولة مرة أخرى.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const selectedFieldsCount = Object.values(selectedFields).filter(Boolean).length;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          تصدير البيانات
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            تصدير بيانات طلبات الصيانة
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Export Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>نوع الملف</Label>
              <Select value={exportType} onValueChange={setExportType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">
                    <div className="flex items-center gap-2">
                      <TableIcon className="h-4 w-4" />
                      CSV (Excel)
                    </div>
                  </SelectItem>
                  <SelectItem value="json">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      JSON
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>نطاق البيانات</Label>
              <Select value={dataScope} onValueChange={setDataScope}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="filtered">
                    البيانات المفلترة ({filteredRequests.length} طلب)
                  </SelectItem>
                  <SelectItem value="all">
                    جميع البيانات ({requests.length} طلب)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Field Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">الحقول المطلوب تصديرها</Label>
              <Badge variant="secondary">
                {selectedFieldsCount} من {Object.keys(selectedFields).length} حقل
              </Badge>
            </div>

            <Card>
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Object.entries(fieldLabels).map(([field, label]) => (
                    <div key={field} className="flex items-center space-x-2 space-x-reverse">
                      <Checkbox
                        id={field}
                        checked={selectedFields[field as keyof typeof selectedFields]}
                        onCheckedChange={(checked) => 
                          handleFieldChange(field, checked as boolean)
                        }
                      />
                      <Label 
                        htmlFor={field}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {label}
                      </Label>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Preview */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                معاينة التصدير
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">عدد الطلبات:</span>
                <span className="font-medium">{dataToExport.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">عدد الحقول:</span>
                <span className="font-medium">{selectedFieldsCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">نوع الملف:</span>
                <span className="font-medium">{exportType.toUpperCase()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">الحجم المقدر:</span>
                <span className="font-medium">
                  {exportType === "csv" 
                    ? `${Math.round((dataToExport.length * selectedFieldsCount * 20) / 1024)} KB`
                    : `${Math.round((dataToExport.length * selectedFieldsCount * 50) / 1024)} KB`
                  }
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end">
            <Button 
              variant="outline" 
              onClick={() => setIsOpen(false)}
              disabled={isExporting}
            >
              إلغاء
            </Button>
            <Button 
              onClick={handleExport}
              disabled={selectedFieldsCount === 0 || isExporting || dataToExport.length === 0}
              className="gap-2"
            >
              {isExporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              {isExporting ? "جاري التصدير..." : "تصدير"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
