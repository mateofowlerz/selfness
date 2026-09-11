import type { Metadata } from "next";
import Search from "./search";
export const metadata: Metadata = { title: "Regex & tags" };
export default function Page() {
  return <Search />;
}
