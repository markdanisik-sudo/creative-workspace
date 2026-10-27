import type { Phase } from "@/features/projects/types";
import type { MessageKey } from "@/lib/i18n";

/* ------------------------------------------------------------------------ */
/* Boxes                                                                     */
/* ------------------------------------------------------------------------ */

/** Boxes made of rows (stored in plan_items). */
export const LIST_MODULE_IDS = [
  "photos",
  "script",
  "interview",
  "people",
  "content",
  "deliverables",
  "gear",
] as const;
export type ListModuleId = (typeof LIST_MODULE_IDS)[number];

/** Every box a Plan can have, in the order they appear. */
export const PLAN_MODULE_IDS = [
  "brief",
  "story",
  "moodboard",
  "script",
  "interview",
  "content",
  "shots",
  "photos",
  "people",
  "locations",
  "deliverables",
  "gear",
  "tasks",
] as const;
export type PlanModuleId = (typeof PLAN_MODULE_IDS)[number];

export function isPlanModuleId(value: unknown): value is PlanModuleId {
  return PLAN_MODULE_IDS.some((id) => id === value);
}

export function isListModuleId(value: unknown): value is ListModuleId {
  return LIST_MODULE_IDS.some((id) => id === value);
}

/** Projects made before templates show the classic set. */
export const CLASSIC_MODULES: PlanModuleId[] = [
  "brief",
  "moodboard",
  "shots",
  "locations",
  "tasks",
];

/** The Plan's boxes in display order, from what's stored. */
export function resolveModules(stored: string[] | null | undefined): PlanModuleId[] {
  if (!stored) return CLASSIC_MODULES;
  const chosen = new Set(stored.filter(isPlanModuleId));
  return PLAN_MODULE_IDS.filter((id) => chosen.has(id));
}

export const MEDIA = ["video", "photo", "both"] as const;
export type Medium = (typeof MEDIA)[number];

export function isMedium(value: unknown): value is Medium {
  return MEDIA.some((medium) => medium === value);
}

/* ------------------------------------------------------------------------ */
/* Fields of the list boxes                                                  */
/* ------------------------------------------------------------------------ */

/** Option lists; labels at plan.options.<set>.<value> unless `raw`. */
export const OPTION_SETS = {
  priority: ["must", "nice"],
  role: [
    "protagonist",
    "interviewee",
    "actor",
    "model",
    "presenter",
    "extra",
    "director",
    "camera",
    "sound",
    "light",
    "styling",
    "makeup",
    "producer",
    "other",
  ],
  release: ["missing", "sent", "signed"],
  platform: [
    "instagram",
    "tiktok",
    "youtube",
    "facebook",
    "linkedin",
    "web",
    "tv",
    "cinema",
    "print",
    "other",
  ],
  format: ["reel", "story", "post", "carousel", "short", "video", "photo"],
  gearCategory: ["camera", "lens", "light", "sound", "grip", "power", "data", "other"],
  lighting: ["natural", "flash", "continuous", "mixed"],
} as const;
export type OptionSet = keyof typeof OPTION_SETS;

/** Values shown as they are (no translation). */
export const RAW_OPTIONS = {
  aspect: ["16:9", "9:16", "4:5", "1:1", "2.39:1", "4:3", "3:2", "2:3"],
  focal: ["14 mm", "24 mm", "35 mm", "50 mm", "85 mm", "100 mm macro", "135 mm", "70–200 mm"],
} as const;
export type RawOptionSet = keyof typeof RAW_OPTIONS;

export type FieldDef =
  | { key: string; kind: "text" | "longtext" | "number" | "date" }
  | { key: string; kind: "select"; options: OptionSet }
  | { key: string; kind: "raw"; options: RawOptionSet };

export interface ListModuleDef {
  fields: FieldDef[];
  /** The field that names a row. */
  title: string;
  /** Short facts shown under the title. */
  meta: string[];
  /** Rows are grouped by this field (e.g. interview questions by person). */
  groupBy?: string;
}

