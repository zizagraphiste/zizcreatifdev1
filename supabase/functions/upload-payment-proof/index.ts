import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";
import { decode } from "https://deno.land/std@0.224.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { registration_id, payment_ref, file_name, file_base64, content_type } = await req.json();

    if (!registration_id || !file_base64 || !file_name) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify registration exists and is in valid state
    const { data: reg, error: regError } = await supabase
      .from("registrations")
      .select("id, status")
      .eq("id", registration_id)
      .maybeSingle();

    if (regError || !reg) {
      return new Response(
        JSON.stringify({ error: "Registration not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (reg.status === "confirmed") {
      return new Response(
        JSON.stringify({ error: "Already confirmed" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Decode base64 and upload to storage
    const fileBytes = decode(file_base64);
    const { error: uploadError } = await supabase.storage
      .from("payment-proofs")
      .upload(file_name, fileBytes, {
        contentType: content_type || "image/jpeg",
        upsert: true,
      });

    if (uploadError) {
      return new Response(
        JSON.stringify({ error: uploadError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate a signed URL for admin to view
    const { data: signedData } = await supabase.storage
      .from("payment-proofs")
      .createSignedUrl(file_name, 60 * 60 * 24 * 30); // 30 days

    // Update registration
    const { error: updateError } = await supabase
      .from("registrations")
      .update({
        status: "paid",
        payment_screenshot_url: signedData?.signedUrl || file_name,
        payment_ref: payment_ref || null,
      })
      .eq("id", registration_id);

    if (updateError) {
      return new Response(
        JSON.stringify({ error: updateError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
