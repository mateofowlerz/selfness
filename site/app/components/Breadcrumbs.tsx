"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LABEL_MAP: Record<string, string> = {
  wishlist: "Wishlist",
  "about-startups": "Repeated startup advice",
  admin: "Admin",
  images: "Images",
  cv: "CV",
};

const INVESTIGATION_LABELS: Record<string, string> = {
  search: "Regex & tags",
  semantic: "Semantic search",
  episodes: "Episodes",
  transcript: "Transcript",
};

function toLabel(segment: string): string {
  if (LABEL_MAP[segment]) return LABEL_MAP[segment];
  return segment.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function Breadcrumbs() {
  const pathname = usePathname();

  if (pathname === "/") return null;

  const segments = pathname.split("/").filter(Boolean);
  const isInvestigation = segments[0] === "investigation";

  return (
    <nav aria-label="Breadcrumb" className="pt-4 text-sm text-(--muted)">
      <ol className="flex flex-wrap items-center gap-1">
        <li>
          <Link href="/" className="hover:text-(--fg) transition-colors">
            Home
          </Link>
        </li>
        {segments.map((segment, i) => {
          const href =
            isInvestigation && i === 0
              ? "/anthropic-cybersecurity-investigation"
              : `/${segments.slice(0, i + 1).join("/")}`;
          const isLast = i === segments.length - 1;
          const label =
            isInvestigation && i === 1 ? (INVESTIGATION_LABELS[segment] ?? toLabel(segment)) : toLabel(segment);

          return (
            <li key={href} className="flex items-center gap-1">
              <span aria-hidden="true">/</span>
              {isLast ? (
                <span aria-current="page" className="text-(--fg)">
                  {label}
                </span>
              ) : (
                <Link href={href} className="hover:text-(--fg) transition-colors">
                  {label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
