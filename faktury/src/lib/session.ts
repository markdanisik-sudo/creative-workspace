import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { isLocal } from "@/lib/mode";
import { getCurrentUser as getSupabaseUser, type CurrentUser } from "@/lib/supabase/server";

const LOCAL_USER: CurrentUser = { id: "local", email: null };

/** The signed-in user; the desktop app has a single local user. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  // Everything behind the user is live data: never prerender it at build time.
  await connection();
  return isLocal() ? LOCAL_USER : getSupabaseUser();
});

/** For pages and actions: the user, or a redirect to sign in. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  return user;
}
