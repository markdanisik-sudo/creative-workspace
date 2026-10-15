import type { NextConfig } from "next";

/**
 * The Vercel ↔ Supabase integration may name its variables with a custom
 * prefix (e.g. NEXT_PUBLIC_STORAGE_SUPABASE_URL). Find them by suffix and
 * expose them under the names the app reads.
 */
function findEnv(...patterns: RegExp[]): string | undefined {
  for (const pattern of patterns) {
    const key = Object.keys(process.env)
      .filter((name) => pattern.test(name))
      .sort((a, b) => a.length - b.length)[0];
    if (key && process.env[key]) return process.env[key];
  }
  return undefined;
}

const supabaseUrl = findEnv(
  /^NEXT_PUBLIC_SUPABASE_URL$/,
  /^NEXT_PUBLIC_.*SUPABASE_URL$/,
  /SUPABASE_URL$/,
);
const supabaseKey = findEnv(
  /^NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY$/,
  /^NEXT_PUBLIC_.*SUPABASE_PUBLISHABLE_KEY$/,
  /^NEXT_PUBLIC_SUPABASE_ANON_KEY$/,
  /^NEXT_PUBLIC_.*SUPABASE_ANON_KEY$/,
  /SUPABASE_PUBLISHABLE_KEY$/,
  /SUPABASE_ANON_KEY$/,
);

const nextConfig: NextConfig = {
  env: {
    ...(supabaseUrl ? { NEXT_PUBLIC_SUPABASE_URL: supabaseUrl } : {}),
    ...(supabaseKey ? { NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: supabaseKey } : {}),
  },
  // `npm run local` serves phones on the same Wi-Fi at this computer's local
  // network address; let the dev server answer them (development only).
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.*.*.*", "*.local"],
  // The floating "N" badge covers the phone's bottom tab bar.
  devIndicators: false,
};

export default nextConfig;
