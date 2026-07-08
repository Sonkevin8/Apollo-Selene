import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
import { Clerk } from 'npm:@clerk/clerk-sdk-node@4.13.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const jsonResponse = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed.' });
  }

  try {
    const clerkSecret = Deno.env.get('CLERK_SECRET_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const adminEmailsRaw = Deno.env.get('ADMIN_EMAILS') || Deno.env.get('VITE_ADMIN_EMAILS') || '';

    if (!clerkSecret || !supabaseUrl || !supabaseServiceRoleKey) {
      return jsonResponse(500, { error: 'Missing required secrets (CLERK_SECRET_KEY / SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).' });
    }

    const authHeader = request.headers.get('Authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '');

    if (!token) {
      return jsonResponse(401, { error: 'Missing Clerk session token.' });
    }

    // verify session with Clerk
    const clerk = new Clerk({ apiKey: clerkSecret });

    let userEmail = null;
    try {
      // verify the token and get the session
      // @ts-ignore - clerk sdk typings may differ in this environment
      const session = await clerk.sessions.verifySessionToken(token);
      // get user id from session
      const userId = session?.user_id || session?.user?.id || null;
      if (!userId) {
        return jsonResponse(401, { error: 'Invalid Clerk session.' });
      }
      const user = await clerk.users.getUser(userId);
      userEmail = (user?.email_addresses && user.email_addresses[0]?.email_address) || user?.primary_email_address?.email_address || user?.email || null;
    } catch (err) {
      return jsonResponse(401, { error: 'Failed to verify Clerk session.' });
    }

    if (!userEmail) {
      return jsonResponse(401, { error: 'Could not determine user email from Clerk session.' });
    }

    // check admin emails list
    const allowed = adminEmailsRaw.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
    if (!allowed.includes(userEmail.toLowerCase())) {
      return jsonResponse(403, { error: 'User not authorized to perform this action.' });
    }

    const body = await request.json().catch(() => ({}));
    const imageUrl = body?.imageUrl ? String(body.imageUrl) : '';
    const title = body?.title ? String(body.title) : 'Untitled Event Artwork';
    const description = body?.description ? String(body.description) : 'Artwork added from a completed Apollo Selene event.';
    const medium = body?.medium ? String(body.medium) : 'Event Poster';
    const year = body?.year ? String(body.year) : '';
    const story = body?.story ? String(body.story) : '';
    const eventId = body?.eventId ? String(body.eventId) : null;
    const eventDate = body?.eventDate ? String(body.eventDate) : null;
    const eventTime = body?.eventTime ? String(body.eventTime) : null;
    const eventLocation = body?.eventLocation ? String(body.eventLocation) : null;

    if (!imageUrl) {
      return jsonResponse(400, { error: 'imageUrl is required.' });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await supabase.from('gallery_items').insert([
      {
        title,
        artist: 'Apollo Selene',
        description,
        medium,
        year,
        story,
        image_url: imageUrl,
        event_id: eventId,
        event_date: eventDate,
        event_time: eventTime,
        event_location: eventLocation,
      },
    ]).select().single();

    if (error) {
      return jsonResponse(500, { error: error.message });
    }

    return jsonResponse(200, { ok: true, data });
  } catch (err) {
    return jsonResponse(500, { error: err instanceof Error ? err.message : 'Unexpected error.' });
  }
});
