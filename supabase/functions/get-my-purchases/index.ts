import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { getAuthenticatedUser, getServiceClient } from "../_shared/supabase.ts";

serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const { user, error: authError } = await getAuthenticatedUser(req);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: authError || "Unauthorized." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = getServiceClient();

    // Query confirmed purchases for current authenticated student
    const { data: purchases, error: purErr } = await supabase
      .from("purchases")
      .select(`
        id,
        material_id,
        amount,
        status,
        payment_status,
        created_at,
        purchased_at,
        materials (
          id,
          title,
          description,
          year,
          semester,
          subject_id,
          type,
          material_type,
          price,
          file_url
        )
      `)
      .eq("student_id", user.id)
      .eq("status", "unlocked")
      .order("created_at", { ascending: false });

    if (purErr) {
      console.error("Error fetching purchases:", purErr);
      return new Response(
        JSON.stringify({ error: "Failed to retrieve student purchases." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        purchases: purchases || [],
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message || "Internal server error." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
