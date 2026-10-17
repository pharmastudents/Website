import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

export function getServiceClient() {
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey =
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
    Deno.env.get("SUPABASE_ANON_KEY") ??
    "";

  return createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export async function getAuthenticatedUser(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return { user: null, error: "Missing Authorization header." };
  }

  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    return { user: null, error: "Empty Bearer token." };
  }

  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const client = createClient(url, anonKey);

  const { data: { user }, error } = await client.auth.getUser(token);
  if (error || !user) {
    return { user: null, error: error?.message ?? "Invalid authentication token." };
  }

  return { user, error: null };
}
