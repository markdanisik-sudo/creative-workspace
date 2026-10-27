/** What Claude makes of an idea: written out, or read from handwritten notes. */
export interface StorySummary {
  title: string;
  logline: string;
  synopsis: string;
  tone: string;
  scenes: { title: string; description: string }[];
  needs: {
    locations: string[];
    cast: string[];
    gear: string[];
    props: string[];
  };
  /** What's still open: questions to think through before the shoot. */
  questions: string[];
}

export interface Story {
  body: string;
  summary: StorySummary | null;
  summarizedAt: string | null;
  updatedAt: string | null;
}

const strings = (value: unknown, max = 30): string[] =>
  Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === "string" && item.trim() !== "")
        .slice(0, max)
        .map((item) => item.slice(0, 500))
    : [];

const text = (value: unknown, max = 4000) => (typeof value === "string" ? value.slice(0, max) : "");

/** A summary read back from the database or the model, trimmed to shape. */
export function toStorySummary(value: unknown): StorySummary | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const needs = (raw.needs ?? {}) as Record<string, unknown>;
  const summary: StorySummary = {
    title: text(raw.title, 200),
    logline: text(raw.logline, 1000),
    synopsis: text(raw.synopsis),
    tone: text(raw.tone, 1000),
    scenes: Array.isArray(raw.scenes)
      ? raw.scenes
          .filter((scene): scene is Record<string, unknown> => !!scene && typeof scene === "object")
          .slice(0, 60)
          .map((scene) => ({
            title: text(scene.title, 200),
            description: text(scene.description, 2000),
          }))
          .filter((scene) => scene.title || scene.description)
      : [],
    needs: {
      locations: strings(needs.locations),
      cast: strings(needs.cast),
      gear: strings(needs.gear),
      props: strings(needs.props),
    },
    questions: strings(raw.questions),
  };
  return summary.logline || summary.synopsis || summary.scenes.length > 0 ? summary : null;
}
