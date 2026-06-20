const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const jsonResponse = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed.' });
  }

  try {
    const igAccessToken = Deno.env.get('INSTAGRAM_ACCESS_TOKEN');
    const igUserId = Deno.env.get('INSTAGRAM_USER_ID');
    const adminPassword = Deno.env.get('ADMIN_PASSWORD');

    if (!igAccessToken || !igUserId) {
      return jsonResponse(500, {
        error:
          'Instagram credentials not configured. Set INSTAGRAM_ACCESS_TOKEN and INSTAGRAM_USER_ID in Supabase secrets.',
      });
    }

    let body: { imageUrl?: string; caption?: string; adminToken?: string };
    try {
      body = await request.json();
    } catch {
      return jsonResponse(400, { error: 'Invalid JSON body.' });
    }

    const { imageUrl, caption, adminToken } = body;

    // Admin gate
    if (adminPassword && adminToken !== adminPassword) {
      return jsonResponse(401, { error: 'Unauthorized.' });
    }

    if (!imageUrl || typeof imageUrl !== 'string') {
      return jsonResponse(400, { error: 'imageUrl is required.' });
    }
    if (!caption || typeof caption !== 'string') {
      return jsonResponse(400, { error: 'caption is required.' });
    }

    // Validate imageUrl — must be a public HTTPS URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(imageUrl);
    } catch {
      return jsonResponse(400, { error: 'imageUrl is not a valid URL.' });
    }
    if (parsedUrl.protocol !== 'https:') {
      return jsonResponse(400, { error: 'imageUrl must use HTTPS.' });
    }

    // Step 1: Create media container
    const createParams = new URLSearchParams({
      image_url: imageUrl,
      caption,
      access_token: igAccessToken,
    });

    const createRes = await fetch(
      `https://graph.facebook.com/v19.0/${igUserId}/media?${createParams}`,
      { method: 'POST' },
    );
    const createData = await createRes.json();

    if (!createRes.ok || !createData?.id) {
      return jsonResponse(502, {
        error:
          createData?.error?.message || 'Failed to create Instagram media container.',
      });
    }

    const creationId: string = createData.id;

    // Step 2: Publish the container
    const publishParams = new URLSearchParams({
      creation_id: creationId,
      access_token: igAccessToken,
    });

    const publishRes = await fetch(
      `https://graph.facebook.com/v19.0/${igUserId}/media_publish?${publishParams}`,
      { method: 'POST' },
    );
    const publishData = await publishRes.json();

    if (!publishRes.ok || !publishData?.id) {
      return jsonResponse(502, {
        error: publishData?.error?.message || 'Failed to publish Instagram post.',
      });
    }

    return jsonResponse(200, { success: true, postId: publishData.id });
  } catch (err) {
    return jsonResponse(500, {
      error: err instanceof Error ? err.message : 'Unexpected error.',
    });
  }
});
