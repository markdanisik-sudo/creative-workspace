import type { MessageKey } from "@/lib/i18n";

export interface SpecOption {
  value: string;
  /** Translated label; technical names (cameras, codecs…) are shown as they are. */
  labelKey?: MessageKey;
}

export interface SpecGroup {
  key: string;
  labelKey: MessageKey;
  /** Set once for the whole project; each shot can override. */
  projectDefault: boolean;
  options: SpecOption[];
}

const plain = (...values: string[]): SpecOption[] => values.map((value) => ({ value }));

/** The configurator, in the order a DP would set up a shot. */
export const SPEC_GROUPS: SpecGroup[] = [
  {
    key: "camera",
    labelKey: "shots.spec.camera",
    projectDefault: true,
    options: plain(
      "ARRI Alexa 35",
      "ARRI Alexa Mini LF",
      "ARRI Alexa Mini",
      "RED V-Raptor XL",
      "RED Komodo 6K",
      "Sony Venice 2",
      "Sony Burano",
      "Sony FX9",
      "Sony FX6",
      "Sony FX3",
      "Canon C500 Mk II",
      "Canon C300 Mk III",
      "Canon C70",
      "Blackmagic URSA Cine 12K",
      "Blackmagic Pocket 6K",
      "DJI Ronin 4D",
      "iPhone 16 Pro",
    ),
  },
  {
    key: "optics",
    labelKey: "shots.spec.optics",
    projectDefault: true,
    options: plain(
      "Cooke S4/i",
      "Zeiss Supreme Prime",
      "ARRI Signature Prime",
      "Leica Summilux-C",
      "Sigma Cine FF",
      "Canon CN-E",
      "DZOFilm Vespid",
      "Atlas Orion Anamorphic",
      "Cooke Anamorphic/i",
      "Canon K35 Vintage",
      "Fujinon Premista Zoom",
    ),
  },
  {
    key: "focal",
    labelKey: "shots.spec.focal",
    projectDefault: false,
    options: plain(
      "14 mm",
      "18 mm",
      "21 mm",
      "25 mm",
      "29 mm",
      "35 mm",
      "40 mm",
      "50 mm",
      "65 mm",
      "75 mm",
      "85 mm",
      "100 mm",
      "135 mm",
      "24–70 mm",
      "70–200 mm",
    ),
  },
  {
    key: "resolution",
    labelKey: "shots.spec.resolution",
    projectDefault: true,
    options: plain("8K", "6K", "4.6K", "4K DCI", "UHD 4K", "3.2K", "2K", "1080p"),
  },
  {
    key: "codec",
    labelKey: "shots.spec.codec",
    projectDefault: true,
    options: plain(
      "ARRIRAW",
      "ProRes 4444 XQ",
      "ProRes 4444",
      "ProRes 422 HQ",
      "ProRes 422",
      "REDCODE RAW",
      "Blackmagic RAW",
      "Sony X-OCN",
      "ProRes RAW",
      "H.265 10-bit",
    ),
  },
  {
    key: "aspect",
    labelKey: "shots.spec.aspect",
    projectDefault: true,
    options: plain("2.39:1", "2:1", "1.85:1", "16:9", "4:3", "9:16", "4:5", "1:1"),
  },
  {
    key: "fps",
    labelKey: "shots.spec.fps",
    projectDefault: true,
    options: plain("23.976", "24", "25", "29.97", "30", "48", "50", "60", "100", "120", "240"),
  },
  {
    key: "shutter",
    labelKey: "shots.spec.shutter",
    projectDefault: true,
    options: plain("180°", "172.8°", "90°", "45°", "360°"),
  },
  {
    key: "size",
    labelKey: "shots.spec.size",
    projectDefault: false,
    options: [
      { value: "EWS", labelKey: "shots.opt.size.EWS" },
      { value: "WS", labelKey: "shots.opt.size.WS" },
      { value: "MWS", labelKey: "shots.opt.size.MWS" },
      { value: "MS", labelKey: "shots.opt.size.MS" },
      { value: "MCU", labelKey: "shots.opt.size.MCU" },
      { value: "CU", labelKey: "shots.opt.size.CU" },
      { value: "ECU", labelKey: "shots.opt.size.ECU" },
      { value: "INS", labelKey: "shots.opt.size.INS" },
    ],
  },
  {
    key: "angle",
    labelKey: "shots.spec.angle",
    projectDefault: false,
    options: [
      { value: "eye", labelKey: "shots.opt.angle.eye" },
      { value: "high", labelKey: "shots.opt.angle.high" },
      { value: "low", labelKey: "shots.opt.angle.low" },
      { value: "overhead", labelKey: "shots.opt.angle.overhead" },
      { value: "dutch", labelKey: "shots.opt.angle.dutch" },
      { value: "pov", labelKey: "shots.opt.angle.pov" },
      { value: "ots", labelKey: "shots.opt.angle.ots" },
    ],
  },
  {
    key: "movement",
    labelKey: "shots.spec.movement",
    projectDefault: false,
    options: [
      { value: "static", labelKey: "shots.opt.movement.static" },
      { value: "pan", labelKey: "shots.opt.movement.pan" },
      { value: "tilt", labelKey: "shots.opt.movement.tilt" },
      { value: "push", labelKey: "shots.opt.movement.push" },
      { value: "pull", labelKey: "shots.opt.movement.pull" },
      { value: "tracking", labelKey: "shots.opt.movement.tracking" },
      { value: "crane", labelKey: "shots.opt.movement.crane" },
      { value: "orbit", labelKey: "shots.opt.movement.orbit" },
      { value: "handheld", labelKey: "shots.opt.movement.handheld" },
      { value: "whip", labelKey: "shots.opt.movement.whip" },
    ],
  },
  {
    key: "support",
    labelKey: "shots.spec.support",
    projectDefault: false,
    options: [
      { value: "tripod", labelKey: "shots.opt.support.tripod" },
      { value: "slider", labelKey: "shots.opt.support.slider" },
      { value: "dolly", labelKey: "shots.opt.support.dolly" },
      { value: "gimbal", labelKey: "shots.opt.support.gimbal" },
      { value: "steadicam", labelKey: "shots.opt.support.steadicam" },
      { value: "crane", labelKey: "shots.opt.support.crane" },
      { value: "drone", labelKey: "shots.opt.support.drone" },
      { value: "handheld", labelKey: "shots.opt.support.handheld" },
      { value: "car", labelKey: "shots.opt.support.car" },
      { value: "easyrig", labelKey: "shots.opt.support.easyrig" },
    ],
  },
];

export const DEFAULT_GROUPS = SPEC_GROUPS.filter((group) => group.projectDefault);

export function specGroup(key: string) {
  return SPEC_GROUPS.find((group) => group.key === key);
}

/** The value a shot uses: its own, or the project's default. */
export function effectiveSpec(
  key: string,
  specs: Partial<Record<string, string>>,
  defaults: Partial<Record<string, string>>,
): { value: string | undefined; inherited: boolean } {
  if (specs[key]) return { value: specs[key], inherited: false };
  return { value: defaults[key], inherited: Boolean(defaults[key]) };
}
