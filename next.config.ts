import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `npm run local` serves phones on the same Wi-Fi at this computer's local
  // network address; let the dev server answer them (development only).
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.*.*.*", "*.local"],
  // The floating "N" badge covers the phone's bottom tab bar.
  devIndicators: false,
};

export default nextConfig;
