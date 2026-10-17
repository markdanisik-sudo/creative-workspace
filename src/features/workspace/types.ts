import type { Palette } from "./palettes";
import type { Medium, PlanItem, PlanModuleId } from "./plan";

export { isPlanModuleId as isModuleId, type PlanModuleId as ModuleId } from "./plan";

export const BRIEF_FIELDS = [
  "goal",
  "audience",
  "message",
  "deliverables",
  "tone",
  "budget",
  "references",
  "notes",
] as const;
export type BriefField = (typeof BRIEF_FIELDS)[number];
export type Brief = Partial<Record<BriefField, string>>;

/** Free-form so new options never need a migration; see shot-options.ts. */
export type ShotSpecs = Partial<Record<string, string>>;

export const LOCATION_STATUSES = ["idea", "scouting", "confirmed"] as const;
export type LocationStatus = (typeof LOCATION_STATUSES)[number];

export const INT_EXT = ["int", "ext", "int_ext"] as const;
export const DAY_NIGHT = ["day", "night", "dawn", "dusk"] as const;

export interface WorkspaceImage {
  id: string;
  url: string | null;
  fullUrl: string | null;
  width: number | null;
  height: number | null;
  caption: string | null;
  uploadedBy: string | null;
  locationId: string | null;
}

export interface ProjectLocation {
  id: string;
  name: string;
  address: string | null;
  contact: string | null;
  notes: string | null;
  status: LocationStatus;
  createdBy: string | null;
  photos: WorkspaceImage[];
}

export interface Shot {
  id: string;
  position: number;
  scene: string | null;
  description: string | null;
  intExt: (typeof INT_EXT)[number] | null;
  dayNight: (typeof DAY_NIGHT)[number] | null;
  locationId: string | null;
  durationSeconds: number | null;
  specs: ShotSpecs;
  notes: string | null;
  done: boolean;
}

export interface WorkspaceData {
  medium: Medium;
  template: string | null;
  /** The Plan's boxes, in order. */
  modules: PlanModuleId[];
  /** Rows of the list boxes (interview, people, deliverables…). */
  items: PlanItem[];
  /** The moodboard's colour palette. */
  palette: Palette;
  brief: Brief;
  shotDefaults: ShotSpecs;
  moodboard: WorkspaceImage[];
  locations: ProjectLocation[];
  shots: Shot[];
}
