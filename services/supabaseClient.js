// services/supabaseClient.ts
import { createClient } from "@supabase/supabase-js";
var supabaseUrl = (typeof __SUPABASE_URL__ !== "undefined" ? __SUPABASE_URL__ : "") || process.env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
var supabaseAnonKey = (typeof __SUPABASE_ANON_KEY__ !== "undefined" ? __SUPABASE_ANON_KEY__ : "") || import.meta?.env?.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";
var supabaseInstance = null;
function getSupabaseClient() {
  if (!supabaseInstance) {
    const url = supabaseUrl || process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
    const key = supabaseAnonKey || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
    if (!url || !key) {
      throw new Error("Missing Supabase configuration");
    }
    supabaseInstance = createClient(url, key);
  }
  return supabaseInstance;
}
var supabase = getSupabaseClient();
export {
  getSupabaseClient,
  supabase
};
