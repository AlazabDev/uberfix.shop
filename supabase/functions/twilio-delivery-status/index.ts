import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TwilioStatusUpdate {
  MessageSid: string;
  MessageStatus: 'queued' | 'sent' | 'delivered' | 'read' | 'failed' | 'undelivered';
  To: string;
  From: string;
  ErrorCode?: string;
  ErrorMessage?: string;
  Body?: string;
  AccountSid?: string;
  SmsSid?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📥 Twilio delivery status webhook received');

    // Verify Twilio HMAC signature
    const twilioSignature = req.headers.get('X-Twilio-Signature') || req.headers.get('x-twilio-signature');
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    if (!twilioSignature || !authToken) {
      return new Response(JSON.stringify({ success: false, error: 'Missing signature' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    const rawBody = await req.text();
    const params = new URLSearchParams(rawBody);
    const sortedKeys = [...params.keys()].sort();
    const url = req.url;
    let data = url;
    for (const k of sortedKeys) data += k + (params.get(k) ?? '');
    const key = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(authToken),
      { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']
    );
    const sigBuf = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
    const expected = btoa(String.fromCharCode(...new Uint8Array(sigBuf)));
    if (expected !== twilioSignature) {
      console.warn('❌ Invalid Twilio signature');
      return new Response(JSON.stringify({ success: false, error: 'Invalid signature' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Build formData-compatible accessor from parsed params
    const formData = {
      get: (k: string) => params.get(k),
    };
    const statusUpdate: TwilioStatusUpdate = {
      MessageSid: formData.get('MessageSid') as string,
      MessageStatus: formData.get('MessageStatus') as any,
      To: formData.get('To') as string,
      From: formData.get('From') as string,
      ErrorCode: formData.get('ErrorCode') as string,
      ErrorMessage: formData.get('ErrorMessage') as string,
      Body: formData.get('Body') as string,
      AccountSid: formData.get('AccountSid') as string,
      SmsSid: formData.get('SmsSid') as string,
    };

    console.log('📊 Status update:', {
      sid: statusUpdate.MessageSid,
      status: statusUpdate.MessageStatus,
      to: statusUpdate.To,
      error: statusUpdate.ErrorCode,
    });

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Update message status in database
    const { data: message, error: updateError } = await supabase
      .from('whatsapp_messages')
      .update({
        status: statusUpdate.MessageStatus,
        error_code: statusUpdate.ErrorCode || null,
        error_message: statusUpdate.ErrorMessage || null,
        delivered_at: statusUpdate.MessageStatus === 'delivered' 
          ? new Date().toISOString() 
          : null,
        read_at: statusUpdate.MessageStatus === 'read' 
          ? new Date().toISOString() 
          : null,
        failed_at: statusUpdate.MessageStatus === 'failed' 
          ? new Date().toISOString() 
          : null,
        updated_at: new Date().toISOString(),
      })
      .eq('message_sid', statusUpdate.MessageSid)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Error updating message status:', updateError);
      
      // If message not found, log it but don't fail
      if (updateError.code === 'PGRST116') {
        console.warn('⚠️ Message not found in database:', statusUpdate.MessageSid);
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Message not found, status logged',
          }), 
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      }
      
      throw updateError;
    }

    console.log('✅ Message status updated:', message);

    // Create notification for failed messages
    if (statusUpdate.MessageStatus === 'failed' || statusUpdate.MessageStatus === 'undelivered') {
      await supabase.from('notifications').insert({
        recipient_id: message.sender_id,
        title: 'فشل إرسال رسالة واتساب',
        message: `فشل إرسال الرسالة إلى ${statusUpdate.To}. ${statusUpdate.ErrorMessage || 'خطأ غير معروف'}`,
        type: 'error',
        entity_type: 'whatsapp_message',
        entity_id: message.id,
      });
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Status updated successfully',
        data: message,
      }), 
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ Error in delivery status webhook:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : String(error),
      }), 
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
