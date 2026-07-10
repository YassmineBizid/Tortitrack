// supabase/functions/create-user/index.ts
// Crée un utilisateur Supabase Auth + profil sans déconnecter l'admin
// Deploy: supabase functions deploy create-user
// Secret: SUPABASE_SERVICE_ROLE_KEY est automatiquement disponible dans les Edge Functions

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, x-client-info, apikey",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  try {
    // 1. Vérifier l'authentification de l'appelant
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer "))
      return new Response(JSON.stringify({ error: "Non authentifié" }), {
        status: 401,
        headers: { ...CORS, "Content-Type": "application/json" },
      });

    const sbAnon = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } }
    );

    const { data: { user }, error: authError } = await sbAnon.auth.getUser();
    if (authError || !user)
      return new Response(JSON.stringify({ error: "Token invalide" }), {
        status: 401,
        headers: { ...CORS, "Content-Type": "application/json" },
      });

    // 2. Vérifier que l'appelant a un rôle autorisé
    const { data: callerProfile } = await sbAnon
      .from("user_profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!["admin", "gm", "dg"].includes(callerProfile?.role))
      return new Response(JSON.stringify({ error: "Accès refusé — rôle insuffisant" }), {
        status: 403,
        headers: { ...CORS, "Content-Type": "application/json" },
      });

    // 3. Parser le body
    const {
      email,
      password,
      full_name,
      phone,
      brand_id,
      zone_id,
      vehicle_id,
      vehicle_plate,
    } = await req.json();

    if (!email || !full_name)
      return new Response(JSON.stringify({ error: "Email et nom complet requis" }), {
        status: 400,
        headers: { ...CORS, "Content-Type": "application/json" },
      });

    if (!password || password.length < 6)
      return new Response(JSON.stringify({ error: "Mot de passe requis (minimum 6 caractères)" }), {
        status: 400,
        headers: { ...CORS, "Content-Type": "application/json" },
      });

    // 4. Créer l'utilisateur via admin API (pas de changement de session)
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!serviceKey) throw new Error("Clé service_role manquante — contacter l'administrateur.");

    const sbAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      serviceKey,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data: newUser, error: createError } = await sbAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, role: "commercial" },
    });

    if (createError) {
      console.error("auth.admin.createUser error:", createError);
      // Message plus lisible pour les cas courants
      if (createError.message?.toLowerCase().includes("already registered") ||
          createError.message?.toLowerCase().includes("already been registered")) {
        throw new Error(`L'email ${email} est déjà utilisé par un autre compte.`);
      }
      throw new Error(createError.message);
    }

    const userId = newUser?.user?.id;
    if (!userId) throw new Error("Impossible de récupérer l'ID du nouvel utilisateur.");

    // 5. Vérifier qu'il n'existe pas déjà un profil avec cet ID
    const { data: existing } = await sbAdmin
      .from("user_profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle();

    if (existing) throw new Error(`Un profil existe déjà pour cet utilisateur (${email}).`);

    // 6. Insérer dans user_profiles
    const { error: insertError } = await sbAdmin.from("user_profiles").insert([
      {
        id: userId,
        full_name,
        email,
        phone: phone || "",
        brand_id: brand_id || null,
        zone_id: zone_id || null,
        vehicle_id: vehicle_id || null,
        vehicle_plate: vehicle_plate || "",
        role: "commercial",
        is_active: true,
      },
    ]);

    if (insertError) {
      console.error("user_profiles.insert error:", insertError);
      throw new Error(insertError.message);
    }

    return new Response(JSON.stringify({ success: true, userId }), {
      status: 200,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("create-user error:", err);
    return new Response(JSON.stringify({ error: err.message || "Erreur interne du serveur" }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
