import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
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

serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed.' });
  }

  try {
    const adminPassword = Deno.env.get('ADMIN_PASSWORD');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!adminPassword || !supabaseUrl || !supabaseServiceRoleKey) {
      return jsonResponse(500, { error: 'Missing required Supabase secrets.' });
    }

    const body = await request.json().catch(() => ({}));
    if (body?.adminPassword !== adminPassword) {
      return jsonResponse(401, { error: 'Unauthorized.' });
    }

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
