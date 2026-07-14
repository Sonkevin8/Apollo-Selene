import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
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
    const adminUsername = Deno.env.get('ADMIN_USERNAME');
    const adminPassword = Deno.env.get('ADMIN_PASSWORD');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!adminUsername || !adminPassword) {
      return jsonResponse(500, { error: 'Admin credentials are not configured in Supabase secrets.' });
    }

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return jsonResponse(500, { error: 'Missing required Supabase secrets.' });
    }

    const formData = await request.formData();
    const suppliedUsername = String(formData.get('adminUsername') || '');
    const suppliedPassword = String(formData.get('adminPassword') || '');

    if (!suppliedUsername || !suppliedPassword) {
      return jsonResponse(401, { error: 'Admin login is required. Enter admin username and password in the unlock fields.' });
    }

    if (suppliedUsername !== adminUsername || suppliedPassword !== adminPassword) {
      return jsonResponse(401, { error: 'Stored admin session is invalid. Open Admin Login and sign in again.' });
    }

    const file = formData.get('file');
    if (!(file instanceof File)) {
      return jsonResponse(400, { error: 'file is required.' });
    }

    const eventId = String(formData.get('eventId') || '');
    if (!eventId) {
      return jsonResponse(400, { error: 'eventId is required.' });
    }

    const title = String(formData.get('title') || 'Untitled Event Media');
    const artist = String(formData.get('artist') || 'Apollo Selene');
    const description = String(formData.get('description') || 'Additional media added from a past event.');
    const medium = String(formData.get('medium') || 'Event Media');
    const year = String(formData.get('year') || '');
    const story = String(formData.get('story') || '');
    const eventDate = formData.get('eventDate') ? String(formData.get('eventDate')) : null;
    const eventTime = formData.get('eventTime') ? String(formData.get('eventTime')) : null;
    const eventLocation = formData.get('eventLocation') ? String(formData.get('eventLocation')) : null;

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const objectPath = `event-photos/${eventId}/${Date.now()}-${safeName}`;

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { error: storageError } = await supabase.storage
      .from('gallery')
      .upload(objectPath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type || undefined,
      });

    if (storageError) {
      return jsonResponse(500, { error: storageError.message });
    }

    const { data: publicData } = supabase.storage.from('gallery').getPublicUrl(objectPath);

    const { data, error } = await supabase.from('gallery_items').insert([
      {
        title,
        artist,
        description,
        medium,
        year,
        story,
        image_url: publicData.publicUrl,
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