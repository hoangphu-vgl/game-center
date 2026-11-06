import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://iaejbvlibjfpdwuqfszp.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlhZWpidmxpYmpmcGR3dXFmc3pwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDEyMzg2ODksImV4cCI6MjA1NjgxNDY4OX0.placeholder";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});