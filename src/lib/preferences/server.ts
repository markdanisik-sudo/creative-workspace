import "server-only";
import { cookies } from "next/headers";
import { isThemePreference, THEME_COOKIE, type ThemePreference } from "./theme";

export async function getThemePreference(): Promise<ThemePreference> {
  const saved = (await cookies()).get(THEME_COOKIE)?.value;
  return isThemePreference(saved) ? saved : "system";
}
