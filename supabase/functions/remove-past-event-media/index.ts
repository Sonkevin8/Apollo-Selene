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
