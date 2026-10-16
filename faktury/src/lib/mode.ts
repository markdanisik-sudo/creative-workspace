/**
 * The desktop app (Faktury for Mac) keeps everything in a file on the
 * computer and has no accounts; the web app uses Supabase with sign-in.
 */
export function isLocal(): boolean {
  return process.env.FAKTURY_STORE === "local";
}
