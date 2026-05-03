"use client";

import { usePathname } from "next/navigation";

export default function AgeSuffix() {
  const pathname = usePathname();
  if (pathname !== "/cv") return null;

  return <>, 21y</>;
}
