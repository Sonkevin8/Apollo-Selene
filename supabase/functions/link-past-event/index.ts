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

    const body = await request.json().catch(() => ({}));
    const suppliedPassword = body?.adminPassword ? String(body.adminPassword) : '';

    if (!suppliedPassword || suppliedPassword !== adminPassword) {
      const clerkCheck = await verifyClerkAdmin(request);
      if (!clerkCheck.ok) {
        return jsonResponse(401, { error: clerkCheck.error || 'Unauthorized.' });
      }
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