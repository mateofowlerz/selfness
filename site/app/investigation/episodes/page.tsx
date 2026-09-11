import type { Metadata } from "next";
import Episodes from "./episodes";
export const metadata: Metadata = { title: "Episode timeline" };
export default function Page() {
  return <Episodes />;
}
