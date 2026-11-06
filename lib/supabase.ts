import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://iaejbvlibjfpdwuqfszp.supabase.co";
const supabaseAnonKey = "sb_publishable_Bf1jY3-FAjFRij0LMn5FLQ_nLrw2MUE";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
});