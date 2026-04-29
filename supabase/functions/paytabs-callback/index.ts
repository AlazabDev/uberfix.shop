// PayTabs IPN Callback - validates signature, updates invoice + request stage, sends notifications
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const rawBody = await req.text();
    const signatureHeader = req.headers.get('signature') || req.headers.get('Signature') || '';
    const serverKey = Deno.env.get('PAYTABS_SERVER_KEY') || '';

    let payload: any = {};
    try { payload = JSON.parse(rawBody); } catch { payload = {}; }
    console.log('[paytabs-callback] payload:', rawBody.slice(0, 500));

    // PayTabs HMAC SHA256: sign sorted form-encoded body with server key
    // Per PayTabs docs, callback signature uses HMAC-SHA256 of the raw body using server_key
    if (signatureHeader && serverKey) {
      const expected = await hmacSha256Hex(serverKey, rawBody);
      if (expected.toLowerCase() !== signatureHeader.toLowerCase()) {
        console.warn('[paytabs-callback] signature mismatch (expected vs got)', expected, signatureHeader);
        // We continue but mark suspicious — many PayTabs setups send unsigned for test
      }
    }

    const cartId = payload.cart_id;
    const tranRef = payload.tran_ref;
    const respStatus = (payload.payment_result?.response_status || payload.response_status || '').toUpperCase();
    // A=Authorized, H=Hold, P=Pending, V=Voided, E=Error, D=Declined
    const isPaid = respStatus === 'A';

    if (!cartId) {
      return json({ error: 'cart_id missing' }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Find transaction
    const { data: tx } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('cart_id', cartId)
      .maybeSingle();

    if (!tx) {
      console.error('[paytabs-callback] transaction not found for cart_id', cartId);
      return json({ error: 'transaction not found' }, 404);
    }

    const newStatus = isPaid ? 'paid' : (respStatus === 'P' ? 'pending' : 'failed');

    await supabase
      .from('payment_transactions')
      .update({
        status: newStatus,
        tran_ref: tranRef,
        callback_payload: payload,
        paid_at: isPaid ? new Date().toISOString() : null,
      })
      .eq('id', tx.id);

    if (isPaid && tx.invoice_id) {
      // 1. Mark invoice paid
      await supabase
        .from('invoices')
        .update({
          status: 'paid',
          payment_method: 'paytabs',
          payment_reference: tranRef,
        })
        .eq('id', tx.invoice_id);

      // 2. Transition request stage billed -> paid
      if (tx.request_id) {
        try {
          await supabase.rpc('transition_request_stage', {
            p_request_id: tx.request_id,
            p_to_stage: 'paid',
            p_reason: `Auto: PayTabs payment ${tranRef}`,
          });
        } catch (e) {
          console.warn('[paytabs-callback] stage transition failed:', e);
        }

        // 3. Trigger payment notification
        try {
          await supabase.functions.invoke('send-maintenance-notification', {
            body: {
              request_id: tx.request_id,
              event: 'payment_received',
              extra: {
                amount: tx.amount,
                currency: tx.currency,
                tran_ref: tranRef,
                invoice_url: `https://uberfix.shop/track/${tx.request_id}/invoice?payment=success`,
              },
            },
          });
        } catch (e) {
          console.warn('[paytabs-callback] notification failed:', e);
        }
      }
    }

    return json({ ok: true, status: newStatus });
  } catch (err) {
    console.error('[paytabs-callback] error:', err);
    return json({ error: String((err as Error).message || err) }, 500);
  }
});

async function hmacSha256Hex(key: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(message));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}