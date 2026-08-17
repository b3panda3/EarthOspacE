import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl     = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Singleton Supabase client.
 * Returns null when env vars are missing so the app degrades gracefully
 * (demo mode, local dev without Supabase credentials, etc.)
 */
function createSupabaseClient(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn(
      "[supabase] NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY not set. " +
      "Supabase features will be disabled. Set them in .env.local to enable persistence."
    );
    return null;
  }
  return createClient(supabaseUrl, supabaseAnonKey);
}

export const supabase: SupabaseClient | null = createSupabaseClient();
