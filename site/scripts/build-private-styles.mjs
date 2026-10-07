import fs from "node:fs/promises";
import { createRequire } from "node:module";
import tailwind from "@tailwindcss/postcss";

const require = createRequire(import.meta.url);
const postcss = createRequire(require.resolve("@tailwindcss/postcss"))("postcss");
const result = await postcss([tailwind()]).process('@import "../app/globals.css";', {
  from: new URL("private-entry.css", import.meta.url).pathname,
});
await fs.writeFile(new URL("../public/private-post.css", import.meta.url), result.css);
