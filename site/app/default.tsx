import fs from "node:fs";
import path from "node:path";
import Link from "next/link";

export default function Default() {
  const writingsDir = path.join(process.cwd(), "..", "writings");
  const files = fs.readdirSync(writingsDir).filter((f) => f.endsWith(".md"));

  const writings = files.map((file) => ({
    slug: file.replace(".md", ""),
    title: file.replace(".md", ""),
  }));

  return (
    <main>
      <h1>writings</h1>
      <ul>
        {writings.map((w) => (
          <li key={w.slug}>
            <Link href={`/${w.slug}`}>{w.title}</Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
