export interface ProjectSummary {
  id: string;
  name: string;
  description: string | null;
  updatedAt: string;
  itemCount: number;
  boardCount: number;
  coverUrl: string | null;
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
