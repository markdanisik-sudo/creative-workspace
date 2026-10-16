import "server-only";
import { isLocal } from "@/lib/mode";
import type { Store } from "./types";

let local: Store | undefined;

/** The data store for this request: a local file (desktop) or Supabase (web). */
export async function getStore(): Promise<Store> {
  if (isLocal()) {
    if (!local) {
      const { createLocalStore } = await import("./local");
      local = createLocalStore();
    }
    return local;
  }
  const { createSupabaseStore } = await import("./supabase");
  return createSupabaseStore();
}

export { StoreError } from "./types";
export type * from "./types";
