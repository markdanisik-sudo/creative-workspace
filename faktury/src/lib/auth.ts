import "server-only";
import { connection } from "next/server";
import { isLocal } from "@/lib/mode";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** True until the one account exists (never in the desktop app, which has no accounts). */
export async function isSignUpOpen(): Promise<boolean> {
  await connection();
  if (isLocal()) return false;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.rpc("sign_up_open");
  return data === true;
}
