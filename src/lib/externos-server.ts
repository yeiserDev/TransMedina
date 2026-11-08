import { createClient } from '@supabase/supabase-js';

// Server use only, after checking the NextAuth administrator identity.
// A browser's Supabase cookies must never override this isolated service client.
export async function createAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
