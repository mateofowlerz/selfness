import { investigationMetadata } from "../social-metadata";
import Transcript from "./transcript";
export const metadata = investigationMetadata("transcript");
export default function Page() {
  return <Transcript />;
}
