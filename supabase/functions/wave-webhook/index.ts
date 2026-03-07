import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, wave-signature, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function verifySignature(body: string, signature: string, secret: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  const computed = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return computed === signature;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const WAVE_WEBHOOK_SECRET = Deno.env.get("WAVE_WEBHOOK_SECRET");
    if (!WAVE_WEBHOOK_SECRET) {
      console.error("WAVE_WEBHOOK_SECRET not set");
      return new Response("OK", { status: 200, headers: corsHeaders });
    }

    const bodyText = await req.text();
    const waveSignature = req.headers.get("wave-signature") || req.headers.get("Wave-Signature") || "";

    // Verify HMAC signature
    if (waveSignature) {
      const valid = await verifySignature(bodyText, waveSignature, WAVE_WEBHOOK_SECRET);
      if (!valid) {
        console.error("Invalid Wave signature");
        return new Response("Invalid signature", { status: 403, headers: corsHeaders });
      }
    }

    const event = JSON.parse(bodyText);

    // Only handle completed checkouts
    if (event.type !== "checkout.session.completed") {
      return new Response("OK", { status: 200, headers: corsHeaders });
    }

    const clientReference = event.data?.client_reference || event.client_reference;
    const transactionId = event.data?.transaction_id || event.transaction_id || "";

    if (!clientReference) {
      console.error("No client_reference in webhook payload");
      return new Response("OK", { status: 200, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch registration + product
    const { data: reg, error: regError } = await supabase
      .from("registrations")
      .select("*, products(delivery_mode, delivery_date)")
      .eq("id", clientReference)
      .maybeSingle();

    if (regError || !reg) {
      console.error("Registration not found:", clientReference);
      return new Response("OK", { status: 200, headers: corsHeaders });
    }

    // Already confirmed? Skip
    if (reg.status === "confirmed") {
      return new Response("OK", { status: 200, headers: corsHeaders });
    }

    // Update registration
    await supabase
      .from("registrations")
      .update({
        status: "confirmed",
        confirmed_at: new Date().toISOString(),
        payment_ref: transactionId,
      })
      .eq("id", clientReference);

    // Create access_grant
    const product = reg.products as any;
    const availableAt =
      product.delivery_mode === "scheduled" && product.delivery_date
        ? product.delivery_date
        : new Date().toISOString();

    await supabase.from("access_grants").insert({
      user_id: reg.user_id,
      product_id: reg.product_id,
      available_at: availableAt,
    });

    console.log(`Webhook: Registration ${clientReference} confirmed via Wave`);

    return new Response("OK", { status: 200, headers: corsHeaders });
  } catch (err) {
    console.error("Webhook error:", err);
    // Always return 200 to prevent Wave from retrying
    return new Response("OK", { status: 200, headers: corsHeaders });
  }
});
