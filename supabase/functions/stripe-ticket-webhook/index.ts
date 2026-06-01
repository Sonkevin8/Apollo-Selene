import Stripe from 'npm:stripe@14.25.0';
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
import { Resend } from 'npm:resend@3.2.0';

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

    // Send confirmation email for paid events
    if (paymentStatus === 'paid' && row.purchaser_email) {
      try {
        const resendApiKey = Deno.env.get('RESEND_API_KEY');
        if (resendApiKey) {
          const resend = new Resend(resendApiKey);
          const fromAddress = Deno.env.get('INVITES_FROM_EMAIL') || 'Apollo Selene <onboarding@resend.dev>';
          const appUrl = Deno.env.get('APP_URL') || 'https://apollo-selene.vercel.app';
          const eventTitle = row.event_title || 'the event';
          const eventDate = row.event_date ? ` on ${row.event_date}` : '';
          const eventLocation = row.event_location ? ` at ${row.event_location}` : '';
          await resend.emails.send({
            from: fromAddress,
            to: [row.purchaser_email],
            subject: `Your ticket for ${eventTitle} — Ref: ${referenceNumber}`,
            html: `
              <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto; line-height: 1.6; color: #1a1a1a; max-width: 560px; margin: 0 auto;">
                <h2 style="margin-bottom: 4px;">You're on the list ✓</h2>
                <p style="margin-top: 0; color: #555;">Your ticket has been confirmed for <strong>${eventTitle}</strong>${eventDate}${eventLocation}.</p>
                <div style="background: #f5f5f5; border-radius: 8px; padding: 16px 20px; margin: 20px 0;">
                  <p style="margin: 0; font-size: 13px; color: #888; text-transform: uppercase; letter-spacing: 0.05em;">Reference Number</p>
                  <p style="margin: 4px 0 0; font-size: 26px; font-weight: 700; letter-spacing: 0.1em; color: #1a1a1a;">${referenceNumber}</p>
                </div>
                <p style="color: #555; font-size: 14px;">Keep this reference number — you may be asked to show it at the door.</p>
                <p style="margin-top: 24px; font-size: 13px; color: #aaa;">Apollo Selene · <a href="${appUrl}/events" style="color: #aaa;">View Events</a></p>
              </div>
            `,
          });
        }
      } catch (_emailErr) {
        // Don't fail the webhook response if email sending fails
      }
    }

    return jsonResponse(200, { ok: true, processed: stripeEvent.type, sessionId: session.id, referenceNumber });
  } catch (error) {
    return jsonResponse(400, {
      error: error instanceof Error ? error.message : 'Webhook processing failed.',
    });
  }
});
