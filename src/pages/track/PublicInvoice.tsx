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
import { PublicShell } from '@/components/layout/PublicShell';
import { DocumentTemplate, DocTable, DocTableHead } from '@/components/documents/DocumentTemplate';

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
      <PublicShell subtitle="الفاتورة" maxWidth="3xl">
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-12 w-12 animate-spin text-[#030957]" />
        </div>
      </PublicShell>
    );
  }

  if (error || !request) {
    return (
      <PublicShell subtitle="الفاتورة" maxWidth="md">
        <Card className="mt-8">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">{error || 'الطلب غير موجود'}</h2>
            <Link to="/"><Button className="mt-4">العودة للرئيسية</Button></Link>
          </CardContent>
        </Card>
      </PublicShell>
    );
  }

  if (!invoice) {
    return (
      <PublicShell subtitle="الفاتورة" maxWidth="3xl">
        <DocumentTemplate
          documentType="إيصال طلب"
          documentTypeLatin="Service Receipt"
          documentId={request.request_number}
          documentDate={format(new Date(request.created_at), 'dd MMMM yyyy', { locale: ar })}
          toBlock={{
            title: 'العميل',
            lines: [
              request.client_name && <strong key="n">{request.client_name}</strong>,
              request.client_phone,
              request.location,
            ].filter(Boolean) as ReactNode[],
          }}
          headerFields={[
            { label: 'رقم الطلب', value: request.request_number },
            { label: 'الحالة', value: 'قيد التجهيز' },
          ]}
          notes="سيتم إصدار الفاتورة المالية النهائية فور إنهاء العمل وتسجيل التكلفة. يمكنك تتبع طلبك في أي وقت عبر الرابط المرفق."
          qrUrl={`${window.location.origin}/track/${request.id}`}
          qrLabel="تتبّع الطلب"
        >
          <div className="rounded-md p-5 text-center" style={{ background: 'linear-gradient(135deg, #030957 0%, #1a237e 100%)' }}>
            <FileText className="h-10 w-10 text-white/80 mx-auto mb-2" />
            <p className="text-white text-lg font-bold">الفاتورة قيد التجهيز</p>
            <p className="text-white/80 text-xs mt-1">المبلغ: سيتم تحديده بعد إنهاء العمل</p>
          </div>

          <div className="mt-5">
            <h3 className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">الخدمة المطلوبة</h3>
            <div className="border-2 border-dashed rounded p-4" style={{ borderColor: '#FFB900' }}>
              <p className="font-semibold">{request.title}</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 mt-6 print:hidden">
            <Link to={`/track/${request.id}`} className="flex-1">
              <Button variant="outline" className="w-full">
                <ArrowRight className="h-4 w-4 ml-2" /> تتبع الطلب
              </Button>
            </Link>
            <Button
              className="flex-1 bg-success text-success-foreground hover:bg-success/90"
              onClick={() => openWhatsApp(`استفسار عن فاتورة الطلب: ${request.request_number}`)}
            >
              <CheckCircle2 className="h-4 w-4 ml-2" /> تواصل لتفاصيل الفاتورة
            </Button>
          </div>
        </DocumentTemplate>
      </PublicShell>
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
    <PublicShell subtitle="الفاتورة" maxWidth="3xl">
      {/* Action Bar - hidden on print */}
      <div className="mb-4 print:hidden">
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
      <div>
        <div ref={invoiceRef} className="relative">
          {invoice.status === 'paid' && (
            <div
              className="absolute pointer-events-none select-none"
              style={{
                top: '40%', right: '50%',
                transform: 'translate(50%,-50%) rotate(-22deg)',
                border: '6px solid #16a34a', color: '#16a34a',
                padding: '12px 36px', fontSize: '54px', fontWeight: 900,
                letterSpacing: '4px', opacity: 0.18, borderRadius: '12px', zIndex: 10,
              }}
            >
              مدفوعة ✓ PAID
            </div>
          )}

          <DocumentTemplate
            documentType="فاتورة"
            documentTypeLatin="Invoice"
            documentId={invoice.invoice_number}
            documentDate={format(new Date(invoice.issue_date), 'dd MMMM yyyy', { locale: ar })}
            toBlock={{
              title: 'فاتورة إلى',
              lines: [
                <strong key="n">{invoice.customer_name}</strong>,
                invoice.customer_phone && (
                  <span key="p" className="flex items-center gap-1"><Phone className="h-3 w-3" /> {invoice.customer_phone}</span>
                ),
                request.location && (
                  <span key="l" className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {request.location}</span>
                ),
              ].filter(Boolean) as ReactNode[],
            }}
            fromBlock={{
              title: 'صادرة من',
              lines: [
                <strong key="n">{invoice.company_name || 'UberFix.shop'}</strong>,
                invoice.company_address || 'منصة الصيانة الذكية',
                invoice.company_phone && `📞 ${invoice.company_phone}`,
                invoice.company_tax_id && `الرقم الضريبي: ${invoice.company_tax_id}`,
              ].filter(Boolean) as ReactNode[],
            }}
            headerFields={[
              { label: 'رقم الفاتورة', value: invoice.invoice_number },
              { label: 'الطلب المرتبط', value: request.request_number },
              { label: 'الحالة', value: STATUS_CONFIG[invoice.status]?.label || invoice.status },
              ...(invoice.due_date ? [{ label: 'تاريخ الاستحقاق', value: format(new Date(invoice.due_date), 'dd/MM/yyyy', { locale: ar }) }] : []),
            ]}
            qrUrl={verifyUrl}
            qrLabel="تحقّق من الفاتورة"
            summary={
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between gap-8">
                  <span>المجموع الفرعي:</span>
                  <span className="font-semibold">{Number(subtotal).toLocaleString('ar-EG')}</span>
                </div>
                {taxAmount > 0 && (
                  <div className="flex justify-between gap-8">
                    <span>الضريبة ({invoice.tax_rate || 0}%):</span>
                    <span className="font-semibold">{Number(taxAmount).toLocaleString('ar-EG')}</span>
                  </div>
                )}
                <div className="flex justify-between gap-8 pt-2 border-t border-[#030957]/30 text-base">
                  <span className="font-extrabold">الإجمالي:</span>
                  <span className="font-extrabold">
                    {Number(invoice.amount).toLocaleString('ar-EG')} {invoice.currency}
                  </span>
                </div>
              </div>
            }
            notes={
              <>
                {invoice.notes && (
                  <p className="mb-2"><strong>ملاحظات:</strong> {invoice.notes}</p>
                )}
                <p>هذه الفاتورة صادرة إلكترونياً من نظام UberFix. للتحقق من صحتها، امسح رمز QR.</p>
              </>
            }
          >
            <DocTable>
              <DocTableHead columns={['البند', 'الكمية', 'سعر الوحدة', 'الإجمالي']} />
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
            </DocTable>
          </DocumentTemplate>
        </div>
      </div>
    </PublicShell>
  );
}