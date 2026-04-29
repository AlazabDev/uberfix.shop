// PayTabs Egypt - Create Payment Session (Hosted Page)
// Public endpoint called from /track/{request_id}/invoice
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const PAYTABS_API_URL = 'https://secure-egypt.paytabs.com/payment/request';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { request_id, return_url } = await req.json();
    if (!request_id) {
      return json({ error: 'request_id is required' }, 400);
    }

    const profileId = Deno.env.get('PAYTABS_PROFILE_ID');
    const serverKey = Deno.env.get('PAYTABS_SERVER_KEY');
    const currency = Deno.env.get('PAYTABS_CURRENCY') || 'EGP';
    if (!profileId || !serverKey) {
      return json({ error: 'PayTabs not configured' }, 500);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Fetch invoice via the existing public RPC
    const { data: invData, error: invErr } = await supabase
      .rpc('public_get_invoice_by_request', { p_request_id: request_id });

    if (invErr || !invData || (invData as any).error) {
      return json({ error: 'Invoice not found for this request' }, 404);
    }

    const invoice = invData as any;
    if (invoice.status === 'paid') {
      return json({ error: 'Invoice already paid', already_paid: true }, 409);
    }

    const amount = Number(invoice.amount || 0);
    if (amount <= 0) {
      return json({ error: 'Invalid invoice amount' }, 400);
    }

    // Build cart_id (UF- prefix + invoice number + timestamp for uniqueness)
    const cartId = `UF-${invoice.invoice_number || invoice.id.slice(0, 8)}-${Date.now()}`;

    const projectRef = (Deno.env.get('SUPABASE_URL') || '').match(/https:\/\/([^.]+)/)?.[1];
    const callbackUrl = `https://${projectRef}.supabase.co/functions/v1/paytabs-callback`;
    const finalReturnUrl = return_url || `https://uberfix.shop/track/${request_id}/invoice?payment=success`;

    const payload = {
      profile_id: Number(profileId),
      tran_type: 'sale',
      tran_class: 'ecom',
      cart_id: cartId,
      cart_description: `UberFix Invoice ${invoice.invoice_number || ''}`.trim(),
      cart_currency: currency,
      cart_amount: amount,
      callback: callbackUrl,
      return: finalReturnUrl,
      customer_details: {
        name: invoice.customer_name || 'Customer',
        email: invoice.customer_email || 'noreply@uberfix.shop',
        phone: invoice.customer_phone || '',
        street1: 'N/A',
        city: 'Cairo',
        state: 'CA',
        country: 'EG',
        zip: '00000',
      },
      hide_shipping: true,
    };

    const ptRes = await fetch(PAYTABS_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': serverKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const ptJson = await ptRes.json();
    console.log('[paytabs-create] response:', JSON.stringify(ptJson));

    if (!ptRes.ok || !ptJson.redirect_url) {
      return json({ error: 'PayTabs request failed', details: ptJson }, 502);
    }

    // Persist transaction
    await supabase.from('payment_transactions').insert({
      invoice_id: invoice.id,
      request_id,
      cart_id: cartId,
      provider: 'paytabs',
      tran_ref: ptJson.tran_ref || null,
      amount,
      currency,
      status: 'pending',
      payment_url: ptJson.redirect_url,
      customer_name: invoice.customer_name,
      customer_email: invoice.customer_email,
      customer_phone: invoice.customer_phone,
      raw_response: ptJson,
    });

    return json({
      success: true,
      redirect_url: ptJson.redirect_url,
      tran_ref: ptJson.tran_ref,
      cart_id: cartId,
    });
  } catch (err) {
    console.error('[paytabs-create] error:', err);
    return json({ error: String((err as Error).message || err) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}