import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { createServerClient } from "@supabase/ssr";
import type { Database } from "./database.types";
import { supabaseUrl } from "./env";

/**
 * Local development only: signs the visitor in as the studio account so the
 * app can be used without a password. On by default whenever `next dev` runs
 * against the local Supabase stack; set LAB_DEV_AUTO_SIGN_IN=false in
 * .env.local to turn it off. Never active in a production build or against a
 * hosted database.
 */
export function devAutoSignInEnabled() {
  return (
    process.env.NODE_ENV === "development" &&
    process.env.LAB_DEV_AUTO_SIGN_IN !== "false" &&
    isLocalStack()
  );
}

function isLocalStack() {
  try {
    const { hostname } = new URL(supabaseUrl);
    // This computer, or its address on the local network (phones on the same Wi-Fi).
    return (
      hostname === "127.0.0.1" ||
      hostname === "localhost" ||
      /^(192\.168|10|172\.(1[6-9]|2\d|3[01]))\./.test(hostname)
    );
  } catch {
    return false;
  }
}

let localSecretKey: Promise<string | null> | null = null;

/** The local stack's secret key: from .env.local, or asked from the Supabase CLI once. */
function secretKey(): Promise<string | null> {
  if (process.env.SUPABASE_SECRET_KEY) return Promise.resolve(process.env.SUPABASE_SECRET_KEY);
  localSecretKey ??= import("node:child_process").then(
    ({ execFile }) =>
      new Promise<string | null>((resolve) => {
        execFile(
          "npx",
          ["supabase", "status", "-o", "json"],
          { timeout: 60_000 },
          (error, stdout) => {
            if (error) {
              report("could not read the local database settings", error);
              localSecretKey = null;
              return resolve(null);
            }
            try {
              const status = JSON.parse(stdout.slice(stdout.indexOf("{")));
              resolve(status.SECRET_KEY ?? status.SERVICE_ROLE_KEY ?? null);
            } catch (parseError) {
              report("could not read the local database settings", parseError);
              localSecretKey = null;
              resolve(null);
            }
          },
        );
      }),
  );
  return localSecretKey;
}

/** Why the last automatic sign-in failed, for the sign-in page to show. */
const state = globalThis as unknown as { __labDevSignInError?: string | null };
export function lastDevSignInError() {
  return state.__labDevSignInError ?? null;
}
function report(message: string, error: unknown) {
  console.error(`[dev-sign-in] ${message}`, error);
  state.__labDevSignInError = `${message}: ${error instanceof Error ? error.message : String(error)}`;
}

const DEV_STUDIO_EMAIL = "studio@m-studio-lab.local";
let cachedEmail: string | null = null;

/**
 * The local account to sign in as: whoever ran the studio before personal
 * workspaces, else studio@m-studio-lab.local, created the first time.
 */
async function studioEmail(admin: SupabaseClient<Database>): Promise<string | null> {
  if (cachedEmail) return cachedEmail;

  const { data: studio } = await admin
    .from("studio_members")
    .select("user_id")
    .order("created_at")
    .limit(1)
    .maybeSingle();
  if (studio) {
    const { data } = await admin.auth.admin.getUserById(studio.user_id);
    cachedEmail = data.user?.email ?? null;
    return cachedEmail;
  }

  const { error } = await admin.auth.admin.createUser({
    email: DEV_STUDIO_EMAIL,
    password: crypto.randomUUID(),
    email_confirm: true,
    user_metadata: { display_name: "Studio" },
  });
  if (error && error.code !== "email_exists") {
    report("could not create the studio account", error);
    return null;
  }
  cachedEmail = DEV_STUDIO_EMAIL;
  return cachedEmail;
}

/** A one-time sign-in token for the studio account, or null if unavailable. */
async function devStudioSignInToken(): Promise<string | null> {
  const key = await secretKey();
  if (!key) return null;
  const admin = createClient<Database>(supabaseUrl, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const email = await studioEmail(admin);
  if (!email) return null;
  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (error) {
    report("could not create a sign-in link", error);
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
    if (error) report("sign-in failed", error);
    else state.__labDevSignInError = null;
    return !error;
  });
  queue = attempt.catch(() => undefined);
  return attempt;
}
