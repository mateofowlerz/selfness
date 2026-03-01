import Link from "next/link";

const Section = ({ children }: { children: React.ReactNode }) => {
	return (
		<section className="flex flex-col gap-2 pb-[50px]">{children}</section>
	);
};

export default function Home() {
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
