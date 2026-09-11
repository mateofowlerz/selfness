"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  ["search", "Regex & tags"],
  ["semantic", "Semantic search"],
  ["episodes", "Episodes"],
  ["transcript", "Transcript"],
];
export default function Navigation() {
  const pathname = usePathname();
  return (
    <nav aria-label="Investigation tools" className="mb-9 flex flex-wrap gap-x-5 border-b border-muted/20 text-sm">
      {items.map(([path, label]) => (
        <Link
          key={path}
          href={`/investigation/${path}`}
          aria-current={pathname.endsWith(path) ? "page" : undefined}
          className={`inline-flex min-h-12 items-center border-b-2 ${pathname.endsWith(path) ? "border-primary text-primary" : "border-transparent text-muted hover:text-fg"}`}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
