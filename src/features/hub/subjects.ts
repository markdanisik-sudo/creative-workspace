import type { MessageKey, Translator } from "@/lib/i18n";
import { isListModuleId, type PlanModuleId } from "@/features/workspace/plan";

/** What a discussion message can be about: the Plan's boxes and things in them. */
export interface Subjects {
  modules: PlanModuleId[];
  images: { id: string; url: string | null }[];
  items: { id: string; module: string; title: string }[];
}

/** Boxes with parts you can point at. */
export function hasTargets(topic: string): boolean {
  return topic === "moodboard" || isListModuleId(topic);
}

/** "Moodboard · Colour palette", "Interview questions · Why now?" */
export function subjectLabel(
  t: Translator["t"],
  subjects: Subjects,
  topic: string,
  target: string | null,
): { box: string; part: string | null; image: string | null } {
  const box = t(`workspace.modules.${topic}` as MessageKey);
  if (!target) return { box, part: null, image: null };
  if (target === "palette") return { box, part: t("palette.title"), image: null };
  const [kind, id] = target.split(":");
  if (kind === "image") {
    const image = subjects.images.find((item) => item.id === id);
    return { box, part: t("discussion.aboutImage"), image: image?.url ?? null };
  }
  const item = subjects.items.find((entry) => entry.id === id);
  return { box, part: item?.title ?? t("discussion.aboutItem"), image: null };
}
