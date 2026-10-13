export const PHASES = [
  "brief",
  "preproduction",
  "production",
  "postproduction",
  "delivery",
] as const;
export type Phase = (typeof PHASES)[number];

export function isPhase(value: unknown): value is Phase {
  return PHASES.some((phase) => phase === value);
}

export interface ProjectSummary {
  id: string;
  name: string;
  description: string | null;
  clientName: string | null;
  phase: Phase;
  updatedAt: string;
  itemCount: number;
  boardCount: number;
  coverUrl: string | null;
  nextEventAt: string | null;
  openRequestCount: number;
}

export interface BoardSummary {
  id: string;
  projectId: string;
  name: string;
  updatedAt: string;
  itemCount: number;
}

export interface SearchResults {
  projects: ProjectSummary[];
  boards: (BoardSummary & { projectName: string })[];
}
