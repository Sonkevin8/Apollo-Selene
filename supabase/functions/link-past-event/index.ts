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

    const body = await request.json().catch(() => ({}));
    const suppliedUsername = body?.adminUsername ? String(body.adminUsername) : '';
    const suppliedPassword = body?.adminPassword ? String(body.adminPassword) : '';

    if (!suppliedUsername || !suppliedPassword) {
      return jsonResponse(401, { error: 'Admin login is required. Enter admin username and password in the unlock fields.' });
    }

    if (suppliedUsername !== adminUsername || suppliedPassword !== adminPassword) {
      return jsonResponse(401, { error: 'Stored admin session is invalid. Open Admin Login and sign in again.' });
    }

    const galleryItemId = body?.galleryItemId ? String(body.galleryItemId) : '';
    if (!galleryItemId) {
      return jsonResponse(400, { error: 'galleryItemId is required.' });
    }

    const eventId = body?.eventId ? String(body.eventId) : null;
    const eventDate = body?.eventDate ? String(body.eventDate) : null;
    const eventTime = body?.eventTime ? String(body.eventTime) : null;
    const eventLocation = body?.eventLocation ? String(body.eventLocation) : null;

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await supabase
      .from('gallery_items')
      .update({
        event_id: eventId,
        event_date: eventDate,
        event_time: eventTime,
        event_location: eventLocation,
      })
      .eq('id', galleryItemId)
      .select()
      .single();

    if (error) {
      return jsonResponse(500, { error: error.message });
    }

    return jsonResponse(200, { ok: true, data });
  } catch (err) {
    return jsonResponse(500, { error: err instanceof Error ? err.message : 'Unexpected error.' });
  }
});