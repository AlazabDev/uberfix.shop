import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * WhatsApp Messaging via Meta Graph API
 * ======================================
 * إرسال رسائل WhatsApp مباشرة عبر Meta API (بدون Twilio)
 * 
 * الاستخدام:
 * - رسائل نصية عادية
 * - رسائل بقوالب Meta المعتمدة
 * - رسائل بوسائط (صور/فيديو/مستندات)
 * - رسائل تفاعلية مع أزرار
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WhatsAppMessageRequest {
  to: string;
  message: string;
  type?: 'text' | 'template';
  templateName?: string;
  templateLanguage?: string;
  templateComponents?: Array<{
    type: string;
    parameters: Array<{ type: string; text?: string }>;
  }>;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'document' | 'audio';
  buttons?: Array<{ id: string; title: string }>;
  requestId?: string;
}

// تنسيق رقم الهاتف للصيغة الدولية
function formatPhoneNumber(phone: string): string {
  // إزالة المسافات والشرطات والأقواس
  let cleaned = phone.replace(/[\s\-\(\)]/g, '');
  
  // إزالة + البادئة (Meta API لا تحتاجها)
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.slice(1);
  }
  
  // رقم مصري محلي يبدأ بـ 0 → إضافة 20
  if (cleaned.startsWith('0') && cleaned.length === 11) {
    cleaned = '20' + cleaned.slice(1);
  }
  
  return cleaned;
}

// التحقق من صحة رقم الهاتف
function validatePhoneNumber(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, '');
  // رقم مصري صحيح: يبدأ بـ 20 ويتكون من 12 رقم
  return cleaned.length >= 10 && cleaned.length <= 15;
}

// التحقق من طول الرسالة
function validateMessage(msg: string): boolean {
  return msg.length > 0 && msg.length <= 4096;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // الحصول على بيانات اعتماد Meta
    const accessToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
    const phoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');

    if (!accessToken || !phoneNumberId) {
      console.error('❌ Missing Meta WhatsApp credentials');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'WhatsApp not configured. Please add WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID secrets.'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        }
      );
    }

    // التحقق من المستخدم (اختياري)
    let userId: string | null = null;
    const authHeader = req.headers.get('Authorization');
    
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      
      if (!authError && user) {
        userId = user.id;
        
        // Rate limiting
        const { data: recentMessages } = await supabase
          .from('message_logs')
          .select('created_at')
          .eq('metadata->>sender_id', userId)
          .gte('created_at', new Date(Date.now() - 60000).toISOString());

        if (recentMessages && recentMessages.length >= 10) {
          return new Response(
            JSON.stringify({ success: false, error: 'Rate limit exceeded. Maximum 10 messages per minute.' }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    const requestData: WhatsAppMessageRequest = await req.json();
    const { 
      to, 
      message, 
      type = 'text',
      templateName,
      templateLanguage = 'ar',
      templateComponents,
      mediaUrl,
      mediaType,
      buttons,
      requestId 
    } = requestData;

    if (!to) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required field: to' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // تنسيق رقم الهاتف
    const formattedTo = formatPhoneNumber(to);

    if (!validatePhoneNumber(formattedTo)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid phone number format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('📤 Sending WhatsApp via Meta:', { to: formattedTo, type, requestId });

    // بناء جسم الطلب حسب نوع الرسالة
    let requestBody: Record<string, unknown>;

    if (type === 'template' && templateName) {
      // رسالة قالب
      const templateObj: Record<string, unknown> = {
        name: templateName,
        language: { code: templateLanguage },
      };
      // إضافة المكونات فقط إذا كانت موجودة وغير فارغة
      if (templateComponents && templateComponents.length > 0) {
        // تصفية المكونات التي تحتوي على معاملات فارغة
        const validComponents = templateComponents.filter(
          (c: any) => c.parameters && c.parameters.length > 0 && c.parameters.every((p: any) => p.text && p.text.trim() !== '')
        );
        if (validComponents.length > 0) {
          templateObj.components = validComponents;
        }
      }
      requestBody = {
        messaging_product: 'whatsapp',
        to: formattedTo,
        type: 'template',
        template: templateObj
      };
    } else if (mediaUrl && mediaType) {
      // رسالة وسائط
      requestBody = {
        messaging_product: 'whatsapp',
        to: formattedTo,
        type: mediaType,
        [mediaType]: {
          link: mediaUrl,
          caption: message || undefined
        }
      };
    } else if (buttons && buttons.length > 0) {
      // رسالة تفاعلية مع أزرار
      requestBody = {
        messaging_product: 'whatsapp',
        to: formattedTo,
        type: 'interactive',
        interactive: {
          type: 'button',
          body: { text: message },
          action: {
            buttons: buttons.slice(0, 3).map(btn => ({
              type: 'reply',
              reply: { 
                id: btn.id, 
                title: btn.title.slice(0, 20) // حد 20 حرف
              }
            }))
          }
        }
      };
    } else {
      // رسالة نصية عادية
      if (!message || !validateMessage(message)) {
        return new Response(
          JSON.stringify({ success: false, error: 'Message must be between 1 and 4096 characters' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      requestBody = {
        messaging_product: 'whatsapp',
        to: formattedTo,
        type: 'text',
        text: { body: message }
      };
    }

    // إرسال الطلب إلى Meta Graph API
    const metaResponse = await fetch(
      `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      }
    );

    const metaResult = await metaResponse.json();

    if (!metaResponse.ok) {
      console.error('❌ Meta API error:', metaResult);
      
      // حفظ سجل الخطأ
      await supabase.from('message_logs').insert({
        request_id: requestId,
        recipient: formattedTo,
        message_type: 'whatsapp',
        message_content: message || templateName || '[media]',
        provider: 'meta',
        status: 'failed',
        error_message: metaResult.error?.message || 'Unknown error',
        metadata: {
          sender_id: userId,
          meta_error: metaResult.error,
          request_type: type
        }
      });

      return new Response(
        JSON.stringify({
          success: false,
          error: metaResult.error?.message || 'Failed to send message',
          details: metaResult.error
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      );
    }

    const messageId = metaResult.messages?.[0]?.id;
    console.log('✅ WhatsApp sent successfully:', messageId);

    // حفظ السجل في قاعدة البيانات
    const { error: dbError } = await supabase.from('message_logs').insert({
      request_id: requestId,
      recipient: formattedTo,
      message_type: 'whatsapp',
      message_content: message || templateName || '[media]',
      provider: 'meta',
      status: 'sent',
      external_id: messageId,
      sent_at: new Date().toISOString(),
      metadata: {
        sender_id: userId,
        request_type: type,
        template_name: templateName,
        has_media: !!mediaUrl,
        has_buttons: !!buttons
      }
    });

    if (dbError) {
      console.error('⚠️ Failed to log message:', dbError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        messageId,
        to: formattedTo,
        provider: 'meta'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error in send-whatsapp-meta:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
