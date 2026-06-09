import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InvoiceEmailRequest {
  invoice_id: string;
  recipient_email: string;
  recipient_name?: string;
}

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { invoice_id, recipient_email, recipient_name }: InvoiceEmailRequest = await req.json();

    if (!invoice_id || !recipient_email) {
      return new Response(
        JSON.stringify({ error: "invoice_id and recipient_email are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // جلب بيانات الفاتورة
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*, invoice_items(*)')
      .eq('id', invoice_id)
      .single();

    if (invoiceError || !invoice) {
      console.error('Invoice not found:', invoiceError);
      return new Response(
        JSON.stringify({ error: "Invoice not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // إنشاء HTML للفاتورة
    const invoiceHtml = `
      <div style="font-family: Arial, sans-serif; direction: rtl; text-align: right; max-width: 600px; margin: 0 auto;">
        <div style="background: #0b1e36; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">UberFix</h1>
          <p style="margin: 5px 0;">فاتورة صيانة</p>
        </div>
        
        <div style="padding: 20px; background: #f9fafb;">
          <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #0b1e36; margin-top: 0;">معلومات الفاتورة</h2>
            <p><strong>رقم الفاتورة:</strong> ${invoice.invoice_number}</p>
            <p><strong>تاريخ الإصدار:</strong> ${new Date(invoice.issue_date).toLocaleDateString('ar-EG')}</p>
            <p><strong>تاريخ الاستحقاق:</strong> ${invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('ar-EG') : '-'}</p>
            <p><strong>الحالة:</strong> ${invoice.status === 'paid' ? 'مدفوعة' : invoice.status === 'pending' ? 'قيد الانتظار' : invoice.status}</p>
          </div>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #0b1e36; margin-top: 0;">العميل</h2>
            <p><strong>الاسم:</strong> ${invoice.customer_name}</p>
            ${invoice.customer_email ? `<p><strong>البريد:</strong> ${invoice.customer_email}</p>` : ''}
            ${invoice.customer_phone ? `<p><strong>الهاتف:</strong> ${invoice.customer_phone}</p>` : ''}
          </div>
          
          ${invoice.invoice_items && invoice.invoice_items.length > 0 ? `
            <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h2 style="color: #0b1e36; margin-top: 0;">البنود</h2>
              <table style="width: 100%; border-collapse: collapse;">
                <thead>
                  <tr style="background: #f3f4f6;">
                    <th style="padding: 10px; border: 1px solid #e5e7eb; text-align: right;">الخدمة</th>
                    <th style="padding: 10px; border: 1px solid #e5e7eb; text-align: center;">الكمية</th>
                    <th style="padding: 10px; border: 1px solid #e5e7eb; text-align: left;">السعر</th>
                    <th style="padding: 10px; border: 1px solid #e5e7eb; text-align: left;">الإجمالي</th>
                  </tr>
                </thead>
                <tbody>
                  ${invoice.invoice_items.map((item: any) => `
                    <tr>
                      <td style="padding: 10px; border: 1px solid #e5e7eb;">${item.service_name}</td>
                      <td style="padding: 10px; border: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
                      <td style="padding: 10px; border: 1px solid #e5e7eb; text-align: left;">${item.unit_price} ${invoice.currency}</td>
                      <td style="padding: 10px; border: 1px solid #e5e7eb; text-align: left;">${item.total_price} ${invoice.currency}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : ''}
          
          <div style="background: #0b1e36; color: white; padding: 20px; border-radius: 8px; text-align: center;">
            <h2 style="margin: 0;">الإجمالي: ${invoice.amount} ${invoice.currency}</h2>
          </div>
          
          ${invoice.notes ? `
            <div style="background: white; padding: 20px; border-radius: 8px; margin-top: 20px;">
              <h3 style="color: #0b1e36; margin-top: 0;">ملاحظات</h3>
              <p>${invoice.notes}</p>
            </div>
          ` : ''}
        </div>
        
        <div style="text-align: center; padding: 20px; color: #6b7280; font-size: 12px;">
          <p>UberFix - منصة إدارة الصيانة</p>
          <p>شكراً لتعاملكم معنا</p>
        </div>
      </div>
    `;

    // إرسال البريد الإلكتروني
    const result = await resend.emails.send({
      from: 'UberFix Invoices <invoices@tx.uberfix.shop>',
      to: [recipient_email],
      subject: `فاتورة رقم ${invoice.invoice_number} - UberFix`,
      html: invoiceHtml
    });

    console.log('Invoice email sent successfully:', result);

    // تسجيل الإرسال في message_logs
    await supabase.from('message_logs').insert({
      message_type: 'invoice_email',
      provider: 'resend',
      recipient: recipient_email,
      message_content: `فاتورة ${invoice.invoice_number}`,
      status: 'sent',
      sent_at: new Date().toISOString(),
      metadata: { invoice_id, invoice_number: invoice.invoice_number }
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Invoice email sent successfully',
        result 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error in send-invoice:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
