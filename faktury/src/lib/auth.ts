import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** True until the one account exists. */
export async function isSignUpOpen(): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.rpc("sign_up_open");
  return data === true;
}
