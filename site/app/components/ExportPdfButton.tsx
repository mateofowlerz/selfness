"use client";

import { usePathname } from "next/navigation";

export default function ExportPdfButton() {
  const pathname = usePathname();
  if (pathname !== "/cv") return null;

  const handleClick = () => {
    const original = document.title;
    document.title = "mateo-fowler";
    const restore = () => {
      document.title = original;
      window.removeEventListener("afterprint", restore);
    };
    window.addEventListener("afterprint", restore);
    window.print();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="text-sm text-(--muted) md:hover:text-(--fg) transition-colors print:hidden cursor-pointer"
    >
      Export as PDF
    </button>
  );
}
