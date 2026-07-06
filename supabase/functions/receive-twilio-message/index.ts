import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';
import { verifyTwilioSignature, logVerificationFailure } from '../_shared/webhookVerifier.ts';
import { getTwilioCredentials } from '../_shared/secrets.ts';

interface TwilioIncomingMessage {
  MessageSid: string;
  From: string;
  To: string;
  Body: string;
  NumMedia?: string;
  MediaUrl0?: string;
  MediaContentType0?: string;
  ProfileName?: string;
  WaId?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Get Twilio credentials for signature verification
    const twilioCredentials = getTwilioCredentials(false);
    
    if (!twilioCredentials?.authToken) {
      console.error('❌ Twilio auth token not configured - rejecting webhook (cannot verify signature)');
      await logVerificationFailure(supabase, 'twilio', {
        ip: req.headers.get('x-forwarded-for') || undefined,
        userAgent: req.headers.get('user-agent') || undefined,
        path: '/receive-twilio-message',
        reason: 'TWILIO auth token not configured'
      }).catch(() => {});
      return new Response(
        JSON.stringify({ error: 'Service unavailable - signature verification not configured' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    {
      // Verify Twilio signature
      const webhookUrl = `${supabaseUrl}/functions/v1/receive-twilio-message`;
      const isValid = await verifyTwilioSignature(req.clone(), twilioCredentials.authToken, webhookUrl);
      
      if (!isValid) {
        console.error('❌ Invalid Twilio signature - potential spoofed request');
        
        // Log the failed attempt
        await logVerificationFailure(supabase, 'twilio', {
          ip: req.headers.get('x-forwarded-for') || undefined,
          userAgent: req.headers.get('user-agent') || undefined,
          path: '/receive-twilio-message',
          reason: 'Invalid X-Twilio-Signature'
        });
        
        return new Response(
          JSON.stringify({ error: 'Invalid signature' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      console.log('✅ Twilio signature verified successfully');
    }

    // Parse form data from Twilio webhook
    const formData = await req.formData();
    const data: TwilioIncomingMessage = {
      MessageSid: formData.get('MessageSid') as string,
      From: formData.get('From') as string,
      To: formData.get('To') as string,
      Body: formData.get('Body') as string,
      NumMedia: formData.get('NumMedia') as string,
      MediaUrl0: formData.get('MediaUrl0') as string,
      MediaContentType0: formData.get('MediaContentType0') as string,
      ProfileName: formData.get('ProfileName') as string,
      WaId: formData.get('WaId') as string,
    };

    console.log('📥 Incoming message received:', {
      sid: data.MessageSid,
      from: data.From,
      to: data.To,
      hasMedia: data.NumMedia && parseInt(data.NumMedia) > 0,
    });

    // Determine message type
    const messageType = data.From.includes('whatsapp:') ? 'whatsapp' : 'sms';
    const cleanFrom = data.From.replace('whatsapp:', '');
    const cleanTo = data.To.replace('whatsapp:', '');

    // Store incoming message in message_logs
    const { data: messageLog, error: logError } = await supabase
      .from('message_logs')
      .insert({
        external_id: data.MessageSid,
        recipient: cleanTo,
        message_content: data.Body || '[Media Message]',
        message_type: messageType,
        provider: 'twilio',
        status: 'received',
        sent_at: new Date().toISOString(),
        delivered_at: new Date().toISOString(),
        metadata: {
          from: cleanFrom,
          to: cleanTo,
          direction: 'incoming',
          profileName: data.ProfileName,
          waId: data.WaId,
          hasMedia: data.NumMedia && parseInt(data.NumMedia) > 0,
          mediaUrl: data.MediaUrl0,
          mediaType: data.MediaContentType0,
        },
      })
      .select()
      .single();

    if (logError) {
      console.error('Error storing incoming message:', logError);
      throw logError;
    }

    console.log('✅ Incoming message stored:', messageLog.id);

    // Find related maintenance request
    const { data: relatedRequest } = await supabase
      .from('maintenance_requests')
      .select('id, title, created_by')
      .or(`client_phone.eq.${cleanFrom},client_phone.ilike.%${cleanFrom.slice(-10)}%`)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Notify staff users
    const { data: staffUsers } = await supabase
      .from('user_roles')
      .select('user_id')
      .in('role', ['admin', 'manager', 'staff']);

    if (staffUsers && staffUsers.length > 0) {
      const notifications = staffUsers.map(staff => ({
        recipient_id: staff.user_id,
        title: `رسالة ${messageType === 'whatsapp' ? 'واتساب' : 'SMS'} واردة`,
        message: `من: ${data.ProfileName || cleanFrom}\nالرسالة: ${data.Body || '[رسالة وسائط]'}`,
        type: 'info',
        entity_type: 'message',
        entity_id: relatedRequest?.id,
        message_log_id: messageLog.id,
      }));

      await supabase.from('notifications').insert(notifications);
    }

    // Respond with TwiML
    const twimlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>شكراً لتواصلك معنا. سيتم الرد عليك في أقرب وقت.</Message>
</Response>`;

    return new Response(twimlResponse, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/xml',
      },
    });

  } catch (error) {
    console.error('Error processing incoming message:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to process incoming message',
        details: error instanceof Error ? error.message : String(error)
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
