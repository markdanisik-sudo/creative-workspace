/**
 * Colour palettes for the moodboard. The film presets are hand-picked tones
 * that evoke each stock's character (shadows → highlights); they're a
 * starting point for the look, not measured from the film.
 */

export interface PaletteColor {
  hex: string;
  name?: string;
}

export interface Palette {
  colors: PaletteColor[];
  /** The preset it started from, if any. */
  preset?: string;
  notes?: string;
}

export const MAX_COLORS = 12;

export interface PalettePreset {
  id: string;
  name: string;
  /** Who makes the stock, for grouping. */
  family: "kodakMotion" | "kodakStill" | "fuji" | "other";
  colors: string[];
}

export const PALETTE_PRESETS: PalettePreset[] = [
  {
    id: "vision3-500t",
    name: "Kodak Vision3 500T 5219",
    family: "kodakMotion",
    colors: ["#0f1a1e", "#1f3a40", "#3f6a6e", "#c48a5c", "#e7b98a", "#f2e2c8"],
  },
  {
    id: "vision3-250d",
    name: "Kodak Vision3 250D 5207",
    family: "kodakMotion",
    colors: ["#1c1a17", "#4a4e3c", "#7f8a6a", "#c9a77c", "#e6cfa8", "#f5ece0"],
  },
  {
    id: "vision3-200t",
    name: "Kodak Vision3 200T 5213",
    family: "kodakMotion",
    colors: ["#14191c", "#2c4246", "#5e7b74", "#b9835d", "#dfb48e", "#efe1cf"],
  },
  {
    id: "vision3-50d",
    name: "Kodak Vision3 50D 5203",
    family: "kodakMotion",
    colors: ["#121417", "#2f4a5e", "#6f94a8", "#d0a173", "#ecd3b0", "#f7f3ea"],
  },
  {
    id: "kodak-2383",
    name: "Kodak 2383 (print film)",
    family: "kodakMotion",
    colors: ["#0b1214", "#173236", "#2f5b5a", "#a8743f", "#d9a35d", "#f1d9a8"],
  },
  {
    id: "kodak-2393",
    name: "Kodak 2393 (print film)",
    family: "kodakMotion",
    colors: ["#10171a", "#22403f", "#4b6e66", "#b07e4e", "#dcb27a", "#f2e3c2"],
  },
  {
    id: "portra-400",
    name: "Kodak Portra 400",
    family: "kodakStill",
    colors: ["#2a2522", "#6b7b6e", "#a7b7ad", "#e0b394", "#f1d2bd", "#f7ece2"],
  },
  {
    id: "portra-160",
    name: "Kodak Portra 160",
    family: "kodakStill",
    colors: ["#34302c", "#7d8c84", "#b9c6be", "#e6c2a8", "#f3dccb", "#faf3ec"],
  },
  {
    id: "ektar-100",
    name: "Kodak Ektar 100",
    family: "kodakStill",
    colors: ["#1a1c22", "#1f4f8a", "#3c8f5a", "#d8492e", "#f2b33d", "#f5efe6"],
  },
  {
    id: "gold-200",
    name: "Kodak Gold 200",
    family: "kodakStill",
    colors: ["#2b241c", "#5b6b4f", "#c79a4a", "#e7b866", "#f0d39a", "#f8ecd2"],
  },
  {
    id: "ektachrome-e100",
    name: "Kodak Ektachrome E100",
    family: "kodakStill",
    colors: ["#0d1424", "#1d4a7a", "#3f86b8", "#8cc3d9", "#e8d7b9", "#f6f6f2"],
  },
  {
    id: "kodachrome-64",
    name: "Kodachrome 64",
    family: "kodakStill",
    colors: ["#1a1414", "#7a1f1c", "#c8432e", "#2f5e8c", "#d9b46a", "#efe4cf"],
  },
  {
    id: "eterna",
    name: "Fujifilm Eterna",
    family: "fuji",
    colors: ["#161a19", "#39443f", "#6f7c74", "#a59c8a", "#cfc6b4", "#ebe7dd"],
  },
  {
    id: "velvia-50",
    name: "Fujifilm Velvia 50",
    family: "fuji",
    colors: ["#0e1a14", "#1f5c2e", "#3f9b3a", "#1e5aa8", "#e8b02a", "#f3efe2"],
  },
  {
    id: "pro-400h",
    name: "Fujifilm Pro 400H",
    family: "fuji",
    colors: ["#2d3533", "#7fa59a", "#b8d3c8", "#e2ccc0", "#f1e6df", "#f7f6f2"],
  },
  {
    id: "superia-400",
    name: "Fujifilm Superia 400",
    family: "fuji",
    colors: ["#1c2420", "#3e5f4c", "#7d9c7a", "#c9a07a", "#e5d2b8", "#f2eee4"],
  },
  {
    id: "cinestill-800t",
    name: "CineStill 800T",
    family: "other",
    colors: ["#0a0f14", "#12303b", "#1f5f6e", "#c2362b", "#f08a4b", "#f4d7b8"],
  },
  {
    id: "bleach-bypass",
    name: "Bleach bypass",
    family: "other",
    colors: ["#0c0d0d", "#2e3331", "#5b625d", "#8f948d", "#c2c4bd", "#ecebe5"],
  },
  {
    id: "ilford-hp5",
    name: "Ilford HP5 Plus (B&W)",
    family: "other",
    colors: ["#0d0d0d", "#3a3a3a", "#6b6b6b", "#9e9e9e", "#cfcfcf", "#f2f2f2"],
  },
];

