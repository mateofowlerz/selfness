import { GoogleAnalytics } from "@next/third-parties/google";
import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import AgeSuffix from "./components/AgeSuffix";
import Breadcrumbs from "./components/Breadcrumbs";
import ExportPdfButton from "./components/ExportPdfButton";
import HeaderMark from "./components/HeaderMark";
import MiniPlayer from "./components/MiniPlayer";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ??
      (process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : "http://localhost:3000"),
  ),
  title: "Mateo Fowler",
};

export default function RootLayout({
  children,
  modal,
}: Readonly<{
  children: React.ReactNode;
  modal: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <div className="max-w-[640px] mx-auto px-4 sm:px-8 has-[[data-search-workspace]]:max-w-[1280px]">
          <header className="pt-8 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <Link href="/" className="block no-underline">
                <div className="font-semibold text-base text-(--fg) leading-tight">
                  Mateo Fowler
                  <AgeSuffix />
                </div>
              </Link>
              <div className="text-base text-(--muted) leading-tight">
                Making AI great for creatives at{" "}
                <a
                  href="https://www.krea.ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="backlink md:hover:text-primary-dark transition-colors"
                >
                  Krea
                </a>
              </div>
              <Breadcrumbs />
            </div>
            <HeaderMark />
            <ExportPdfButton />
          </header>
          {children}
        </div>
        {modal}
        <MiniPlayer />
      </body>
      <GoogleAnalytics gaId="G-J0VDNT8CSG" />
    </html>
  );
}
