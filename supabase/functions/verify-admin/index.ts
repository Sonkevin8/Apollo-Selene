// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "jsr:@supabase/server@^1";

interface ReqPayload {
  username: string;
  password: string;
}

console.info("verify-admin started");

export default {
  fetch: withSupabase({ auth: ["publishable"] }, async (req) => {
    const { username, password }: ReqPayload = await req.json();

    const adminUsername = Deno.env.get("ADMIN_USERNAME");
    const adminPassword = Deno.env.get("ADMIN_PASSWORD");

    if (!adminUsername || !adminPassword) {
      return Response.json({ error: "Admin credentials not configured on server." }, { status: 500 });
    }

    if (username === adminUsername && password === adminPassword) {
      return Response.json({ success: true });
    }

    return Response.json({ error: "Invalid credentials." }, { status: 401 });
  }),
};
