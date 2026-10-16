import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { supabaseKey, supabaseUrl } from "./env";

export type BrowserSupabase = SupabaseClient<Database>;

let client: BrowserSupabase | undefined;

/** Browser client; a single instance is shared across the app. */
export function getSupabaseBrowserClient(): BrowserSupabase {
  client ??= createBrowserClient<Database>(supabaseUrl, supabaseKey);
  return client;
}
