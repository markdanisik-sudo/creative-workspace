export const THEMES = ["system", "light", "dark"] as const;
export type ThemePreference = (typeof THEMES)[number];
export const THEME_COOKIE = "lab-theme";

export function isThemePreference(value: unknown): value is ThemePreference {
  return typeof value === "string" && (THEMES as readonly string[]).includes(value);
}

/**
 * Runs inline in <head> before first paint: resolves "system" to light or
 * dark, sets <html data-theme>, and follows OS changes while on "system".
 */
export const THEME_SCRIPT = `(() => {
  const root = document.documentElement;
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const apply = () => {
    const pref = root.dataset.themePreference || "system";
    root.dataset.theme = pref === "system" ? (media.matches ? "dark" : "light") : pref;
  };
  apply();
  media.addEventListener("change", apply);
  window.__applyTheme = apply;
})();`;
