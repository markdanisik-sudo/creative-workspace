import type { MetadataRoute } from "next";
import { APP_NAME } from "@/lib/config";

/** Lets "Add to Home Screen" open the app full screen, like a native app. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APP_NAME,
    short_name: APP_NAME,
    start_url: "/projects",
    display: "standalone",
    background_color: "#ecebe8",
    theme_color: "#ecebe8",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
