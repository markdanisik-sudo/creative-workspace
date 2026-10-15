import "server-only";
import { logError } from "@/lib/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface OpenInvitation {
  id: string;
  projectName: string;
  invitedByName: string;
  createdAt: string;
}

/** Invitations sent to the viewer's email that they haven't used yet. */
export async function listMyInvitations(): Promise<OpenInvitation[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("my_invitations");
  if (error) {
    logError("people.myInvitations", error);
    return [];
  }
  return (data ?? []).map((row) => ({
    id: row.id,
    projectName: row.project_name,
    invitedByName: row.invited_by_name,
    createdAt: row.created_at,
  }));
}
