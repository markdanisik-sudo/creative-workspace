import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";

export interface Viewer {
  id: string;
  email: string;
  displayName: string;
  /**
   * Runs things here: on a project's pages, whether the viewer owns that
   * project (else they're an invited client); elsewhere, always true, since
   * everyone runs their own workspace.
   */
  isStudio: boolean;
}

/** The signed-in viewer with profile details. Redirects to sign-in otherwise. */
export const requireViewer = cache(async (): Promise<Viewer> => {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const supabase = await createSupabaseServerClient();
  const [{ data: profile }, { data: isStudio }] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle(),
    supabase.rpc("current_user_is_studio"),
  ]);

  const email = user.email ?? "";
  return {
    id: user.id,
    email,
    displayName: profile?.display_name || email.split("@")[0] || "You",
    isStudio: isStudio === true,
  };
});

/** The viewer as seen on one project: `isStudio` when they own it. */
export const requireProjectViewer = cache(async (projectId: string): Promise<Viewer> => {
  const viewer = await requireViewer();
  const supabase = await createSupabaseServerClient();
  const { data: runs } = await supabase.rpc("runs_project", { target: projectId });
  return { ...viewer, isStudio: runs === true };
});
