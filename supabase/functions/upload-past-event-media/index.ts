import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
import { Clerk } from 'npm:@clerk/clerk-sdk-node@4.13.0';

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

const verifyClerkAdmin = async (request: Request) => {
  const clerkSecret = Deno.env.get('CLERK_SECRET_KEY');
  const adminEmailsRaw = Deno.env.get('ADMIN_EMAILS') || Deno.env.get('VITE_ADMIN_EMAILS') || '';

  if (!clerkSecret) {
    return { ok: false, error: 'Missing Clerk secret.' };
  }

  const authHeader = request.headers.get('Authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) {
    return { ok: false, error: 'Missing Clerk session token.' };
  }

  const clerk = new Clerk({ apiKey: clerkSecret });
  let userEmail: string | null = null;

  try {
    // @ts-ignore Runtime types vary in Deno.
    const session = await clerk.sessions.verifySessionToken(token);
    const userId = session?.user_id || session?.user?.id || null;
    if (!userId) {
      return { ok: false, error: 'Invalid Clerk session.' };
    }
    const user = await clerk.users.getUser(userId);
    userEmail = (user?.email_addresses && user.email_addresses[0]?.email_address) || user?.primary_email_address?.email_address || user?.email || null;
  } catch {
    return { ok: false, error: 'Failed to verify Clerk session.' };
  }

  const allowed = adminEmailsRaw.split(',').map((value) => value.trim().toLowerCase()).filter(Boolean);
  if (!userEmail || !allowed.includes(userEmail.toLowerCase())) {
    return { ok: false, error: 'User not authorized to perform this action.' };
  }

  return { ok: true };
};

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

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return jsonResponse(500, { error: 'Missing required Supabase secrets.' });
    }

    const formData = await request.formData();
    const suppliedPassword = String(formData.get('adminPassword') || '');

    if (!suppliedPassword || suppliedPassword !== adminPassword) {
      const clerkCheck = await verifyClerkAdmin(request);
      if (!clerkCheck.ok) {
        return jsonResponse(401, { error: clerkCheck.error || 'Unauthorized.' });
      }
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