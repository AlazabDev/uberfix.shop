import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { useState, useEffect } from "react";
import { Plus, Grid3X3, List } from "lucide-react";
import { NewInvoiceForm } from "@/components/forms/NewInvoiceForm";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { InvoiceStats } from "@/components/invoices/InvoiceStats";
import { InvoiceCard } from "@/components/invoices/InvoiceCard";
import { InvoiceTable } from "@/components/invoices/InvoiceTable";
import { AppFooter } from "@/components/shared/AppFooter";
import { useNavigate } from "react-router-dom";

type Invoice = {
  id: string;
  invoice_number: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  amount: number;
  currency: string;
  due_date?: string;
  issue_date: string;
  status: string;
  payment_method?: string;
  notes?: string;
  created_at: string;
};

export default function Invoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const { toast } = useToast();
  const navigate = useNavigate();

  const openInvoice = async (id: string) => {
    // Look up linked maintenance request for this invoice and open the branded PublicInvoice
    const inv = invoices.find(i => i.id === id);
    const { data } = await supabase
      .from('invoices')
      .select('related_request_id')
      .eq('id', id)
      .maybeSingle();
    const reqId = (data as any)?.related_request_id;
    if (reqId) {
      window.open(`/track/${reqId}/invoice`, '_blank');
    } else {
      toast({
        title: 'الفاتورة غير مرتبطة بطلب',
        description: `لا يمكن عرض القالب البصري للفاتورة ${inv?.invoice_number || ''} لأنها غير مرتبطة بطلب صيانة.`,
        variant: 'destructive',
      });
    }
  };

  const fetchInvoices = async () => {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session) {
        toast({
          title: "يجب تسجيل الدخول",
          description: "الرجاء تسجيل الدخول لعرض الفواتير",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('invoices_safe')
        .select(`
          id,
          invoice_number,
          customer_name,
          customer_email,
          customer_phone,
          amount,
          currency,
          due_date,
          issue_date,
          status,
          payment_method,
          notes,
          created_at
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvoices(data || []);
    } catch (error: any) {
      console.error('Error fetching invoices:', error);
      toast({
        title: "خطأ في تحميل الفواتير",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const handleInvoiceCreated = () => {
    setIsDialogOpen(false);
    fetchInvoices();
  };

  const stats = {
    total: invoices.length,
    paid: invoices.filter(inv => inv.status === 'paid').length,
    pending: invoices.filter(inv => inv.status === 'pending').length,
    overdue: invoices.filter(inv => inv.status === 'overdue').length,
    totalAmount: invoices.reduce((sum, inv) => sum + inv.amount, 0),
    paidAmount: invoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + inv.amount, 0),
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-foreground">الفواتير</h1>
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <Grid3X3 className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'table' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('table')}
          >
            <List className="h-4 w-4" />
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                إنشاء فاتورة جديدة
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <NewInvoiceForm 
                onSuccess={handleInvoiceCreated}
                onCancel={() => setIsDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <InvoiceStats stats={stats} />
      
      {isLoading ? (
        <div className="text-center py-8">
          <p>جاري تحميل الفواتير...</p>
        </div>
      ) : invoices.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">لا توجد فواتير حتى الآن</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {invoices.map((invoice) => (
            <InvoiceCard
              key={invoice.id}
              invoice={invoice}
              onView={openInvoice}
              onDownload={openInvoice}
            />
          ))}
        </div>
      ) : (
        <InvoiceTable
          invoices={invoices}
          onView={openInvoice}
          onDownload={openInvoice}
        />
      )}

      <AppFooter />
    </div>
  );
}
