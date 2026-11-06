import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://iaejbvlibjfpdwuqfszp.supabase.co";
// Đưa thẳng anon key vào đây để lúc Vercel build không bị lỗi thiếu key
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlhZWpidmxpYmpmcGR3dXFmc3pwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDEyMzg2ODksImV4cCI6MjA1NjgxNDY4OX0.placeholder";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});