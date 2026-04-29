import { useEffect, useState, useRef } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertCircle, Download, FileImage, FileSpreadsheet, FileText, Share2, Printer, ArrowRight, CheckCircle2, Phone, MapPin, Calendar, CreditCard } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { QRCodeSVG } from 'qrcode.react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useToast } from '@/hooks/use-toast';
import { openWhatsApp } from '@/config/whatsapp';

interface InvoiceItem {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

interface InvoiceData {
  id: string;
  invoice_number: string;
  customer_name: string;
  customer_phone?: string;
  customer_email?: string;
  amount: number;
  subtotal?: number;
  tax_amount?: number;
  tax_rate?: number;
  currency: string;
  status: string;
  issue_date: string;
  due_date?: string;
  payment_method?: string;
  notes?: string;
  items?: InvoiceItem[];
  company_name?: string;
  company_address?: string;
  company_phone?: string;
  company_tax_id?: string;
}

interface RequestData {
  id: string;
  request_number: string;
  title: string;
  service_type?: string;
  client_name?: string;
  client_phone?: string;
  location?: string;
  workflow_stage: string;
  created_at: string;
  estimated_cost?: number;
  actual_cost?: number;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  paid: { label: 'مدفوعة ✓', color: 'bg-success/15 text-success border-success/30' },
  pending: { label: 'بانتظار الدفع', color: 'bg-warning/15 text-warning border-warning/30' },
  overdue: { label: 'متأخرة', color: 'bg-destructive/15 text-destructive border-destructive/30' },
  draft: { label: 'مسودة', color: 'bg-muted text-muted-foreground border-border' },
};

export default function PublicInvoice() {
  const { orderId } = useParams<{ orderId: string }>();
  const [searchParams] = useSearchParams();
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [request, setRequest] = useState<RequestData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const invoiceRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const paymentReturn = searchParams.get('payment'); // 'success' | 'cancel' | null

  useEffect(() => {
    const fetchInvoice = async () => {
      if (!orderId) return;
      try {
        const { data, error: rpcError } = await supabase.rpc('public_get_invoice_by_request' as any, {
          p_request_id: orderId,
        });
        if (rpcError) throw rpcError;
        const result = data as any;
        if (result?.error) {
          setError(result.error === 'request_not_found' ? 'الطلب غير موجود' : 'تعذر تحميل الفاتورة');
          return;
        }
        setRequest(result.request);
        setInvoice(result.invoice);
      } catch (err: any) {
        setError(err.message || 'حدث خطأ');
      } finally {
        setLoading(false);
      }
    };
    fetchInvoice();
  }, [orderId]);

  // Auto-refresh after returning from PayTabs (callback might still be processing)
  useEffect(() => {
    if (paymentReturn !== 'success' || !orderId) return;
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      const { data } = await supabase.rpc('public_get_invoice_by_request' as any, { p_request_id: orderId });
      const result = data as any;
      if (result?.invoice?.status === 'paid') {
        setInvoice(result.invoice);
        toast({ title: '✅ تم استلام الدفع بنجاح', description: 'شكراً لك!' });
        clearInterval(interval);
      }
      if (attempts >= 10) clearInterval(interval);
    }, 2000);
    return () => clearInterval(interval);
  }, [paymentReturn, orderId, toast]);

  const handlePayNow = async () => {
    if (!orderId) return;
    setPaying(true);
    try {
      const { data, error } = await supabase.functions.invoke('paytabs-create-payment', {
        body: { request_id: orderId },
      });
      if (error) throw error;
      if ((data as any)?.already_paid) {
        toast({ title: 'الفاتورة مدفوعة بالفعل ✓' });
        return;
      }
      const url = (data as any)?.redirect_url;
      if (!url) throw new Error('لم يتم إنشاء جلسة الدفع');
      window.location.href = url;
    } catch (err: any) {
      toast({ title: 'خطأ في بدء الدفع', description: err.message, variant: 'destructive' });
    } finally {
      setPaying(false);
    }
  };

  const captureCanvas = async () => {
    if (!invoiceRef.current) return null;
    return await html2canvas(invoiceRef.current, {
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true,
      logging: false,
    });
  };

  const handleDownloadPDF = async () => {
    setDownloading('pdf');
    try {
      const canvas = await captureCanvas();
      if (!canvas) return;
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const ratio = (pdfWidth - 20) / canvas.width;
      const imgHeight = canvas.height * ratio;
      let position = 10;
      let remaining = imgHeight;
      let pageNum = 0;
      while (remaining > 0) {
        if (pageNum > 0) pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 10, position - pageNum * (pdfHeight - 20), pdfWidth - 20, imgHeight);
        remaining -= pdfHeight - 20;
        pageNum++;
      }
      pdf.save(`UberFix-Invoice-${invoice?.invoice_number || orderId}.pdf`);
      toast({ title: 'تم تحميل الفاتورة بصيغة PDF ✓' });
    } catch (err: any) {
      toast({ title: 'خطأ في التحميل', description: err.message, variant: 'destructive' });
    } finally {
      setDownloading(null);
    }
  };

  const handleDownloadJPG = async () => {
    setDownloading('jpg');
    try {
      const canvas = await captureCanvas();
      if (!canvas) return;
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/jpeg', 0.95);
      link.download = `UberFix-Invoice-${invoice?.invoice_number || orderId}.jpg`;
      link.click();
      toast({ title: 'تم تحميل الفاتورة بصيغة JPG ✓' });
    } catch (err: any) {
      toast({ title: 'خطأ', description: err.message, variant: 'destructive' });
    } finally {
      setDownloading(null);
    }
  };

  const handleDownloadCSV = () => {
    if (!invoice) return;
    const bom = '\uFEFF';
    const items = invoice.items && invoice.items.length > 0 ? invoice.items : [
      { description: invoice.notes || request?.title || 'خدمة صيانة', quantity: 1, unit_price: invoice.subtotal || invoice.amount, total: invoice.subtotal || invoice.amount }
    ];
    const lines = [
      `رقم الفاتورة,${invoice.invoice_number}`,
      `العميل,${invoice.customer_name}`,
      `الهاتف,${invoice.customer_phone || ''}`,
      `رقم الطلب,${request?.request_number || ''}`,
      `تاريخ الإصدار,${invoice.issue_date}`,
      `الحالة,${STATUS_CONFIG[invoice.status]?.label || invoice.status}`,
      '',
      'البند,الكمية,سعر الوحدة,الإجمالي',
      ...items.map(it => `"${it.description}",${it.quantity},${it.unit_price},${it.total}`),
      '',
      `المجموع الفرعي,${invoice.subtotal || invoice.amount}`,
      `الضريبة (${invoice.tax_rate || 0}%),${invoice.tax_amount || 0}`,
      `الإجمالي,${invoice.amount} ${invoice.currency}`,
    ].join('\n');
    const blob = new Blob([bom + lines], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `UberFix-Invoice-${invoice.invoice_number}.csv`;
    link.click();
    toast({ title: 'تم تحميل الفاتورة بصيغة CSV ✓' });
  };

  const handleShareWhatsApp = () => {
    if (!invoice || !request) return;
    const url = `${window.location.origin}/track/${request.id}/invoice`;
    const message = `📄 فاتورة UberFix\n\nرقم الفاتورة: ${invoice.invoice_number}\nرقم الطلب: ${request.request_number}\nالمبلغ: ${invoice.amount} ${invoice.currency}\nالحالة: ${STATUS_CONFIG[invoice.status]?.label || invoice.status}\n\n🔗 ${url}`;
    openWhatsApp(message);
  };

  const handlePrint = () => window.print();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">{error || 'الطلب غير موجود'}</h2>
            <Link to="/"><Button className="mt-4">العودة للرئيسية</Button></Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">لا توجد فاتورة بعد</h2>
            <p className="text-muted-foreground mb-4">
              لم يتم إصدار فاتورة لهذا الطلب حتى الآن. سيتم إخطارك فور إصدارها.
            </p>
            <p className="text-sm text-muted-foreground">رقم الطلب: <strong>{request.request_number}</strong></p>
            <Link to={`/track/${request.id}`}>
              <Button variant="outline" className="mt-6">
                <ArrowRight className="h-4 w-4 ml-2" />
                العودة لتتبع الطلب
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const items: InvoiceItem[] = (invoice.items && invoice.items.length > 0)
    ? invoice.items
    : [{
        description: invoice.notes || request.title || 'خدمة صيانة',
        quantity: 1,
        unit_price: invoice.subtotal ?? invoice.amount,
        total: invoice.subtotal ?? invoice.amount,
      }];

  const subtotal = invoice.subtotal ?? invoice.amount;
  const taxAmount = invoice.tax_amount ?? 0;
  const verifyUrl = `${window.location.origin}/track/${request.id}/invoice`;

  return (
    <div className="min-h-screen bg-muted/30 py-6 px-3" dir="rtl">
      {/* Action Bar - hidden on print */}
      <div className="max-w-3xl mx-auto mb-4 print:hidden">
        <Card>
          <CardContent className="p-4 flex flex-wrap gap-2 justify-between items-center">
            <Link to={`/track/${request.id}`}>
              <Button variant="ghost" size="sm">
                <ArrowRight className="h-4 w-4 ml-1" />
                تتبع الطلب
              </Button>
            </Link>
            <div className="flex flex-wrap gap-2">
              {invoice.status !== 'paid' && (
                <Button
                  size="sm"
                  onClick={handlePayNow}
                  disabled={paying}
                  className="bg-gradient-to-r from-[#FFB900] to-[#FFA500] text-[#030957] font-bold hover:opacity-90 shadow-md"
                >
                  {paying ? <Loader2 className="h-4 w-4 animate-spin ml-1" /> : <CreditCard className="h-4 w-4 ml-1" />}
                  ادفع الآن
                </Button>
              )}
              <Button size="sm" onClick={handleDownloadPDF} disabled={downloading === 'pdf'}>
                {downloading === 'pdf' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4 ml-1" />}
                PDF
              </Button>
              <Button size="sm" variant="outline" onClick={handleDownloadJPG} disabled={downloading === 'jpg'}>
                {downloading === 'jpg' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileImage className="h-4 w-4 ml-1" />}
                JPG
              </Button>
              <Button size="sm" variant="outline" onClick={handleDownloadCSV}>
                <FileSpreadsheet className="h-4 w-4 ml-1" />
                CSV
              </Button>
              <Button size="sm" variant="outline" onClick={handlePrint}>
                <Printer className="h-4 w-4 ml-1" />
                طباعة
              </Button>
              <Button size="sm" className="bg-success text-success-foreground hover:bg-success/90" onClick={handleShareWhatsApp}>
                <Share2 className="h-4 w-4 ml-1" />
                واتساب
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoice Document */}
      <div className="max-w-3xl mx-auto">
        <div ref={invoiceRef} className="bg-white text-gray-900 p-8 rounded-lg shadow-lg" style={{ fontFamily: 'Cairo, sans-serif' }}>
          {/* Header */}
          <div className="flex justify-between items-start border-b-2 pb-6 mb-6" style={{ borderColor: '#030957' }}>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-3xl font-bold" style={{ color: '#030957' }}>Uber</span>
                <span className="text-3xl font-bold" style={{ color: '#FFB900' }}>Fix</span>
              </div>
              <p className="text-sm text-gray-600">{invoice.company_name || 'UberFix - خدمات الصيانة المتكاملة'}</p>
              {invoice.company_address && <p className="text-xs text-gray-500">{invoice.company_address}</p>}
              {invoice.company_phone && <p className="text-xs text-gray-500">📞 {invoice.company_phone}</p>}
              {invoice.company_tax_id && <p className="text-xs text-gray-500">الرقم الضريبي: {invoice.company_tax_id}</p>}
            </div>
            <div className="text-left">
              <h1 className="text-2xl font-bold" style={{ color: '#030957' }}>فاتورة</h1>
              <p className="text-sm text-gray-600 mt-1">INVOICE</p>
              <div className="mt-3 inline-block px-3 py-1 rounded-full text-sm font-bold border" style={{ background: invoice.status === 'paid' ? '#dcfce7' : '#fef3c7', color: invoice.status === 'paid' ? '#166534' : '#92400e', borderColor: invoice.status === 'paid' ? '#86efac' : '#fcd34d' }}>
                {STATUS_CONFIG[invoice.status]?.label || invoice.status}
              </div>
            </div>
          </div>

          {/* Invoice & Request Info */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-xs font-bold text-gray-500 mb-2 uppercase">معلومات الفاتورة</h3>
              <div className="space-y-1 text-sm">
                <p><span className="text-gray-600">رقم الفاتورة:</span> <strong>{invoice.invoice_number}</strong></p>
                <p><span className="text-gray-600">تاريخ الإصدار:</span> {format(new Date(invoice.issue_date), 'dd MMMM yyyy', { locale: ar })}</p>
                {invoice.due_date && <p><span className="text-gray-600">تاريخ الاستحقاق:</span> {format(new Date(invoice.due_date), 'dd MMMM yyyy', { locale: ar })}</p>}
                {invoice.payment_method && <p><span className="text-gray-600">طريقة الدفع:</span> {invoice.payment_method}</p>}
              </div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-xs font-bold text-gray-500 mb-2 uppercase">الطلب المرتبط</h3>
              <div className="space-y-1 text-sm">
                <p><span className="text-gray-600">رقم الطلب:</span> <strong>{request.request_number}</strong></p>
                <p><span className="text-gray-600">الخدمة:</span> {request.title}</p>
                <p><span className="text-gray-600">تاريخ الطلب:</span> {format(new Date(request.created_at), 'dd MMMM yyyy', { locale: ar })}</p>
              </div>
            </div>
          </div>

          {/* Customer */}
          <div className="mb-6">
            <h3 className="text-xs font-bold text-gray-500 mb-2 uppercase">العميل</h3>
            <div className="border rounded-lg p-4">
              <p className="font-bold text-base">{invoice.customer_name}</p>
              {invoice.customer_phone && <p className="text-sm text-gray-600 flex items-center gap-1 mt-1"><Phone className="h-3 w-3" /> {invoice.customer_phone}</p>}
              {request.location && <p className="text-sm text-gray-600 flex items-center gap-1 mt-1"><MapPin className="h-3 w-3" /> {request.location}</p>}
            </div>
          </div>

          {/* Items Table */}
          <table className="w-full mb-6 border-collapse">
            <thead>
              <tr style={{ background: '#030957', color: 'white' }}>
                <th className="p-3 text-right text-sm font-bold">البند</th>
                <th className="p-3 text-center text-sm font-bold w-20">الكمية</th>
                <th className="p-3 text-center text-sm font-bold w-32">سعر الوحدة</th>
                <th className="p-3 text-center text-sm font-bold w-32">الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                  <td className="p-3 text-sm">{item.description}</td>
                  <td className="p-3 text-sm text-center">{item.quantity}</td>
                  <td className="p-3 text-sm text-center">{Number(item.unit_price).toLocaleString('ar-EG')}</td>
                  <td className="p-3 text-sm text-center font-semibold">{Number(item.total).toLocaleString('ar-EG')}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="flex justify-end mb-6">
            <div className="w-full max-w-xs space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">المجموع الفرعي:</span>
                <span className="font-semibold">{Number(subtotal).toLocaleString('ar-EG')} {invoice.currency}</span>
              </div>
              {taxAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">الضريبة ({invoice.tax_rate || 0}%):</span>
                  <span className="font-semibold">{Number(taxAmount).toLocaleString('ar-EG')} {invoice.currency}</span>
                </div>
              )}
              <div className="flex justify-between text-lg pt-2 border-t-2" style={{ borderColor: '#030957' }}>
                <span className="font-bold" style={{ color: '#030957' }}>الإجمالي:</span>
                <span className="font-bold" style={{ color: '#030957' }}>{Number(invoice.amount).toLocaleString('ar-EG')} {invoice.currency}</span>
              </div>
            </div>
          </div>

          {/* Notes & QR */}
          <div className="grid grid-cols-3 gap-4 pt-6 border-t">
            <div className="col-span-2">
              {invoice.notes && (
                <>
                  <h4 className="text-xs font-bold text-gray-500 mb-1 uppercase">ملاحظات</h4>
                  <p className="text-sm text-gray-700 mb-3">{invoice.notes}</p>
                </>
              )}
              <div className="text-xs text-gray-500 mt-4 pt-3 border-t">
                <p>هذه الفاتورة صادرة إلكترونياً من نظام UberFix</p>
                <p className="mt-1">للتحقق من صحة الفاتورة، امسح رمز QR ←</p>
              </div>
            </div>
            <div className="flex flex-col items-center justify-center">
              <div className="bg-white p-2 border rounded">
                <QRCodeSVG value={verifyUrl} size={90} level="M" />
              </div>
              <p className="text-xs text-gray-500 mt-2">للتحقق</p>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center text-xs text-gray-400 mt-6 pt-4 border-t">
            <p style={{ color: '#030957', fontWeight: 600 }}>UberFix © {new Date().getFullYear()} — جميع الحقوق محفوظة</p>
            <p className="mt-1">uberfix.shop</p>
          </div>
        </div>
      </div>
    </div>
  );
}