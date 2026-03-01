"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LABEL_MAP: Record<string, string> = {
  products: "Wishlist",
  admin: "Admin",
  images: "Images",
};

function toLabel(segment: string): string {
  if (LABEL_MAP[segment]) return LABEL_MAP[segment];
  return segment
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function Breadcrumbs() {
  const pathname = usePathname();

  if (pathname === "/") return null;

  const segments = pathname.split("/").filter(Boolean);

  return (
    <nav aria-label="Breadcrumb" className="md:hidden pt-4 text-sm text-(--muted)">
      <ol className="flex items-center gap-1">
        <li>
          <Link href="/" className="hover:text-(--fg) transition-colors">
            Home
          </Link>
        </li>
        {segments.map((segment, i) => {
          const href = `/${segments.slice(0, i + 1).join("/")}`;
          const isLast = i === segments.length - 1;

          return (
            <li key={href} className="flex items-center gap-1">
              <span>/</span>
              {isLast ? (
                <span className="text-(--fg)">{toLabel(segment)}</span>
              ) : (
                <Link href={href} className="hover:text-(--fg) transition-colors">
                  {toLabel(segment)}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
