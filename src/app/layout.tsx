import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";
import "@/components/assistant/evidence.css";
import "@/components/analytics/workspace.css";
import { GeistSans } from "geist/font/sans";
export const metadata: Metadata = {
  title: "UZEX Insight AI · Market intelligence",
  description:
    "Commodity exchange analytics with grounded Uzbek and Russian AI assistance.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={GeistSans.className}>
        {children}
        <Toaster theme="dark" position="bottom-right" richColors />
      </body>
    </html>
  );
}
