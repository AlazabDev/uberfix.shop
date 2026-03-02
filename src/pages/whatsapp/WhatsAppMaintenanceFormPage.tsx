import { WhatsAppMaintenanceForm } from '@/components/whatsapp/WhatsAppMaintenanceForm';

export default function WhatsAppMaintenanceFormPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <WhatsAppMaintenanceForm />
        <p className="text-center text-xs text-muted-foreground mt-4">
          UberFix © {new Date().getFullYear()} — جميع الحقوق محفوظة
        </p>
      </div>
    </div>
  );
}
