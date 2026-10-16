import type { MetadataRoute } from "next";
import { APP_NAME } from "@/lib/config";

/** Installs as its own app (Dock on a Mac, Home Screen on a phone). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: APP_NAME,
    short_name: APP_NAME,
    description: "Fakturace, přehled příjmů a ISDOC.",
    start_url: "/",
    display: "standalone",
    background_color: "#ecebe8",
    theme_color: "#ecebe8",
    lang: "cs",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
