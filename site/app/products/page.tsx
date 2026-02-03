import fs from "fs";
import path from "path";
import Image from "next/image";
import Link from "next/link";

interface Product {
	id: string;
	url: string;
	title: string;
	description: string;
	image: string;
	createdAt: string;
}

function getProducts(): Product[] {
	const productsPath = path.join(process.cwd(), "..", "products.json");
	try {
		const data = fs.readFileSync(productsPath, "utf-8");
		return JSON.parse(data);
	} catch {
		return [];
	}
}

export default function ProductsPage() {
	const products = getProducts();

	return (
		<main className="flex flex-col gap-8">
			<div className="flex flex-col gap-2">
				<h1 className="text-2xl font-semibold tracking-tight">
					Things I Love
				</h1>
				<p className="text-(--muted)">
					A curated collection of products, tools, and things that bring me joy.
				</p>
			</div>

			{products.length === 0 ? (
				<p className="text-(--muted)">No products yet.</p>
			) : (
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
					{products.map((product) => (
						<a
							key={product.id}
							href={product.url}
							target="_blank"
							rel="noopener noreferrer"
							className="group block rounded-xl overflow-hidden bg-white border border-black/5 transition-shadow duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 md:hover:shadow-lg"
						>
							<div className="aspect-[4/3] relative overflow-hidden bg-black/5">
								{product.image && (
									<Image
										src={product.image}
										alt={product.title}
										fill
										className="object-cover transition-transform duration-300 ease-out md:group-hover:scale-105"
										sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
									/>
								)}
							</div>
							<div className="p-4">
								<h2 className="font-medium text-base leading-tight mb-1 transition-colors duration-150 ease-out md:group-hover:text-primary">
									{product.title}
								</h2>
								<p className="text-sm text-(--muted) line-clamp-2">
									{product.description}
								</p>
							</div>
						</a>
					))}
				</div>
			)}

			<Link
				href="/admin/products"
				className="fixed bottom-6 right-6 w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center shadow-lg transition-all duration-200 ease-out md:hover:bg-primary-dark md:hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
				aria-label="Add new product"
			>
				<svg
					width="24"
					height="24"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
				>
					<line x1="12" y1="5" x2="12" y2="19" />
					<line x1="5" y1="12" x2="19" y2="12" />
				</svg>
			</Link>
		</main>
	);
}
