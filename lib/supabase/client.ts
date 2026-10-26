import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase client for use in the browser (client components).
 * In the browser it is created once and shared, so every component sees the same login.
 * The login is kept for a long time, until the user signs out.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
