import type { Metadata } from "next";
import { cookies } from "next/headers";
import { PreferencesProvider } from "@/components/layout/preferences-provider";
import {
  parseTheme,
  parseUiLanguage,
  preferenceCookies,
} from "@/lib/i18n/preferences";
import "./globals.css";
import "@/components/assistant/evidence.css";
import "@/components/analytics/workspace.css";
import "./themes.css";
import { GeistSans } from "geist/font/sans";
export const metadata: Metadata = {
  title: "UZEX Insight AI · Market intelligence",
  description:
    "Commodity exchange analytics with grounded Uzbek and Russian AI assistance.",
};
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const saved = await cookies();
  const theme = parseTheme(saved.get(preferenceCookies.theme)?.value),
    language = parseUiLanguage(saved.get(preferenceCookies.language)?.value);
  return (
    <html
      lang={language}
      data-theme={theme}
      className={theme === "dark" ? "dark" : undefined}
    >
      <body className={GeistSans.className}>
        <PreferencesProvider initialTheme={theme} initialLanguage={language}>
          {children}
        </PreferencesProvider>
      </body>
    </html>
  );
}
