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

const isProduction = process.env.NODE_ENV === "production";

/**
 * Browser-side protections on every response: no framing (clickjacking), no
 * MIME sniffing, minimal referrers, no camera/mic/location, HTTPS only.
 */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
      ...(isProduction ? ["upgrade-insecure-requests"] : []),
    ].join("; "),
  },
  ...(isProduction
    ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]
    : []),
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  env: {
    ...(supabaseUrl ? { NEXT_PUBLIC_SUPABASE_URL: supabaseUrl } : {}),
    ...(supabaseKey ? { NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: supabaseKey } : {}),
  },
  // A whole iDoklad export arrives in a few batches; give each room.
  experimental: { serverActions: { bodySizeLimit: "4mb" } },
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.*.*.*", "*.local"],
  // The floating "N" badge covers the phone's bottom tab bar.
  devIndicators: false,
};

export default nextConfig;
