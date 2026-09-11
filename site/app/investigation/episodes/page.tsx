import { investigationMetadata } from "../social-metadata";
import Episodes from "./episodes";
export const metadata = investigationMetadata("episodes");
export default function Page() {
  return <Episodes />;
}
