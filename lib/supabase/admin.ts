import { createClient } from "@supabase/supabase-js";

// Service-role client for server-side operations that need to bypass RLS,
// such as the weekly alert cron that reads saved searches across all users.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}
