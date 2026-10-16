import type { MessageKey } from "@/lib/i18n";
import type { Phase } from "@/features/projects/types";

/** The studio's standard checklist every new project starts with (editable in Plan). */
export const DEFAULT_STEPS: { phase: Phase; key: MessageKey }[] = [
  { phase: "brief", key: "steps.briefApproved" },
  { phase: "preproduction", key: "steps.moodboardApproved" },
  { phase: "preproduction", key: "steps.shotListReady" },
  { phase: "preproduction", key: "steps.locationsConfirmed" },
  { phase: "preproduction", key: "steps.crewBooked" },
  { phase: "production", key: "steps.dataBackedUp" },
  { phase: "postproduction", key: "steps.roughCut" },
  { phase: "postproduction", key: "steps.colorGrade" },
  { phase: "postproduction", key: "steps.soundMusic" },
  { phase: "postproduction", key: "steps.finalApproved" },
  { phase: "delivery", key: "steps.delivered" },
];
