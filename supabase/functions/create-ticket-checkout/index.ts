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
    const stripeTicketPriceId = Deno.env.get('STRIPE_TICKET_PRICE_ID');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!stripeSecretKey) {
      return jsonResponse(500, {
        error: 'Missing STRIPE_SECRET_KEY in Supabase secrets.',
      });
    }

    let user: { id: string; email?: string | null } | null = null;
    const authorization = request.headers.get('Authorization');

    // Auth is optional: signed-in users get linked purchases, guests can still pay.
    if (authorization && supabaseUrl && supabaseAnonKey) {
      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: {
          headers: {
            Authorization: authorization,
          },
        },
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });

      const {
        data: { user: maybeUser },
      } = await supabase.auth.getUser();
      user = maybeUser || null;
    }

    const body = await request.json().catch(() => ({}));
    const isContribution = body?.isContribution === true;
    const eventId = body?.eventId ? String(body.eventId).slice(0, 64) : '';
    const eventTitle = body?.eventTitle ? String(body.eventTitle).slice(0, 200) : '';
    const eventDate = body?.eventDate ? String(body.eventDate).slice(0, 64) : '';
    const eventLocation = body?.eventLocation ? String(body.eventLocation).slice(0, 200) : '';
    const baseUrl = safeBaseUrl(body?.origin || request.headers.get('origin'));

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2024-06-20',
    });

    let lineItems: Stripe.Checkout.SessionCreateParams.LineItem[];

    if (isContribution) {
      const rawAmount = parseInt(body?.amountCents, 10);
      if (!Number.isFinite(rawAmount) || rawAmount < 100 || rawAmount > 50000) {
        return jsonResponse(400, { error: 'Contribution amount must be between NZ$1 and NZ$500.' });
      }
      lineItems = [
        {
          quantity: 1,
          price_data: {
            currency: 'nzd',
            unit_amount: rawAmount,
            product_data: {
              name: `Contribution — ${eventTitle || 'Apollo Selene Event'}`,
              description: 'Thank you for supporting this event.',
            },
          },
        },
      ];
    } else {
      if (!stripeTicketPriceId) {
        return jsonResponse(500, {
          error: 'Missing STRIPE_TICKET_PRICE_ID in Supabase secrets.',
        });
      }
      const rawQty = parseInt(body?.quantity, 10);
      const quantity = Number.isFinite(rawQty) && rawQty >= 1 ? Math.min(rawQty, 10) : 1;
      lineItems = [{ price: stripeTicketPriceId, quantity }];
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: lineItems,
      client_reference_id: isContribution
        ? (user?.id ? `${user.id}:${eventId}:contribution` : `guest:${eventId}:contribution:${Date.now()}`)
        : (user?.id ? `${user.id}:${eventId}` : `guest:${eventId}:${Date.now()}`),
      customer_email: user?.email || undefined,
      success_url: isContribution
        ? `${baseUrl}/thank-you?session_id={CHECKOUT_SESSION_ID}&contribution=true`
        : `${baseUrl}/thank-you?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/events?ticket=cancelled`,
      metadata: {
        user_id: user?.id || '',
        event_id: eventId,
        event_title: eventTitle,
        event_date: eventDate,
        event_location: eventLocation,
        type: isContribution ? 'contribution' : 'ticket',
      },
    });

    // Write a pending row immediately so the client can poll for it on return
    if (supabaseUrl && supabaseAnonKey) {
      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      await supabase.from('event_ticket_purchases').upsert(
        {
          user_id: user?.id || null,
          event_id: eventId,
          event_title: eventTitle || null,
          event_date: eventDate || null,
          event_location: eventLocation || null,
          purchaser_email: user?.email || null,
          stripe_checkout_session_id: session.id,
          payment_status: 'pending',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'stripe_checkout_session_id' }
      );
    }

    return jsonResponse(200, {
      ok: true,
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    return jsonResponse(500, {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});
