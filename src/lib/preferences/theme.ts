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
  // Status bar / browser chrome colour follows the app's theme, not just the OS.
  const paintChrome = () => {
    const color = root.dataset.theme === "dark" ? "#0e0e0d" : "#ecebe8";
    document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
      meta.removeAttribute("media");
      meta.setAttribute("content", color);
    });
  };
  const apply = () => {
    const pref = root.dataset.themePreference || "system";
    root.dataset.theme = pref === "system" ? (media.matches ? "dark" : "light") : pref;
    paintChrome();
  };
  apply();
  document.addEventListener("DOMContentLoaded", paintChrome);
  media.addEventListener("change", apply);
  window.__applyTheme = apply;
})();`;
