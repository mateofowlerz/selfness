import fs from "node:fs";
import path from "node:path";
import Link from "next/link";

const Section = ({ children }: { children: React.ReactNode }) => {
	return (
		<section className="flex flex-col gap-2 pb-[50px]">{children}</section>
	);
};

function parseFrontmatter(content: string) {
	const match = content.match(/^---\n([\s\S]*?)\n---/);
	if (!match) return {};
	const frontmatter: Record<string, string> = {};
	match[1].split("\n").forEach((line) => {
		const [key, ...rest] = line.split(":");
		if (key && rest.length) {
			frontmatter[key.trim()] = rest.join(":").trim();
		}
	});
	return frontmatter;
}

function formatDate(dateStr: string) {
	const date = new Date(dateStr);
	return date.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

export default function Home() {
	const writingsDir = path.join(process.cwd(), "..", "writings");
	const files = fs.readdirSync(writingsDir).filter((f) => f.endsWith(".md"));

	const writings = files
		.filter((file) => file !== "beauty.md")
		.map((file) => {
			const content = fs.readFileSync(path.join(writingsDir, file), "utf-8");
			const frontmatter = parseFrontmatter(content);
			return {
				slug: file.replace(".md", ""),
				title: frontmatter.title || file.replace(".md", ""),
				date: frontmatter.date || null,
			};
		});

	return (
		<main className="flex flex-col gap-6">
			<Section>
				<p className="font-semibold ">About</p>
				<p>
					I co founded{"   "}
					{"   "}
					<a
						href="https://melian.com"
						target="_blank"
						rel="noopener noreferrer"
						className="backlink md:hover:text-primary-dark transition-colors"
					>
						Melian
					</a>
					, a company that&apos;s building the best shopping experience ever
					made.
				</p>
			</Section>
			<Section>
				<p className="font-semibold ">Writing</p>
				{writings.map((w) => (
					<Link
						key={w.slug}
						href={`/${w.slug}`}
						className="flex justify-between items-center"
					>
						<span className="md:hover:text-primary-dark transition-colors">
							{w.title.charAt(0).toUpperCase() + w.title.slice(1)}
						</span>
						{w.date && <span>{formatDate(w.date)}</span>}
					</Link>
				))}
			</Section>
			<Section>
				<Link href="/products" className="flex justify-between items-center">
					<span className="font-semibold md:hover:text-primary-dark transition-colors">
						Wishlist
					</span>
					<span className="text-(--muted)">→</span>
				</Link>
			</Section>
		</main>
	);
}
