import { createClient } from "@supabase/supabase-js";

export const SUPA_URL = import.meta.env?.VITE_PUBLIC_SUPABASE_URL
  || import.meta.env?.VITE_SUPABASE_URL
  || "https://YOUR_PROJECT.supabase.co";
const SUPA_KEY = import.meta.env?.VITE_PUBLIC_SUPABASE_ANON_KEY
  || import.meta.env?.VITE_SUPABASE_ANON_KEY
  || "YOUR_ANON_KEY";

export const sb = createClient(SUPA_URL, SUPA_KEY);
