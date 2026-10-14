import type { Metadata, Viewport } from "next";
import { APP_NAME } from "@/lib/config";
import { ServiceWorker } from "@/components/app/ServiceWorker";
import { I18nProvider } from "@/lib/i18n/client";
import { getI18n } from "@/lib/i18n/server";
import { getThemePreference } from "@/lib/preferences/server";
import { THEME_SCRIPT } from "@/lib/preferences/theme";
import "@fontsource-variable/inter";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return {
    title: { default: APP_NAME, template: `%s · ${APP_NAME}` },
    description: t("brand.tagline"),
    appleWebApp: { capable: true, title: APP_NAME, statusBarStyle: "default" },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ecebe8" },
    { media: "(prefers-color-scheme: dark)", color: "#0e0e0d" },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [{ locale }, theme] = await Promise.all([getI18n(), getThemePreference()]);
  return (
    <html
      lang={locale}
      className="h-full"
      data-theme-preference={theme}
      data-theme={theme === "system" ? undefined : theme}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-full">
        <I18nProvider locale={locale}>{children}</I18nProvider>
        <ServiceWorker />
      </body>
    </html>
  );
}