export const PRESET_FAMILIES = ["kodakMotion", "kodakStill", "fuji", "other"] as const;

const HEX = /^#[0-9a-f]{6}$/;

/** "#ABC", "abcdef" → "#aabbcc"; null when it isn't a colour. */
export function normalizeHex(value: string): string | null {
  let text = value.trim().toLowerCase().replace(/^#?/, "#");
  if (/^#[0-9a-f]{3}$/.test(text)) text = `#${[...text.slice(1)].map((c) => c + c).join("")}`;
  return HEX.test(text) ? text : null;
}

/** Keeps a palette in its allowed shape (from the browser or the database). */
export function cleanPalette(value: unknown): Palette {
  const raw = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  const colors = (Array.isArray(raw.colors) ? raw.colors : [])
    .flatMap((entry): PaletteColor[] => {
      const item = (entry ?? {}) as Record<string, unknown>;
      const hex = typeof item.hex === "string" ? normalizeHex(item.hex) : null;
      if (!hex) return [];
      const name = typeof item.name === "string" ? item.name.trim().slice(0, 40) : "";
      return [name ? { hex, name } : { hex }];
    })
    .slice(0, MAX_COLORS);
  const preset =
    typeof raw.preset === "string" && PALETTE_PRESETS.some((item) => item.id === raw.preset)
      ? raw.preset
      : undefined;
  const notes = typeof raw.notes === "string" ? raw.notes.trim().slice(0, 1000) : "";
  return { colors, ...(preset ? { preset } : {}), ...(notes ? { notes } : {}) };
}

/** Black or white text, whichever reads better on the colour. */
export function inkOn(hex: string): "#000000" | "#ffffff" {
  const [r, g, b] = [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16) / 255);
  const linear = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const luminance = 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
  return luminance > 0.4 ? "#000000" : "#ffffff";
}

/**
 * The dominant colours of some pixels (k-means), darkest first. Runs in the
 * browser on downscaled moodboard images.
 */
export function dominantColors(pixels: [number, number, number][], count = 6): string[] {
  if (pixels.length === 0) return [];
  // Start from evenly spaced samples by brightness.
  const sorted = [...pixels].sort((a, b) => a[0] + a[1] + a[2] - (b[0] + b[1] + b[2]));
  let centres = Array.from(
    { length: Math.min(count, sorted.length) },
    (_, index) => sorted[Math.floor(((index + 0.5) / count) * sorted.length)],
  ).map((pixel) => [...pixel] as [number, number, number]);
  for (let round = 0; round < 10; round++) {
    const sums = centres.map(() => [0, 0, 0, 0]);
    for (const pixel of pixels) {
      let best = 0;
      let bestDistance = Infinity;
      centres.forEach((centre, index) => {
        const distance =
          (pixel[0] - centre[0]) ** 2 + (pixel[1] - centre[1]) ** 2 + (pixel[2] - centre[2]) ** 2;
        if (distance < bestDistance) {
          bestDistance = distance;
          best = index;
        }
      });
      sums[best][0] += pixel[0];
      sums[best][1] += pixel[1];
      sums[best][2] += pixel[2];
      sums[best][3] += 1;
    }
    centres = centres.map((centre, index) =>
      sums[index][3]
        ? [
            sums[index][0] / sums[index][3],
            sums[index][1] / sums[index][3],
            sums[index][2] / sums[index][3],
          ]
        : centre,
    );
  }
  const hex = (value: number) => Math.round(value).toString(16).padStart(2, "0");
  return [
    ...new Set(
      centres
        .sort((a, b) => a[0] + a[1] + a[2] - (b[0] + b[1] + b[2]))
        .map(([r, g, b]) => `#${hex(r)}${hex(g)}${hex(b)}`),
    ),
  ];
}
