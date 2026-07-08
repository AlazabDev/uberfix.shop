import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Edit, Plus, Wrench, QrCode, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { PropertyQRDialog } from "./PropertyQRDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PropertyActionsDialogProps {
  propertyId: string;
  propertyName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PropertyActionsDialog({
  propertyId,
  propertyName,
  open,
  onOpenChange
}: PropertyActionsDialogProps) {
  const navigate = useNavigate();
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`هل أنت متأكد من حذف العقار "${propertyName}"؟ هذا الإجراء لا يمكن التراجع عنه.`)) {
      return;
    }

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from("properties")
        .delete()
        .eq("id", propertyId);

      if (error) throw error;

      toast.success("تم حذف العقار بنجاح");
      onOpenChange(false);
      navigate("/properties");
    } catch (error) {
      console.error("Error deleting property:", error);
      const message = error instanceof Error ? error.message : "فشل حذف العقار";
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-lg">إجراءات العقار</DialogTitle>
            <div className="text-center">
              <p className="font-semibold text-base">{propertyName}</p>
              <p className="text-sm text-muted-foreground">المشروع</p>
            </div>
          </DialogHeader>
          
          <div className="space-y-2 py-4">
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 h-12 hover:bg-accent border border-transparent hover:border-border"
              onClick={() => {
                navigate(`/properties/edit/${propertyId}`);
                onOpenChange(false);
              }}
            >
              <Edit className="h-5 w-5 text-primary" />
              <span>تعديل العقار</span>
            </Button>

            <Button
              variant="ghost"
              className="w-full justify-start gap-3 h-12 hover:bg-accent border border-transparent hover:border-border"
              onClick={() => {
                navigate(`/properties/add?parentId=${propertyId}`);
                onOpenChange(false);
              }}
            >
              <Plus className="h-5 w-5 text-success" />
              <span>إضافة عقار فرعي</span>
            </Button>

            <Button
              className="w-full justify-start gap-3 h-12 bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={() => {
                navigate(`/maintenance/create?propertyId=${propertyId}`);
                onOpenChange(false);
              }}
            >
              <Wrench className="h-5 w-5" />
              <span>طلب صيانة جديد</span>
            </Button>

            <Button
              variant="ghost"
              className="w-full justify-start gap-3 h-12 hover:bg-accent border border-transparent hover:border-border"
              onClick={() => {
                setQrDialogOpen(true);
              }}
            >
              <QrCode className="h-5 w-5 text-info" />
              <span>تصدير رمز QR لطلب الصيانة</span>
            </Button>

            <Button
              variant="ghost"
              className="w-full justify-start gap-3 h-12 text-destructive hover:bg-destructive/10 border border-transparent hover:border-destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              <Trash2 className="h-5 w-5" />
              <span>{isDeleting ? "جاري الحذف..." : "حذف العقار"}</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <PropertyQRDialog
        propertyId={propertyId}
        propertyName={propertyName}
        open={qrDialogOpen}
        onOpenChange={setQrDialogOpen}
      />
    </>
  );
}
