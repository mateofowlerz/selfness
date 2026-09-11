import { investigationMetadata } from "../social-metadata";
import Semantic from "./semantic";
export const metadata = investigationMetadata("semantic");
export default function Page() {
  return <Semantic />;
}