export const LIST_MODULES: Record<ListModuleId, ListModuleDef> = {
  photos: {
    title: "subject",
    meta: ["location", "focal", "lighting", "aspect"],
    fields: [
      { key: "subject", kind: "text" },
      { key: "description", kind: "longtext" },
      { key: "location", kind: "text" },
      { key: "focal", kind: "raw", options: "focal" },
      { key: "lighting", kind: "select", options: "lighting" },
      { key: "aspect", kind: "raw", options: "aspect" },
      { key: "notes", kind: "longtext" },
    ],
  },
  script: {
    title: "scene",
    meta: ["duration"],
    fields: [
      { key: "scene", kind: "text" },
      { key: "visual", kind: "longtext" },
      { key: "audio", kind: "longtext" },
      { key: "duration", kind: "text" },
    ],
  },
  interview: {
    title: "question",
    meta: ["topic", "priority"],
    groupBy: "person",
    fields: [
      { key: "question", kind: "longtext" },
      { key: "person", kind: "text" },
      { key: "topic", kind: "text" },
      { key: "priority", kind: "select", options: "priority" },
      { key: "notes", kind: "longtext" },
    ],
  },
  people: {
    title: "name",
    meta: ["role", "release", "contact"],
    fields: [
      { key: "name", kind: "text" },
      { key: "role", kind: "select", options: "role" },
      { key: "contact", kind: "text" },
      { key: "release", kind: "select", options: "release" },
      { key: "notes", kind: "longtext" },
    ],
  },
  content: {
    title: "title",
    meta: ["platform", "format", "publish"],
    fields: [
      { key: "title", kind: "text" },
      { key: "platform", kind: "select", options: "platform" },
      { key: "format", kind: "select", options: "format" },
      { key: "publish", kind: "date" },
      { key: "idea", kind: "longtext" },
    ],
  },
  deliverables: {
    title: "name",
    meta: ["platform", "aspect", "duration", "quantity", "due"],
    fields: [
      { key: "name", kind: "text" },
      { key: "platform", kind: "select", options: "platform" },
      { key: "aspect", kind: "raw", options: "aspect" },
      { key: "duration", kind: "text" },
      { key: "quantity", kind: "number" },
      { key: "due", kind: "date" },
      { key: "notes", kind: "longtext" },
    ],
  },
  gear: {
    title: "item",
    meta: ["quantity", "notes"],
    groupBy: "category",
    fields: [
      { key: "item", kind: "text" },
      { key: "category", kind: "select", options: "gearCategory" },
      { key: "quantity", kind: "number" },
      { key: "notes", kind: "text" },
    ],
  },
};

/** Field values as stored: text, or a number for number fields. */
export type ItemData = Record<string, string | number>;

export interface PlanItem {
  id: string;
  module: ListModuleId;
  position: number;
  data: ItemData;
  done: boolean;
  createdBy: string | null;
}

/* ------------------------------------------------------------------------ */
/* Templates                                                                 */
/* ------------------------------------------------------------------------ */

type Localized = { cs: string; en: string };
/** A starter row; text fields localized, other values as stored. */
export type Seed = Record<string, Localized | string | number>;

export const TEMPLATE_IDS = [
  "social",
  "documentary",
  "commercial",
  "photo_campaign",
  "photo_portrait",
  "photo_event",
  "hybrid_social",
  "hybrid_campaign",
  "custom",
] as const;
export type TemplateId = (typeof TEMPLATE_IDS)[number];

export function isTemplateId(value: unknown): value is TemplateId {
  return TEMPLATE_IDS.some((id) => id === value);
}

export interface PlanTemplate {
  id: TemplateId;
  medium: Medium;
  modules: PlanModuleId[];
  steps: { phase: Phase; key: MessageKey }[];
  seeds: Partial<Record<ListModuleId, Seed[]>>;
}

const L = (cs: string, en: string): Localized => ({ cs, en });

