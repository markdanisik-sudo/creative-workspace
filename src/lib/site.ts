import "server-only";
import { headers } from "next/headers";

/**
 * The origin links in emails and invitations should point at:
 * NEXT_PUBLIC_SITE_URL when set, otherwise the address of the current request
 * (works on Vercel and for phones on the local network alike).
 */
export async function siteOrigin(): Promise<string> {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const list = await headers();
  const host = list.get("x-forwarded-host") ?? list.get("host") ?? "localhost:3000";
  const local = /^(localhost|127\.|192\.168\.|10\.|172\.)/.test(host);
  const protocol = list.get("x-forwarded-proto") ?? (local ? "http" : "https");
  return `${protocol}://${host}`;
}
