import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { createServerClient } from "@supabase/ssr";
import type { Database } from "./database.types";
import { supabaseUrl } from "./env";

/**
 * Local development only: signs the visitor in as the studio account so the
 * app can be used without a password. Enabled by `npm run local`, which writes
 * LAB_DEV_AUTO_SIGN_IN and the local stack's secret key to .env.local.
 * Never active in a production build.
 */
export function devAutoSignInEnabled() {
  return (
    process.env.NODE_ENV === "development" &&
    process.env.LAB_DEV_AUTO_SIGN_IN === "true" &&
    Boolean(process.env.SUPABASE_SECRET_KEY)
  );
}

const DEV_STUDIO_EMAIL = "studio@m-studio-lab.local";
let cachedEmail: string | null = null;

/** The studio account's email, creating a studio account if there is none yet. */
async function studioEmail(admin: SupabaseClient<Database>): Promise<string | null> {
  if (cachedEmail) return cachedEmail;

  const { data: studio } = await admin
    .from("studio_members")
    .select("user_id")
    .limit(1)
    .maybeSingle();
  if (studio) {
    const { data } = await admin.auth.admin.getUserById(studio.user_id);
    cachedEmail = data.user?.email ?? null;
    return cachedEmail;
  }

  // Empty database: the first account becomes the studio (see handle_new_user).
  const { error } = await admin.auth.admin.createUser({
    email: DEV_STUDIO_EMAIL,
    password: crypto.randomUUID(),
    email_confirm: true,
    user_metadata: { display_name: "Studio" },
  });
  if (error) {
    console.error("[dev-sign-in] could not create the studio account", error);
    return null;
  }
  cachedEmail = DEV_STUDIO_EMAIL;
  return cachedEmail;
}

/** A one-time sign-in token for the studio account, or null if unavailable. */
async function devStudioSignInToken(): Promise<string | null> {
  const admin = createClient<Database>(supabaseUrl, process.env.SUPABASE_SECRET_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const email = await studioEmail(admin);
  if (!email) return null;
  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (error) {
    console.error("[dev-sign-in] could not create a sign-in link", error);
    cachedEmail = null;
    return null;
  }
  return data.properties.hashed_token;
}

let queue: Promise<unknown> = Promise.resolve();

/**
 * Signs `supabase` (the request's cookie-bound client) in as the studio.
 * Runs one at a time: a new sign-in link invalidates the previous one, so
 * parallel requests would otherwise spoil each other's token.
 */
export function devSignIn(
  supabase: ReturnType<typeof createServerClient<Database>>,
): Promise<boolean> {
  const attempt = queue.then(async () => {
    const token = await devStudioSignInToken();
    if (!token) return false;
    const { error } = await supabase.auth.verifyOtp({ type: "magiclink", token_hash: token });
    if (error) console.error("[dev-sign-in] sign-in failed", error);
    return !error;
  });
  queue = attempt.catch(() => undefined);
  return attempt;
}
