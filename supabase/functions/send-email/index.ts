import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM = "ZizCreatif <noreply@zizcreatif.dev>";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Toujours retourner HTTP 200 — l'erreur est dans le JSON { error: ... }
// Cela permet à supabase.functions.invoke de lire le body même en cas d'erreur Resend

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const json = (body: unknown) =>
    new Response(JSON.stringify(body), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    if (!RESEND_API_KEY) {
      return json({ error: "RESEND_API_KEY manquante dans les secrets Supabase" });
    }

    const { to, subject, html, replyTo } = await req.json();

    if (!to || !subject || !html) {
      return json({ error: "Champs requis : to, subject, html" });
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM,
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      // Retourne l'erreur Resend lisible côté client
      const msg = data?.message || data?.name || JSON.stringify(data);
      return json({ error: `Resend (${res.status}) : ${msg}` });
    }

    return json({ success: true, id: data.id });
  } catch (err: any) {
    return json({ error: err.message || "Erreur inconnue" });
  }
});
