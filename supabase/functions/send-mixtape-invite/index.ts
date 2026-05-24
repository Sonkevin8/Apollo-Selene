import { Resend } from 'npm:resend@3.2.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ error: 'Missing RESEND_API_KEY secret in Supabase Edge Functions.' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { inviteEmail, senderEmail } = await request.json();

    if (!inviteEmail) {
      return new Response(JSON.stringify({ error: 'inviteEmail is required.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const resend = new Resend(resendApiKey);

    const fromAddress = Deno.env.get('INVITES_FROM_EMAIL') || 'Mixtape Exchange <onboarding@resend.dev>';
    const appUrl = Deno.env.get('APP_URL') || 'http://localhost:5173';

    const result = await resend.emails.send({
      from: fromAddress,
      to: [inviteEmail],
      subject: 'You were invited to Apollo Selene Mixtape Exchange',
      html: `
        <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto; line-height: 1.5;">
          <h2>You got a mixtape exchange invite</h2>
          <p>${senderEmail || 'A musician'} invited you to exchange tapes on Apollo Selene.</p>
          <p>Sign up to start sharing sets and track deliveries on the live globe.</p>
          <p><a href="${appUrl}/mixtape-exchange">Join Mixtape Exchange</a></p>
        </div>
      `,
    });

    return new Response(JSON.stringify({ ok: true, result }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message || 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
