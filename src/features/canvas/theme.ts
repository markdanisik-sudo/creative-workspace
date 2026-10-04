import { DEFAULT_THEME, type TLThemes } from "tldraw";

// Softer, paper-like sticky notes on light backgrounds.
const LIGHT_NOTE_FILLS: Record<string, string> = {
  black: "#F4EBC9",
  grey: "#E9E9E5",
  "light-violet": "#ECE3F7",
  violet: "#DED3F2",
  blue: "#D3E0F5",
  "light-blue": "#DCEBF8",
  yellow: "#F8EBB8",
  orange: "#F7DCC2",
  green: "#CFE6CF",
  "light-green": "#DFEFD8",
  "light-red": "#F7DAD8",
  red: "#F1C6C3",
  white: "#FFFFFF",
};

const light = DEFAULT_THEME.colors.light;
const dark = DEFAULT_THEME.colors.dark;

const lightColors = { ...light } as typeof light & Record<string, unknown>;
for (const [color, noteFill] of Object.entries(LIGHT_NOTE_FILLS)) {
  const entry = (light as Record<string, unknown>)[color];
  if (entry && typeof entry === "object") {
    lightColors[color] = { ...(entry as object), noteFill, noteText: "#1d1d1f" };
  }
}

/** Canvas palette tuned to the app's design tokens. */
export const canvasThemes: Partial<TLThemes> = {
  default: {
    ...DEFAULT_THEME,
    colors: {
      light: {
        ...lightColors,
        background: "#ffffff",
        selectionStroke: "#0a84ff",
        brushStroke: "rgba(10, 132, 255, 0.5)",
        brushFill: "rgba(10, 132, 255, 0.06)",
        snap: "#ff375f",
      },
      dark: {
        ...dark,
        background: "#0b0b0b",
        selectionStroke: "#409cff",
        snap: "#ff375f",
      },
    },
  },
};
