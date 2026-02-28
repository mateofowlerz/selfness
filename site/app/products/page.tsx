import Image from "next/image";
import Link from "next/link";
import { getWishlist } from "./utils";

export default function ProductsPage() {
  const wishlist = getWishlist();

  return (
    <main className="flex flex-col gap-2">
      <header className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Wishlist</h1>
      </header>

      {wishlist.length === 0 ? (
        <p className="text-(--muted)">No wishlist items yet.</p>
      ) : (
        <div className="relative left-1/2 right-1/2 -mx-[50vw] w-screen">
          <div className="grid grid-cols-2 lg:grid-cols-4 border-t border-l border-black/90">
            {wishlist.map((item) => (
              <Link
                key={item.id}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col border-r border-b border-black/90 bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-black/40 touch-manipulation"
              >
                <div className="aspect-square overflow-hidden flex items-center justify-center p-6 sm:p-8">
                  <Image
                    src={item.image}
                    alt={item.title}
                    width={600}
                    height={600}
                    className="h-full w-full object-contain transition-transform duration-250 ease-out motion-reduce:transition-none [@media(hover:hover)_and_(pointer:fine)]:group-hover:scale-105"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 25vw"
                  />
                </div>
                <div className="flex flex-col gap-1 p-2 border-t border-black/90">
                  <p className="text-xs sm:text-sm font-medium uppercase text-black/40 italic">{item.brand}</p>
                  <p className="text-xs sm:text-sm font-medium uppercase text-black line-clamp-1">{item.title}</p>
                  {item.price && <p className="text-xs sm:text-sm font-normal text-black tabular-nums">{item.price}</p>}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
