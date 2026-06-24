import Stripe from 'npm:stripe@14.25.0';
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const jsonResponse = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const safeBaseUrl = (originFromClient?: string | null) => {
  const appUrl = Deno.env.get('APP_URL') || originFromClient || 'http://localhost:5173';
  try {
    const parsed = new URL(appUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error('Invalid URL protocol.');
    }
    return parsed.origin;
  } catch {
    return 'http://localhost:5173';
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!stripeSecretKey) {
      return jsonResponse(500, { error: 'Missing STRIPE_SECRET_KEY in Supabase secrets.' });
    }

    let user: { id: string; email?: string | null } | null = null;
    const authorization = request.headers.get('Authorization');

    if (authorization && supabaseUrl && supabaseAnonKey) {
      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authorization } },
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data: { user: maybeUser } } = await supabase.auth.getUser();
      user = maybeUser || null;
    }

    const body = await request.json().catch(() => ({}));
    const eventId = body?.eventId ? String(body.eventId).slice(0, 64) : '';
    const eventTitle = body?.eventTitle ? String(body.eventTitle).slice(0, 200) : 'Apollo Selene Event';
    const baseUrl = safeBaseUrl(body?.origin || request.headers.get('origin'));

    // Amount is in cents; clamp between £1 and £500
    const rawAmount = parseInt(body?.amountCents, 10);
    if (!Number.isFinite(rawAmount) || rawAmount < 100 || rawAmount > 50000) {
      return jsonResponse(400, { error: 'Contribution amount must be between £1 and £500.' });
    }
    const amountCents = rawAmount;

    const stripe = new Stripe(stripeSecretKey, { apiVersion: '2024-06-20' });

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'gbp',
            unit_amount: amountCents,
            product_data: {
              name: `Contribution — ${eventTitle}`,
              description: 'Thank you for supporting this event.',
            },
          },
        },
      ],
      client_reference_id: user?.id
        ? `${user.id}:${eventId}:contribution`
        : `guest:${eventId}:contribution:${Date.now()}`,
      customer_email: user?.email || undefined,
      success_url: `${baseUrl}/thank-you?session_id={CHECKOUT_SESSION_ID}&contribution=true`,
      cancel_url: `${baseUrl}/events?contribution=cancelled`,
      metadata: {
        user_id: user?.id || '',
        event_id: eventId,
        event_title: eventTitle,
        type: 'contribution',
      },
    });

    return jsonResponse(200, { ok: true, sessionId: session.id, url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error.';
    return jsonResponse(500, { error: message });
  }
});
