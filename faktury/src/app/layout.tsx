import type { Metadata, Viewport } from "next";
import { ServiceWorker } from "@/components/app/ServiceWorker";
import { APP_NAME } from "@/lib/config";
import "@fontsource-variable/inter";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: APP_NAME, template: `%s · ${APP_NAME}` },
  description: "Fakturace, přehled příjmů a ISDOC.",
  appleWebApp: { capable: true, title: APP_NAME, statusBarStyle: "default" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ecebe8" },
    { media: "(prefers-color-scheme: dark)", color: "#0e0e0d" },
  ],
};

/** Follows the system's light/dark setting, before first paint. */
const THEME_SCRIPT = `(()=>{const m=matchMedia("(prefers-color-scheme: dark)");const s=()=>{document.documentElement.dataset.theme=m.matches?"dark":"light"};s();m.addEventListener("change",s)})()`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="cs" className="h-full" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-full">
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
