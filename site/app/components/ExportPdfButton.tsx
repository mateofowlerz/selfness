"use client";

import { usePathname } from "next/navigation";

export default function ExportPdfButton() {
  const pathname = usePathname();
  if (pathname !== "/cv") return null;

  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="text-sm text-(--muted) md:hover:text-(--fg) transition-colors print:hidden cursor-pointer"
    >
      Export as PDF
    </button>
  );
}
