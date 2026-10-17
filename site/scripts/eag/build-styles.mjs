import fs from "node:fs/promises";
import { createRequire } from "node:module";
import tailwind from "@tailwindcss/postcss";
const require = createRequire(import.meta.url);
const postcss = createRequire(require.resolve("@tailwindcss/postcss"))("postcss");
const result = await postcss([tailwind()]).process(
  `@import "tailwindcss";
  @import "../../app/theme.css";
  @theme { --font-sans: "Public Sans", system-ui, sans-serif; }
  @source "../../app/eag";
  @source "../../public/eag";`,
  { from: new URL("entry.css", import.meta.url).pathname },
);
await fs.mkdir(new URL("../../public/eag", import.meta.url), { recursive: true });
await fs.writeFile(new URL("../../public/eag/styles.css", import.meta.url), result.css);
