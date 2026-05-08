// supabase/functions/ai-analyze/index.ts
// Proxy sécurisé vers Groq API (vision via llama-4-scout)
// Deploy: supabase functions deploy ai-analyze
// Secret: supabase secrets set GROQ_API_KEY=gsk_xxx

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Simple rate limit: max 30 appels/minute/utilisateur
const calls = new Map<string, { n: number; reset: number }>();
function rateLimit(uid: string): boolean {
  const now = Date.now(), e = calls.get(uid);
  if (!e || now > e.reset) { calls.set(uid, { n: 1, reset: now + 60000 }); return true; }
  if (e.n >= 30) return false;
  e.n++; return true;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  try {
    // Auth Supabase
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer "))
      return new Response(JSON.stringify({ error: "Non authentifié" }), { status: 401, headers: { ...CORS, "Content-Type": "application/json" } });

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } }
    );
    const { data: { user }, error } = await sb.auth.getUser();
    if (error || !user)
      return new Response(JSON.stringify({ error: "Token invalide" }), { status: 401, headers: { ...CORS, "Content-Type": "application/json" } });

    // Rôle
    const { data: profile } = await sb.from("user_profiles").select("role").eq("id", user.id).single();
    if (!["operator","gm","admin"].includes(profile?.role))
      return new Response(JSON.stringify({ error: "Accès refusé" }), { status: 403, headers: { ...CORS, "Content-Type": "application/json" } });

    // Rate limit
    if (!rateLimit(user.id))
      return new Response(JSON.stringify({ error: "Trop de requêtes — réessayer dans 1 min" }), { status: 429, headers: { ...CORS, "Content-Type": "application/json" } });

    const { image_b64, prompt } = await req.json();
    if (!image_b64 || !prompt)
      return new Response(JSON.stringify({ error: "Paramètres manquants: image_b64, prompt" }), { status: 400, headers: { ...CORS, "Content-Type": "application/json" } });

    if (image_b64.length > 7_000_000)
      return new Response(JSON.stringify({ error: "Image trop grande (max 5 MB)" }), { status: 413, headers: { ...CORS, "Content-Type": "application/json" } });

    // Appel Groq (clé côté serveur uniquement)
    const GROQ_KEY = Deno.env.get("GROQ_API_KEY");
    if (!GROQ_KEY) throw new Error("GROQ_API_KEY non configurée");

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_KEY}`,
      },
      body: JSON.stringify({
        model:      "meta-llama/llama-4-scout-17b-16e-instruct",
        max_tokens: 600,
        messages: [{
          role: "user",
          content: [
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${image_b64}` } },
            { type: "text", text: prompt },
          ],
        }],
      }),
    });

    if (!res.ok) throw new Error(`Groq ${res.status}: ${await res.text()}`);
    const data = await res.json();
    const raw = (data.choices?.[0]?.message?.content || "").replace(/```json|```/g, "").trim();

    let result: any;
    try { result = JSON.parse(raw); }
    catch { throw new Error("Réponse IA invalide (JSON mal formé)"); }

    return new Response(JSON.stringify({ result }), { status: 200, headers: { ...CORS, "Content-Type": "application/json" } });

  } catch (err) {
    console.error("ai-analyze error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Erreur interne" }),
      { status: 500, headers: { ...CORS, "Content-Type": "application/json" } }
    );
  }
});
