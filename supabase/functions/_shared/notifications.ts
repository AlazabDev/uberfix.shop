import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@4.0.0";

/**
 * Centralized notification service for Edge Functions
 * Handles Email, SMS, WhatsApp, and In-App notifications
 */

export interface NotificationChannel {
  type: 'email' | 'sms' | 'whatsapp' | 'in_app';
  enabled: boolean;
}

export interface NotificationData {
  recipientId: string;
  recipientEmail?: string;
  recipientPhone?: string;
  title: string;
  message: string;
  htmlContent?: string;
  entityType?: string;
  entityId?: string;
  channels: NotificationChannel[];
}

export interface NotificationResult {
  channel: string;
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Get Resend client (lazily initialized)
 */
function getResendClient(): Resend | null {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  if (!apiKey) {
    console.warn('RESEND_API_KEY not configured');
    return null;
  }
  return new Resend(apiKey);
}

/**
 * Send in-app notification
 */
export async function sendInAppNotification(
  supabase: SupabaseClient,
  data: {
    recipientId: string;
    title: string;
    message: string;
    type?: string;
    entityType?: string;
    entityId?: string;
  }
): Promise<NotificationResult> {
  try {
    const { error } = await supabase.from('notifications').insert({
      recipient_id: data.recipientId,
      title: data.title,
      message: data.message,
      type: data.type || 'info',
      entity_type: data.entityType,
      entity_id: data.entityId
    });

    if (error) throw error;

    return { channel: 'in_app', success: true };
  } catch (error) {
    console.error('In-app notification error:', error);
    return {
      channel: 'in_app',
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Send email notification
 */
export async function sendEmailNotification(
  data: {
    to: string;
    subject: string;
    html: string;
    from?: string;
  }
): Promise<NotificationResult> {
  const resend = getResendClient();
  if (!resend) {
    return {
      channel: 'email',
      success: false,
      error: 'Email service not configured'
    };
  }

  try {
    const result = await resend.emails.send({
      from: data.from || 'UberFix <hello@tx.uberfix.shop>',
      to: [data.to],
      subject: data.subject,
      html: data.html
    });

    return {
      channel: 'email',
      success: true,
      messageId: result.data?.id
    };
  } catch (error) {
    console.error('Email notification error:', error);
    return {
      channel: 'email',
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Send SMS via Twilio
 */
export async function sendSMS(
  supabase: SupabaseClient,
  data: {
    to: string;
    message: string;
    requestId?: string;
  }
): Promise<NotificationResult> {
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  const phoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER');

  if (!accountSid || !authToken) {
    return {
      channel: 'sms',
      success: false,
      error: 'Twilio credentials not configured'
    };
  }

  try {
    // Format phone number
    let toNumber = data.to;
    if (!toNumber.startsWith('+')) {
      if (toNumber.startsWith('01')) {
        toNumber = `+2${toNumber}`;
      } else if (toNumber.startsWith('201')) {
        toNumber = `+${toNumber}`;
      }
    }

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    
    const formData = new URLSearchParams({
      To: toNumber,
      From: phoneNumber || Deno.env.get('TWILIO_PHONE_NUMBER') || '+15557285727',
      Body: data.message,
      StatusCallback: `${Deno.env.get('SUPABASE_URL')}/functions/v1/twilio-delivery-status`
    });

    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`)
      },
      body: formData.toString()
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Failed to send SMS');
    }

    // Log to message_logs
    await supabase.from('message_logs').insert({
      request_id: data.requestId,
      recipient: toNumber,
      message_type: 'sms',
      message_content: data.message,
      provider: 'twilio',
      status: result.status,
      external_id: result.sid,
      sent_at: new Date().toISOString()
    });

    return {
      channel: 'sms',
      success: true,
      messageId: result.sid
    };
  } catch (error) {
    console.error('SMS notification error:', error);
    return {
      channel: 'sms',
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Send WhatsApp message via Twilio
 */
export async function sendWhatsApp(
  supabase: SupabaseClient,
  data: {
    to: string;
    message: string;
    requestId?: string;
    templateId?: string;
    variables?: Record<string, string>;
    mediaUrl?: string;
  }
): Promise<NotificationResult> {
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');

  if (!accountSid || !authToken) {
    return {
      channel: 'whatsapp',
      success: false,
      error: 'Twilio credentials not configured'
    };
  }

  try {
    // Format phone number
    let toNumber = data.to;
    if (!toNumber.startsWith('+')) {
      if (toNumber.startsWith('01')) {
        toNumber = `+2${toNumber}`;
      } else if (toNumber.startsWith('201')) {
        toNumber = `+${toNumber}`;
      }
    }

    if (!toNumber.startsWith('whatsapp:')) {
      toNumber = `whatsapp:${toNumber}`;
    }

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    
    const formParams: Record<string, string> = {
      To: toNumber,
      From: `whatsapp:${Deno.env.get('TWILIO_WHATSAPP_NUMBER') || '+15557285727'}`,
      StatusCallback: `${Deno.env.get('SUPABASE_URL')}/functions/v1/twilio-delivery-status`
    };

    if (data.templateId) {
      formParams.ContentSid = data.templateId;
      if (data.variables) {
        formParams.ContentVariables = JSON.stringify(data.variables);
      }
    } else {
      formParams.Body = data.message;
    }

    if (data.mediaUrl) {
      formParams.MediaUrl = data.mediaUrl;
    }

    const formData = new URLSearchParams(formParams);

    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`)
      },
      body: formData.toString()
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Failed to send WhatsApp');
    }

    // Log to message_logs
    await supabase.from('message_logs').insert({
      request_id: data.requestId,
      recipient: toNumber,
      message_type: 'whatsapp',
      message_content: data.message,
      provider: 'twilio',
      status: result.status,
      external_id: result.sid,
      sent_at: new Date().toISOString(),
      metadata: {
        template_id: data.templateId,
        variables: data.variables,
        has_media: !!data.mediaUrl
      }
    });

    return {
      channel: 'whatsapp',
      success: true,
      messageId: result.sid
    };
  } catch (error) {
    console.error('WhatsApp notification error:', error);
    return {
      channel: 'whatsapp',
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Send notification to multiple channels
 */
export async function sendMultiChannelNotification(
  supabase: SupabaseClient,
  data: NotificationData
): Promise<NotificationResult[]> {
  const results: NotificationResult[] = [];

  for (const channel of data.channels) {
    if (!channel.enabled) continue;

    let result: NotificationResult;

    switch (channel.type) {
      case 'in_app':
        result = await sendInAppNotification(supabase, {
          recipientId: data.recipientId,
          title: data.title,
          message: data.message,
          entityType: data.entityType,
          entityId: data.entityId
        });
        break;

      case 'email':
        if (!data.recipientEmail) {
          result = { channel: 'email', success: false, error: 'No email provided' };
        } else {
          result = await sendEmailNotification({
            to: data.recipientEmail,
            subject: data.title,
            html: data.htmlContent || `<p>${data.message}</p>`
          });
        }
        break;

      case 'sms':
        if (!data.recipientPhone) {
          result = { channel: 'sms', success: false, error: 'No phone provided' };
        } else {
          result = await sendSMS(supabase, {
            to: data.recipientPhone,
            message: data.message,
            requestId: data.entityId
          });
        }
        break;

      case 'whatsapp':
        if (!data.recipientPhone) {
          result = { channel: 'whatsapp', success: false, error: 'No phone provided' };
        } else {
          result = await sendWhatsApp(supabase, {
            to: data.recipientPhone,
            message: data.message,
            requestId: data.entityId
          });
        }
        break;

      default:
        result = { channel: channel.type, success: false, error: 'Unknown channel' };
    }

    results.push(result);
  }

  return results;
}
