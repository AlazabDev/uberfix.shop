import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { NewRequestForm } from "@/components/forms/NewRequestForm";
import { MaintenanceRequestsList } from "@/components/maintenance/MaintenanceRequestsList";
import { MobileMaintenanceList } from "@/components/maintenance/MobileMaintenanceList";
import { useMediaQuery } from "@/hooks/use-mobile";
import { AppFooter } from "@/components/shared/AppFooter";

const Requests = () => {
  const [isNewRequestOpen, setIsNewRequestOpen] = useState(false);
  const isMobile = useMediaQuery("(max-width: 768px)");

  return (
    <div className="space-y-4 sm:space-y-8">
      <MaintenanceRequestsList onNewRequestClick={() => setIsNewRequestOpen(true)} />

      <Dialog open={isNewRequestOpen} onOpenChange={setIsNewRequestOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto mx-2 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">إنشاء طلب صيانة جديد</DialogTitle>
          </DialogHeader>
          <NewRequestForm onSuccess={() => setIsNewRequestOpen(false)} />
        </DialogContent>
      </Dialog>

      <AppFooter />
    </div>
  );
};

export default Requests;
