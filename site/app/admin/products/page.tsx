import fs from "node:fs";
import path from "node:path";
import Image from "next/image";
import Link from "next/link";
import DeleteButton from "./DeleteButton";
import ProductForm from "./ProductForm";

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

export default function AdminProductsPage() {
  const products = getProducts();

  return (
    <main className="flex flex-col gap-8 pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Manage Products</h1>
          <p className="text-(--muted)">Add and manage your favorite things.</p>
        </div>
        <Link
          href="/products"
          className="text-sm text-(--muted) transition-colors duration-150 ease-out md:hover:text-(--fg)"
        >
          View page →
        </Link>
      </div>

      <ProductForm />

      {products.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-medium">Existing Products</h2>
          <div className="flex flex-col gap-2">
            {products.map((product) => (
              <div key={product.id} className="flex items-center gap-4 p-3 rounded-lg bg-white border border-black/5">
                {product.image ? (
                  <div className="w-16 h-12 relative rounded overflow-hidden bg-black/5 shrink-0">
                    <Image src={product.image} alt={product.title} fill className="object-cover" sizes="64px" />
                  </div>
                ) : (
                  <div className="w-16 h-12 rounded bg-black/5 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{product.title}</p>
                  <p className="text-sm text-(--muted) truncate">{product.url}</p>
                </div>
                <DeleteButton id={product.id} />
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
