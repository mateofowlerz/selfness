import type { Metadata } from "next";
import Semantic from "./semantic";
export const metadata: Metadata = { title: "Semantic search" };
export default function Page() {
  return <Semantic />;
}
