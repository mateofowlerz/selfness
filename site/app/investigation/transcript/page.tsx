import type { Metadata } from "next";
import Transcript from "./transcript";
export const metadata: Metadata = { title: "Transcript reader" };
export default function Page() {
  return <Transcript />;
}
