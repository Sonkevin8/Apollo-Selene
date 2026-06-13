import { Resend } from 'npm:resend@3.2.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const jsonResponse = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

function generateReferenceNumber(): string {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed.' });
  }

  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      return jsonResponse(500, { error: 'Missing RESEND_API_KEY secret.' });
    }

    const body = await request.json().catch(() => ({}));
    const toEmail: string = String(body?.email || '').trim().slice(0, 320);
    const eventTitle: string = String(body?.eventTitle || 'the event').slice(0, 200);
    const eventDate: string = body?.eventDate ? String(body.eventDate).slice(0, 64) : '';
    const eventLocation: string = body?.eventLocation ? String(body.eventLocation).slice(0, 200) : '';
    // Accept a pre-generated reference number or generate one
    const referenceNumber: string = body?.referenceNumber
      ? String(body.referenceNumber).slice(0, 16).toUpperCase()
      : generateReferenceNumber();

    if (!toEmail || !toEmail.includes('@')) {
      return jsonResponse(400, { error: 'A valid email address is required.' });
    }

    const resend = new Resend(resendApiKey);
    const fromAddress = Deno.env.get('INVITES_FROM_EMAIL') || 'Apollo Selene <onboarding@resend.dev>';
    const appUrl = Deno.env.get('APP_URL') || 'https://apollo-selene.com';

    const eventDateLine = eventDate ? ` on ${eventDate}` : '';
    const eventLocationLine = eventLocation ? ` at ${eventLocation}` : '';

    await resend.emails.send({
      from: fromAddress,
      to: [toEmail],
      subject: `You're on the list for ${eventTitle} — Ref: ${referenceNumber}`,
      html: `
        <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto; line-height: 1.6; color: #1a1a1a; max-width: 560px; margin: 0 auto;">
          <h2 style="margin-bottom: 4px;">You're on the list ✓</h2>
          <p style="margin-top: 0; color: #555;">Your spot has been confirmed for <strong>${eventTitle}</strong>${eventDateLine}${eventLocationLine}.</p>
          <div style="background: #f5f5f5; border-radius: 8px; padding: 16px 20px; margin: 20px 0;">
            <p style="margin: 0; font-size: 13px; color: #888; text-transform: uppercase; letter-spacing: 0.05em;">Reference Number</p>
            <p style="margin: 4px 0 0; font-size: 26px; font-weight: 700; letter-spacing: 0.1em; color: #1a1a1a;">${referenceNumber}</p>
          </div>
          <p style="color: #555; font-size: 14px;">Keep this reference number — you may be asked to show it at the door.</p>
          <p style="margin-top: 24px; font-size: 13px; color: #aaa;">Apollo Selene · <a href="${appUrl}/events" style="color: #aaa;">View Events</a></p>
        </div>
      `,
    });

    return jsonResponse(200, { ok: true, referenceNumber });
  } catch (error) {
    return jsonResponse(500, { error: error instanceof Error ? error.message : 'Unknown error' });
  }
});