/* Checklists (Overview) by kind of work. */
const VIDEO_STEPS: PlanTemplate["steps"] = [
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

const SOCIAL_STEPS: PlanTemplate["steps"] = [
  { phase: "brief", key: "steps.briefApproved" },
  { phase: "preproduction", key: "steps.contentPlanApproved" },
  { phase: "preproduction", key: "steps.shotListReady" },
  { phase: "production", key: "steps.dataBackedUp" },
  { phase: "postproduction", key: "steps.firstEdits" },
  { phase: "postproduction", key: "steps.subtitles" },
  { phase: "postproduction", key: "steps.finalApproved" },
  { phase: "delivery", key: "steps.exportsPerPlatform" },
  { phase: "delivery", key: "steps.delivered" },
];

const DOCUMENTARY_STEPS: PlanTemplate["steps"] = [
  { phase: "brief", key: "steps.briefApproved" },
  { phase: "preproduction", key: "steps.research" },
  { phase: "preproduction", key: "steps.questionsReady" },
  { phase: "preproduction", key: "steps.interviewsScheduled" },
  { phase: "preproduction", key: "steps.locationsConfirmed" },
  { phase: "production", key: "steps.releasesSigned" },
  { phase: "production", key: "steps.dataBackedUp" },
  { phase: "postproduction", key: "steps.transcripts" },
  { phase: "postproduction", key: "steps.storyStructure" },
  { phase: "postproduction", key: "steps.roughCut" },
  { phase: "postproduction", key: "steps.colorGrade" },
  { phase: "postproduction", key: "steps.soundMusic" },
  { phase: "postproduction", key: "steps.finalApproved" },
  { phase: "delivery", key: "steps.delivered" },
];

const COMMERCIAL_STEPS: PlanTemplate["steps"] = [
  { phase: "brief", key: "steps.briefApproved" },
  { phase: "brief", key: "steps.scriptApproved" },
  { phase: "preproduction", key: "steps.moodboardApproved" },
  { phase: "preproduction", key: "steps.castingDone" },
  { phase: "preproduction", key: "steps.locationsConfirmed" },
  { phase: "preproduction", key: "steps.crewBooked" },
  { phase: "preproduction", key: "steps.ppm" },
  { phase: "production", key: "steps.releasesSigned" },
  { phase: "production", key: "steps.dataBackedUp" },
  { phase: "postproduction", key: "steps.roughCut" },
  { phase: "postproduction", key: "steps.colorGrade" },
  { phase: "postproduction", key: "steps.soundMusic" },
  { phase: "postproduction", key: "steps.finalApproved" },
  { phase: "delivery", key: "steps.cutdowns" },
  { phase: "delivery", key: "steps.delivered" },
];

const PHOTO_STEPS: PlanTemplate["steps"] = [
  { phase: "brief", key: "steps.briefApproved" },
  { phase: "preproduction", key: "steps.moodboardApproved" },
  { phase: "preproduction", key: "steps.photoListReady" },
  { phase: "preproduction", key: "steps.locationsConfirmed" },
  { phase: "preproduction", key: "steps.teamBooked" },
  { phase: "production", key: "steps.dataBackedUp" },
  { phase: "postproduction", key: "steps.selection" },
  { phase: "postproduction", key: "steps.clientSelection" },
  { phase: "postproduction", key: "steps.retouch" },
  { phase: "postproduction", key: "steps.finalApproved" },
  { phase: "delivery", key: "steps.delivered" },
];

const HYBRID_STEPS: PlanTemplate["steps"] = [
  { phase: "brief", key: "steps.briefApproved" },
  { phase: "preproduction", key: "steps.moodboardApproved" },
  { phase: "preproduction", key: "steps.shotListReady" },
  { phase: "preproduction", key: "steps.photoListReady" },
  { phase: "preproduction", key: "steps.locationsConfirmed" },
  { phase: "preproduction", key: "steps.crewBooked" },
  { phase: "production", key: "steps.dataBackedUp" },
  { phase: "postproduction", key: "steps.roughCut" },
  { phase: "postproduction", key: "steps.selection" },
  { phase: "postproduction", key: "steps.retouch" },
  { phase: "postproduction", key: "steps.colorGrade" },
  { phase: "postproduction", key: "steps.finalApproved" },
  { phase: "delivery", key: "steps.delivered" },
];

/* Starter rows. */
const SOCIAL_DELIVERABLES: Seed[] = [
  {
    name: L("Reel", "Reel"),
    platform: "instagram",
    aspect: "9:16",
    duration: L("15–30 s", "15–30 s"),
    quantity: 3,
  },
  {
    name: L("TikTok", "TikTok"),
    platform: "tiktok",
    aspect: "9:16",
    duration: L("15–60 s", "15–60 s"),
    quantity: 3,
  },
  {
    name: L("Stories", "Stories"),
    platform: "instagram",
    aspect: "9:16",
    duration: L("do 15 s", "up to 15 s"),
    quantity: 5,
  },
  { name: L("Post do feedu", "Feed post"), platform: "instagram", aspect: "4:5", quantity: 3 },
];

const SOCIAL_CONTENT: Seed[] = [
  {
    title: L("Teaser — představení projektu", "Teaser — introducing the project"),
    format: "reel",
    platform: "instagram",
    idea: L(
      "Háček v prvních 2 sekundách, pak 3 rychlé záběry a výzva k akci.",
      "Hook in the first 2 seconds, then 3 quick shots and a call to action.",
    ),
  },
  {
    title: L("Behind the scenes", "Behind the scenes"),
    format: "story",
    platform: "instagram",
    idea: L(
      "Momentky z natáčení, lidé za kamerou.",
      "Candid moments from the shoot, the people behind the camera.",
    ),
  },
  { title: L("Hlavní video", "Hero video"), format: "reel", platform: "instagram" },
];

const INTERVIEW_QUESTIONS: Seed[] = [
  {
    question: L(
      "Představte se prosím — kdo jste a co děláte?",
      "Please introduce yourself — who are you and what do you do?",
    ),
    topic: L("Úvod", "Intro"),
    priority: "must",
  },
  {
    question: L(
      "Jak to celé začalo? Pamatujete si ten moment?",
      "How did it all start? Do you remember the moment?",
    ),
    topic: L("Začátek", "Beginnings"),
    priority: "must",
  },
  {
    question: L(
      "Co pro vás bylo nejtěžší a jak jste to překonal(a)?",
      "What was the hardest part, and how did you get through it?",
    ),
    topic: L("Překážky", "Obstacles"),
    priority: "must",
  },
  {
    question: L("Na co jste nejvíc hrdý/á?", "What are you most proud of?"),
    topic: L("Úspěch", "Success"),
    priority: "nice",
  },
  {
    question: L("Kde to bude za pět let?", "Where will this be in five years?"),
    topic: L("Budoucnost", "Future"),
    priority: "nice",
  },
  {
    question: L(
      "Co byste vzkázal(a) někomu, kdo začíná?",
      "What would you tell someone just starting out?",
    ),
    topic: L("Závěr", "Closing"),
    priority: "nice",
  },
];

const DOCUMENTARY_PEOPLE: Seed[] = [
  { name: L("Hlavní protagonista", "Main subject"), role: "protagonist", release: "missing" },
];

const COMMERCIAL_SCRIPT: Seed[] = [
  {
    scene: L("1 — Úvod / háček", "1 — Opening / hook"),
    visual: L(
      "Co diváka zastaví hned v první vteřině.",
      "What stops the viewer in the very first second.",
    ),
    duration: L("3 s", "3 s"),
  },
  {
    scene: L("2 — Problém", "2 — Problem"),
    visual: L("Situace, kterou divák zná.", "A situation the viewer recognises."),
    duration: L("7 s", "7 s"),
  },
  {
    scene: L("3 — Řešení / produkt", "3 — Solution / product"),
    visual: L("Produkt v akci, detail.", "The product in action, close-up."),
    duration: L("12 s", "12 s"),
  },
  {
    scene: L("4 — Packshot a claim", "4 — Packshot and claim"),
    visual: L("Logo, claim, výzva k akci.", "Logo, claim, call to action."),
    audio: L("Voiceover s claimem", "Voiceover with the claim"),
    duration: L("5 s", "5 s"),
  },
];

const COMMERCIAL_PEOPLE: Seed[] = [
  { name: L("Režie", "Director"), role: "director" },
  { name: L("Kamera (DOP)", "Director of photography"), role: "camera" },
  { name: L("Herec / hlavní role", "Lead actor"), role: "actor", release: "missing" },
  { name: L("Styling", "Stylist"), role: "styling" },
  { name: L("Make-up", "Make-up"), role: "makeup" },
];

const COMMERCIAL_DELIVERABLES: Seed[] = [
  {
    name: L("Master spot", "Master spot"),
    platform: "tv",
    aspect: "16:9",
    duration: L("30 s", "30 s"),
    quantity: 1,
  },
  {
    name: L("Cutdown", "Cutdown"),
    platform: "youtube",
    aspect: "16:9",
    duration: L("15 s", "15 s"),
    quantity: 1,
  },
  {
    name: L("Bumper", "Bumper"),
    platform: "youtube",
    aspect: "16:9",
    duration: L("6 s", "6 s"),
    quantity: 1,
  },
  {
    name: L("Verze na sítě", "Social version"),
    platform: "instagram",
    aspect: "9:16",
    duration: L("15 s", "15 s"),
    quantity: 1,
  },
  {
    name: L("Verze 1:1", "1:1 version"),
    platform: "facebook",
    aspect: "1:1",
    duration: L("15 s", "15 s"),
    quantity: 1,
  },
];

const VIDEO_GEAR: Seed[] = [
  { item: L("Kamera A + baterie", "Camera A + batteries"), category: "camera", quantity: 1 },
  { item: L("Objektivy", "Lenses"), category: "lens" },
  { item: L("Světla + stativy", "Lights + stands"), category: "light" },
  { item: L("Mikroporty", "Lavalier mics"), category: "sound", quantity: 2 },
  { item: L("Gimbal / stativ", "Gimbal / tripod"), category: "grip" },
  { item: L("Karty + SSD na zálohu", "Cards + backup SSD"), category: "data" },
  { item: L("Nabíječky, prodlužky", "Chargers, extension leads"), category: "power" },
];

const PHOTO_GEAR: Seed[] = [
  { item: L("Tělo + záložní tělo", "Body + backup body"), category: "camera", quantity: 2 },
  { item: L("Objektivy", "Lenses"), category: "lens" },
  {
    item: L("Blesky / světla + odrazné desky", "Flashes / lights + reflectors"),
    category: "light",
  },
  { item: L("Stativ", "Tripod"), category: "grip" },
  { item: L("Karty + zálohovací disk", "Cards + backup drive"), category: "data" },
  { item: L("Baterie a nabíječky", "Batteries and chargers"), category: "power" },
];

const CAMPAIGN_PHOTOS: Seed[] = [
  { subject: L("Hlavní vizuál (key visual)", "Key visual"), aspect: "4:5", lighting: "continuous" },
  {
    subject: L("Produkt — packshot na bílém", "Product — packshot on white"),
    aspect: "1:1",
    lighting: "flash",
    focal: "100 mm macro",
  },
  {
    subject: L("Produkt v použití (lifestyle)", "Product in use (lifestyle)"),
    aspect: "3:2",
    lighting: "natural",
  },
  { subject: L("Detaily a textury", "Details and textures"), aspect: "4:5", focal: "100 mm macro" },
  { subject: L("Formát na banner", "Banner format"), aspect: "16:9" },
];

const PORTRAIT_PHOTOS: Seed[] = [
  { subject: L("Hlavní portrét", "Main portrait"), aspect: "4:5", focal: "85 mm" },
  { subject: L("Celá postava", "Full length"), aspect: "2:3", focal: "50 mm" },
  { subject: L("Portrét v prostředí", "Environmental portrait"), aspect: "3:2", focal: "35 mm" },
  {
    subject: L("Detail (ruce, výraz)", "Detail (hands, expression)"),
    aspect: "4:5",
    focal: "135 mm",
  },
];

const EVENT_PHOTOS: Seed[] = [
  {
    subject: L("Příjezd hostů a atmosféra", "Guests arriving and atmosphere"),
    lighting: "natural",
  },
  { subject: L("Hlavní program / řečníci", "Main programme / speakers"), focal: "70–200 mm" },
  { subject: L("Skupinové foto", "Group photo"), focal: "24 mm" },
  { subject: L("Detaily, výzdoba, catering", "Details, decor, catering"), focal: "50 mm" },
  { subject: L("Partneři a loga", "Partners and logos") },
];

const PHOTO_DELIVERABLES: Seed[] = [
  { name: L("Upravené fotky — web", "Edited photos — web"), platform: "web", quantity: 20 },
  { name: L("Fotky na sítě", "Social photos"), platform: "instagram", aspect: "4:5", quantity: 10 },
  { name: L("Tisková data", "Print files"), platform: "print", quantity: 5 },
];

const EVENT_DELIVERABLES: Seed[] = [
  {
    name: L("Rychlý výběr — ještě týž den", "Same-day quick picks"),
    platform: "instagram",
    quantity: 10,
  },
  { name: L("Kompletní galerie", "Full gallery"), platform: "web", quantity: 150 },
];

const EVENT_PEOPLE: Seed[] = [
  { name: L("Kontaktní osoba na místě", "On-site contact"), role: "producer" },
  { name: L("VIP hosté — koho nevynechat", "VIP guests — who not to miss"), role: "other" },
];

export const PLAN_TEMPLATES: PlanTemplate[] = [
  {
    id: "social",
    medium: "video",
    modules: ["brief", "moodboard", "content", "shots", "deliverables", "tasks"],
    steps: SOCIAL_STEPS,
    seeds: { content: SOCIAL_CONTENT, deliverables: SOCIAL_DELIVERABLES },
  },
  {
    id: "documentary",
    medium: "video",
    modules: ["brief", "moodboard", "interview", "people", "shots", "locations", "gear", "tasks"],
    steps: DOCUMENTARY_STEPS,
    seeds: { interview: INTERVIEW_QUESTIONS, people: DOCUMENTARY_PEOPLE, gear: VIDEO_GEAR },
  },
  {
    id: "commercial",
    medium: "video",
    modules: [
      "brief",
      "moodboard",
      "script",
      "shots",
      "people",
      "locations",
      "deliverables",
      "gear",
      "tasks",
    ],
    steps: COMMERCIAL_STEPS,
    seeds: {
      script: COMMERCIAL_SCRIPT,
      people: COMMERCIAL_PEOPLE,
      deliverables: COMMERCIAL_DELIVERABLES,
      gear: VIDEO_GEAR,
    },
  },
  {
    id: "photo_campaign",
    medium: "photo",
    modules: [
      "brief",
      "moodboard",
      "photos",
      "people",
      "locations",
      "deliverables",
      "gear",
      "tasks",
    ],
    steps: PHOTO_STEPS,
    seeds: { photos: CAMPAIGN_PHOTOS, deliverables: PHOTO_DELIVERABLES, gear: PHOTO_GEAR },
  },
  {
    id: "photo_portrait",
    medium: "photo",
    modules: ["brief", "moodboard", "photos", "locations", "tasks"],
    steps: PHOTO_STEPS,
    seeds: { photos: PORTRAIT_PHOTOS },
  },
  {
    id: "photo_event",
    medium: "photo",
    modules: ["brief", "photos", "people", "deliverables", "gear", "tasks"],
    steps: PHOTO_STEPS,
    seeds: {
      photos: EVENT_PHOTOS,
      people: EVENT_PEOPLE,
      deliverables: EVENT_DELIVERABLES,
      gear: PHOTO_GEAR,
    },
  },
  {
    id: "hybrid_social",
    medium: "both",
    modules: ["brief", "moodboard", "content", "shots", "photos", "deliverables", "tasks"],
    steps: HYBRID_STEPS,
    seeds: {
      content: SOCIAL_CONTENT,
      deliverables: [
        ...SOCIAL_DELIVERABLES,
        {
          name: L("Fotky do feedu", "Feed photos"),
          platform: "instagram",
          aspect: "4:5",
          quantity: 6,
        },
      ],
    },
  },
  {
    id: "hybrid_campaign",
    medium: "both",
    modules: [
      "brief",
      "moodboard",
      "script",
      "shots",
      "photos",
      "people",
      "locations",
      "deliverables",
      "gear",
      "tasks",
    ],
    steps: HYBRID_STEPS,
    seeds: {
      script: COMMERCIAL_SCRIPT,
      photos: CAMPAIGN_PHOTOS,
      people: COMMERCIAL_PEOPLE,
      deliverables: [...COMMERCIAL_DELIVERABLES, ...PHOTO_DELIVERABLES],
      gear: VIDEO_GEAR,
    },
  },
];

/** Boxes offered when building a custom plan, by medium. */
export function customModuleChoices(medium: Medium): PlanModuleId[] {
  return PLAN_MODULE_IDS.filter((id) =>
    medium === "photo"
      ? id !== "shots" && id !== "script"
      : medium === "video"
        ? id !== "photos"
        : true,
  );
}

/** A sensible starting pick for a custom plan. */
export function customDefaults(medium: Medium): PlanModuleId[] {
  const base: PlanModuleId[] = ["brief", "moodboard", "locations", "tasks"];
  if (medium !== "photo") base.push("shots");
  if (medium !== "video") base.push("photos");
  return base;
}

export function stepsFor(medium: Medium, template: PlanTemplate | undefined) {
  if (template) return template.steps;
  return medium === "photo" ? PHOTO_STEPS : medium === "both" ? HYBRID_STEPS : VIDEO_STEPS;
}

export function templatesFor(medium: Medium): PlanTemplate[] {
  return PLAN_TEMPLATES.filter((template) => template.medium === medium);
}

export function findTemplate(id: unknown): PlanTemplate | undefined {
  return PLAN_TEMPLATES.find((template) => template.id === id);
}

/** A seed row in the viewer's language, as stored. */
export function localizeSeed(seed: Seed, locale: "cs" | "en"): ItemData {
  return Object.fromEntries(
    Object.entries(seed).map(([key, value]) => [
      key,
      typeof value === "object" ? value[locale] : value,
    ]),
  );
}
