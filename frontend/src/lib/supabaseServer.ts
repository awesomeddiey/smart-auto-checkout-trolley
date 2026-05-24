import { createClient } from "@supabase/supabase-js";

// Server-side Supabase client. Prefers the service-role key if present,
// otherwise falls back to the anon key (RLS on `payments` is permissive).
export function supabaseServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
           || process.env.SUPABASE_ANON_KEY
           || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}
