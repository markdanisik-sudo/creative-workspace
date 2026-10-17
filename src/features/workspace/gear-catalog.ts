/**
 * Gear by brand, for picking into a project's gear list. A starting set of
 * current cameras, lenses and lights; easy to extend.
 */

export type GearCategory =
  "camera" | "lens" | "light" | "sound" | "grip" | "power" | "data" | "other";

export interface GearBrand {
  id: string;
  name: string;
  items: { model: string; category: GearCategory }[];
}

const cameras = (...models: string[]) =>
  models.map((model) => ({ model, category: "camera" as const }));
const lenses = (...models: string[]) =>
  models.map((model) => ({ model, category: "lens" as const }));
const lights = (...models: string[]) =>
  models.map((model) => ({ model, category: "light" as const }));

export const GEAR_BRANDS: GearBrand[] = [
  {
    id: "arri",
    name: "ARRI",
    items: [
      ...cameras("ALEXA 35", "ALEXA 265", "ALEXA Mini LF", "ALEXA Mini", "ALEXA LF", "AMIRA"),
      ...lenses(
        "Signature Prime",
        "Signature Zoom 24–75 mm",
        "Signature Zoom 45–135 mm",
        "Master Prime",
        "Ultra Prime",
        "Master Anamorphic",
        "Alura Zoom 18–80 mm",
      ),
      ...lights("SkyPanel S60-C", "SkyPanel S360-C", "Orbiter", "L7-C", "M18 (HMI)"),
      { model: "Hi-5 (wireless lens control)", category: "other" },
    ],
  },
  {
    id: "red",
    name: "RED",
    items: [
      ...cameras(
        "V-RAPTOR [X] 8K VV",
        "V-RAPTOR 8K VV",
        "V-RAPTOR 8K S35",
        "V-RAPTOR XL 8K VV",
        "KOMODO-X 6K",
        "KOMODO 6K",
      ),
      { model: "PRO CFexpress 2 TB", category: "data" },
    ],
  },
  {
    id: "sony",
    name: "Sony",
    items: [
      ...cameras(
        "VENICE 2",
        "BURANO",
        "FX9",
        "FX6",
        "FX3",
        "FX30",
        "FR7",
        "α7S III",
        "α7 IV",
        "α7R V",
        "α1 II",
      ),
      ...lenses(
        "FE 16-35mm F2.8 GM II",
        "FE 24-70mm F2.8 GM II",
        "FE 70-200mm F2.8 GM OSS II",
        "FE 35mm F1.4 GM",
        "FE 50mm F1.2 GM",
        "FE 85mm F1.4 GM II",
        "FE 135mm F1.8 GM",
        "FE PZ 28-135mm F4 G OSS",
      ),
      { model: "CFexpress Type A 160 GB", category: "data" },
    ],
  },
  {
    id: "canon",
    name: "Canon",
    items: [
      ...cameras(
        "EOS C500 Mark II",
        "EOS C400",
        "EOS C300 Mark III",
        "EOS C80",
        "EOS C70",
        "EOS R5 C",
        "EOS R5 Mark II",
        "EOS R6 Mark II",
        "EOS R1",
      ),
      ...lenses(
        "RF 15-35mm F2.8 L IS USM",
        "RF 24-70mm F2.8 L IS USM",
        "RF 70-200mm F2.8 L IS USM Z",
        "RF 28-70mm F2 L USM",
        "RF 50mm F1.2 L USM",
        "RF 85mm F1.2 L USM",
        "RF 100mm F2.8 L Macro IS USM",
        "CN-E Sumire Prime",
        "CN-E Flex Zoom 20-50mm T2.4",
        "CN-E 18-80mm T4.4 Compact-Servo",
        "CN-E 70-200mm T4.4 Compact-Servo",
      ),
    ],
  },
  {
    id: "nikon",
    name: "Nikon",
    items: [
      ...cameras("Z9", "Z8", "Z6III", "Zf", "Z5II", "ZR"),
      ...lenses(
        "NIKKOR Z 14-24mm f/2.8 S",
        "NIKKOR Z 24-70mm f/2.8 S",
        "NIKKOR Z 70-200mm f/2.8 VR S",
        "NIKKOR Z 35mm f/1.2 S",
        "NIKKOR Z 50mm f/1.2 S",
        "NIKKOR Z 85mm f/1.2 S",
        "NIKKOR Z 105mm f/2.8 VR S Macro",
        "NIKKOR Z 135mm f/1.8 S Plena",
      ),
    ],
  },
];

/** "Sony FX6": how a picked model is named on the gear list. */
export function gearName(brand: GearBrand, model: string): string {
  return `${brand.name} ${model}`;
}
