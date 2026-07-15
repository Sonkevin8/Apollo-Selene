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

const parseAdminEmails = () => {
  const raw = Deno.env.get('ADMIN_EMAILS') || Deno.env.get('VITE_ADMIN_EMAILS') || '';
  return new Set(
    raw
      .split(',')
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean)
  );
};

const verifyClerkAdmin = async (request: Request) => {
  const clerkSecretKey = Deno.env.get('CLERK_SECRET_KEY') || '';
  const adminEmails = parseAdminEmails();
  const sessionId = request.headers.get('x-clerk-session-id') || '';
  const userIdHeader = request.headers.get('x-clerk-user-id') || '';

  if (!clerkSecretKey || !sessionId || !userIdHeader || adminEmails.size === 0) {
    return false;
  }

  const sessionResponse = await fetch(`https://api.clerk.com/v1/sessions/${encodeURIComponent(sessionId)}`, {
    headers: {
      Authorization: `Bearer ${clerkSecretKey}`,
    },
  });

  if (!sessionResponse.ok) {
    return false;
  }

  const sessionData = await sessionResponse.json().catch(() => null);
  const sessionUserId = sessionData?.user_id ? String(sessionData.user_id) : '';
  const sessionStatus = sessionData?.status ? String(sessionData.status).toLowerCase() : '';
  if (!sessionUserId || sessionUserId !== userIdHeader || (sessionStatus && sessionStatus !== 'active')) {
    return false;
  }

  const userResponse = await fetch(`https://api.clerk.com/v1/users/${encodeURIComponent(sessionUserId)}`, {
    headers: {
      Authorization: `Bearer ${clerkSecretKey}`,
    },
  });

  if (!userResponse.ok) {
    return false;
  }

  const userData = await userResponse.json().catch(() => null);
  const emailAddresses = Array.isArray(userData?.email_addresses) ? userData.email_addresses : [];
  const primaryEmailId = userData?.primary_email_address_id ? String(userData.primary_email_address_id) : '';
  const primaryEmail =
    emailAddresses.find((entry: Record<string, unknown>) => String(entry?.id || '') === primaryEmailId) ||
    emailAddresses[0] ||
    null;
  const email = primaryEmail?.email_address ? String(primaryEmail.email_address).toLowerCase() : '';

  return Boolean(email && adminEmails.has(email));
};

const getGalleryObjectPath = (publicUrl: string): string | null => {
  if (!publicUrl) return null;

  const marker = '/storage/v1/object/public/gallery/';
  const markerIndex = publicUrl.indexOf(marker);
  if (markerIndex === -1) return null;

  const rawPath = publicUrl.slice(markerIndex + marker.length);
  const cleanPath = rawPath.split('?')[0].replace(/^\/+/, '');
  if (!cleanPath) return null;

  try {
    return decodeURIComponent(cleanPath);
  } catch {
    return cleanPath;
  }
};

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
    const clerkSecretKey = Deno.env.get('CLERK_SECRET_KEY');
    const adminEmails = parseAdminEmails();
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    const legacyAuthConfigured = Boolean(adminUsername && adminPassword);
    const clerkAuthConfigured = Boolean(clerkSecretKey && adminEmails.size > 0);
    if (!legacyAuthConfigured && !clerkAuthConfigured) {
      return jsonResponse(500, { error: 'Admin auth is not configured (set ADMIN_USERNAME/ADMIN_PASSWORD or CLERK_SECRET_KEY + ADMIN_EMAILS).' });
    }

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return jsonResponse(500, { error: 'Missing required Supabase secrets.' });
    }

    const body = await request.json().catch(() => ({}));
    const suppliedUsername = body?.adminUsername ? String(body.adminUsername) : '';
    const suppliedPassword = body?.adminPassword ? String(body.adminPassword) : '';

    const legacyAuthorized =
      legacyAuthConfigured &&
      Boolean(suppliedUsername) &&
      Boolean(suppliedPassword) &&
      suppliedUsername === adminUsername &&
      suppliedPassword === adminPassword;
    const clerkAuthorized = await verifyClerkAdmin(request);

    if (!legacyAuthorized && !clerkAuthorized) {
      if (legacyAuthConfigured && (!suppliedUsername || !suppliedPassword)) {
        return jsonResponse(401, { error: 'Admin login is required. Enter admin username and password in the unlock fields.' });
      }
      return jsonResponse(401, { error: 'Stored admin session is invalid. Open Admin Login and sign in again.' });
    }

    const galleryItemId = body?.galleryItemId ? String(body.galleryItemId) : '';
    if (!galleryItemId) {
      return jsonResponse(400, { error: 'galleryItemId is required.' });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: galleryItem, error: galleryReadError } = await supabase
      .from('gallery_items')
      .select('id, title, image_url')
      .eq('id', galleryItemId)
      .single();

    if (galleryReadError || !galleryItem) {
      return jsonResponse(404, { error: 'Gallery item was not found.' });
    }

    const storagePath = getGalleryObjectPath(galleryItem.image_url || '');
    if (storagePath) {
      const { error: storageDeleteError } = await supabase.storage
        .from('gallery')
        .remove([storagePath]);

      if (storageDeleteError) {
        return jsonResponse(500, { error: storageDeleteError.message });
      }
    }

    const { error: deleteError } = await supabase
      .from('gallery_items')
      .delete()
      .eq('id', galleryItemId);

    if (deleteError) {
      return jsonResponse(500, { error: deleteError.message });
    }

    return jsonResponse(200, {
      ok: true,
      data: {
        id: galleryItem.id,
        title: galleryItem.title || null,
        storagePath,
      },
    });
  } catch (err) {
    return jsonResponse(500, { error: err instanceof Error ? err.message : 'Unexpected error.' });
  }
});
