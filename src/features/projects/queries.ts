import "server-only";
import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { signStoragePaths } from "@/lib/supabase/storage";
import { logError } from "@/lib/errors";
import { isPhase, type BoardSummary, type ProjectSummary, type SearchResults } from "./types";

const SEARCH_RESULT_LIMIT = 24;

/** Escapes LIKE wildcards so user input is matched literally. */
function likePattern(query: string) {
  return `%${query.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
}

type SummaryRow = {
  id: string | null;
  name: string | null;
  description: string | null;
  updated_at: string | null;
  item_count: number | null;
  board_count: number | null;
  cover_path: string | null;
  client_name: string | null;
  phase: string | null;
  next_event_at: string | null;
  open_request_count: number | null;
  owner_id: string | null;
  created_by_client: boolean | null;
};

async function toProjectSummaries(rows: SummaryRow[]): Promise<ProjectSummary[]> {
  const supabase = await createSupabaseServerClient();
  const covers = await signStoragePaths(
    supabase,
    rows.flatMap((row) => (row.cover_path ? [row.cover_path] : [])),
  );
  return rows.flatMap((row) =>
    row.id && row.name && row.updated_at
      ? [
          {
            id: row.id,
            name: row.name,
            description: row.description,
            updatedAt: row.updated_at,
            itemCount: row.item_count ?? 0,
            boardCount: row.board_count ?? 0,
            coverUrl: row.cover_path ? (covers.get(row.cover_path) ?? null) : null,
            clientName: row.client_name,
            phase: isPhase(row.phase) ? row.phase : "brief",
            nextEventAt: row.next_event_at,
            openRequestCount: row.open_request_count ?? 0,
            ownerId: row.owner_id,
            createdByClient: row.created_by_client ?? false,
          },
        ]
      : [],
  );
}

const SUMMARY_COLUMNS =
  "id, name, description, updated_at, item_count, board_count, cover_path, client_name, phase, next_event_at, open_request_count, owner_id, created_by_client";

export async function listProjects(): Promise<ProjectSummary[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("project_summaries")
    .select(SUMMARY_COLUMNS)
    .order("updated_at", { ascending: false });
  if (error) {
    logError("projects.list", error);
    throw new Error("Could not load projects");
  }
  return toProjectSummaries(data);
}

/** One project's summary; deduplicated per request (the hub layout and pages share it). */
export const getProject = cache(async (projectId: string): Promise<ProjectSummary | null> => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("project_summaries")
    .select(SUMMARY_COLUMNS)
    .eq("id", projectId)
    .maybeSingle();
  if (error) {
    logError("projects.get", error, { projectId });
    return null;
  }
  if (!data) return null;
  const [project] = await toProjectSummaries([data]);
  return project ?? null;
});

type BoardRow = {
  id: string;
  project_id: string;
  name: string;
  updated_at: string;
  canvas_objects: { count: number }[];
};

function toBoardSummary(row: BoardRow): BoardSummary {
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    updatedAt: row.updated_at,
    itemCount: row.canvas_objects[0]?.count ?? 0,
  };
}

const BOARD_COLUMNS = "id, project_id, name, updated_at, canvas_objects(count)";

export async function listBoards(projectId: string): Promise<BoardSummary[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("boards")
    .select(BOARD_COLUMNS)
    .eq("project_id", projectId)
    .order("position")
    .order("created_at");
  if (error) {
    logError("boards.list", error, { projectId });
    throw new Error("Could not load boards");
  }
  return (data as BoardRow[]).map(toBoardSummary);
}

export async function getBoard(boardId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("boards")
    .select("id, project_id, name, template, projects(name)")
    .eq("id", boardId)
    .maybeSingle();
  if (error) logError("boards.get", error, { boardId });
  return data;
}

export async function search(query: string): Promise<SearchResults> {
  const supabase = await createSupabaseServerClient();
  const pattern = likePattern(query);

  const [projects, boards] = await Promise.all([
    supabase
      .from("project_summaries")
      .select(SUMMARY_COLUMNS)
      .ilike("name", pattern)
      .order("updated_at", { ascending: false })
      .limit(SEARCH_RESULT_LIMIT),
    supabase
      .from("boards")
      .select(`${BOARD_COLUMNS}, projects(name)`)
      .ilike("name", pattern)
      .order("updated_at", { ascending: false })
      .limit(SEARCH_RESULT_LIMIT),
  ]);

  if (projects.error) logError("search.projects", projects.error);
  if (boards.error) logError("search.boards", boards.error);

  return {
    projects: await toProjectSummaries(projects.data ?? []),
    boards: ((boards.data ?? []) as (BoardRow & { projects: { name: string } | null })[]).map(
      (row) => ({ ...toBoardSummary(row), projectName: row.projects?.name ?? "" }),
    ),
  };
}

/** The most recent project cover the viewer can see, signed, for the menu image. */
export const getLatestCoverUrl = cache(async (): Promise<string | null> => {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("project_summaries")
    .select("cover_path")
    .not("cover_path", "is", null)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data?.cover_path) return null;
  const urls = await signStoragePaths(supabase, [data.cover_path]);
  return urls.get(data.cover_path) ?? null;
});
