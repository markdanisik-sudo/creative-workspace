import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { STORAGE_BUCKET } from "./env";

export const SIGNED_URL_TTL_SECONDS = 60 * 60;

/** Signs many storage paths in one request. Unknown or failed paths map to null. */
export async function signStoragePaths(
  supabase: SupabaseClient<Database>,
  paths: string[],
): Promise<Map<string, string>> {
  const unique = [...new Set(paths)];
  const result = new Map<string, string>();
  if (unique.length === 0) return result;

  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrls(unique, SIGNED_URL_TTL_SECONDS);
  if (error || !data) return result;

  for (const entry of data) {
    if (entry.path && entry.signedUrl) result.set(entry.path, entry.signedUrl);
  }
  return result;
}
