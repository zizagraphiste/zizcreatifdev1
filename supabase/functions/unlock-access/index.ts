import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Find pending access_grants where available_at <= now
    const { data: grants, error } = await supabase
      .from("access_grants")
      .select("id, user_id, product_id")
      .eq("status", "pending")
      .lte("available_at", new Date().toISOString());

    if (error) throw error;

    if (!grants || grants.length === 0) {
      return new Response(JSON.stringify({ unlocked: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Unlock them
    const ids = grants.map((g) => g.id);
    const { error: updateError } = await supabase
      .from("access_grants")
      .update({ status: "active" })
      .in("id", ids);

    if (updateError) throw updateError;

    console.log(`Unlocked ${ids.length} access grants:`, ids);

    return new Response(
      JSON.stringify({ unlocked: ids.length, ids }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("unlock-access error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
