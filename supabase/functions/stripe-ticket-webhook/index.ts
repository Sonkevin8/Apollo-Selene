import Stripe from 'npm:stripe@14.25.0';
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

// Helper to generate a short unique reference number (8-char alphanumeric)
function generateReferenceNumber() {
  // Use a random 8-char base36 string (0-9a-z)
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

const jsonResponse = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const toStatus = (eventType: string) => {
  switch (eventType) {
    case 'checkout.session.completed':
    case 'checkout.session.async_payment_succeeded':
      return 'paid';
    case 'checkout.session.expired':
      return 'cancelled';
    default:
      return 'pending';
  }
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed.' });
  }

  try {
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!stripeSecretKey || !stripeWebhookSecret) {
      return jsonResponse(500, {
        error: 'Missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET in Supabase secrets.',
      });
    }

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return jsonResponse(500, {
        error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in Supabase secrets.',
      });
    }

    const signature = request.headers.get('stripe-signature');
    if (!signature) {
      return jsonResponse(400, { error: 'Missing Stripe signature.' });
    }

    const payload = await request.text();

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2024-06-20',
    });

    const stripeEvent = await stripe.webhooks.constructEventAsync(
      payload,
      signature,
      stripeWebhookSecret
    );

    if (!stripeEvent.type.startsWith('checkout.session.')) {
      return jsonResponse(200, { ok: true, ignored: stripeEvent.type });
    }

    const session = stripeEvent.data.object as Stripe.Checkout.Session;
    const eventId = String(session.metadata?.event_id || '').slice(0, 64);
    if (!eventId) {
      return jsonResponse(200, { ok: true, ignored: 'missing event metadata' });
    }

    const userIdFromMetadata = session.metadata?.user_id || null;
    const validUserId =
      typeof userIdFromMetadata === 'string' &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userIdFromMetadata)
        ? userIdFromMetadata
        : null;

    const paymentStatus = toStatus(stripeEvent.type);

    // Try to generate a unique reference number (retry if collision)
    let referenceNumber = generateReferenceNumber();
    let tries = 0;
    let maxTries = 5;
    let unique = false;
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    while (!unique && tries < maxTries) {
      // Check for collision
      const { data: existing, error: checkError } = await supabase
        .from('event_ticket_purchases')
        .select('id')
        .eq('reference_number', referenceNumber)
        .maybeSingle();
      if (!existing) {
        unique = true;
      } else {
        referenceNumber = generateReferenceNumber();
        tries++;
      }
    }
    if (!unique) {
      return jsonResponse(500, { error: 'Could not generate unique reference number.' });
    }

    const row = {
      user_id: validUserId,
      event_id: eventId,
      event_title: String(session.metadata?.event_title || '').slice(0, 200) || null,
      event_date: String(session.metadata?.event_date || '').slice(0, 64) || null,
      event_location: String(session.metadata?.event_location || '').slice(0, 200) || null,
      purchaser_email: (session.customer_details?.email || session.customer_email || '').slice(0, 320) || null,
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id:
        typeof session.payment_intent === 'string' ? session.payment_intent.slice(0, 128) : null,
      amount_total: typeof session.amount_total === 'number' ? session.amount_total : null,
      currency: (session.currency || '').slice(0, 16) || null,
      payment_status: paymentStatus,
      raw_event: stripeEvent as unknown as Record<string, unknown>,
      updated_at: new Date().toISOString(),
      reference_number: referenceNumber,
    };

    const { error: upsertError } = await supabase
      .from('event_ticket_purchases')
      .upsert(row, { onConflict: 'stripe_checkout_session_id' });

    if (upsertError) {
      return jsonResponse(500, { error: upsertError.message });
    }

    return jsonResponse(200, { ok: true, processed: stripeEvent.type, sessionId: session.id, referenceNumber });
  } catch (error) {
    return jsonResponse(400, {
      error: error instanceof Error ? error.message : 'Webhook processing failed.',
    });
  }
});
