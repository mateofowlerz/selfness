import { GoogleAnalytics } from "@next/third-parties/google";
import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import Breadcrumbs from "./components/Breadcrumbs";
import ExportPdfButton from "./components/ExportPdfButton";
import MiniPlayer from "./components/MiniPlayer";

export const metadata: Metadata = {
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
        <div className="max-w-[640px] mx-auto px-4 sm:px-8">
          <header className="pt-8 flex items-start justify-between gap-4">
            <div>
              <Link href="/" className="block no-underline">
                <div className="font-semibold text-base text-(--fg) leading-tight">Mateo Fowler</div>
              </Link>
              <div className="text-base text-(--muted) leading-tight">
                Co-founder at{" "}
                <a
                  href="https://melian.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="backlink md:hover:text-primary-dark transition-colors"
                >
                  Melian
                </a>
              </div>
            </div>
            <ExportPdfButton />
          </header>
          <Breadcrumbs />
          {children}
        </div>
        {modal}
        <MiniPlayer />
      </body>
      <GoogleAnalytics gaId="G-J0VDNT8CSG" />
    </html>
  );
}
