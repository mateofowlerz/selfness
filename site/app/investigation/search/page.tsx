import { investigationMetadata } from "../social-metadata";
import Search from "./search";
export const metadata = investigationMetadata("search");
export default function Page() {
  return <Search />;
}
