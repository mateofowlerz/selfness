import Image from "next/image";
import { getVault } from "./utils";

export default function VaultPage() {
  const vault = getVault();

  return (
    <main className="flex flex-col gap-2">
      <header className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Vault</h1>
      </header>

      {vault.length === 0 ? (
        <p className="text-(--muted)">Nothing in the vault yet.</p>
      ) : (
        <div className="relative left-1/2 right-1/2 -mx-[50vw] w-screen">
          <div className="grid grid-cols-2 lg:grid-cols-3 border-t border-l border-black/90">
            {vault.map((item) => (
              <a
                key={item.id}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col border-r border-b border-black/90 bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-black/40 touch-manipulation"
              >
                <div className="aspect-square overflow-hidden">
                  <Image
                    src={item.image}
                    alt={item.title}
                    width={600}
                    height={600}
                    className="h-full w-full object-cover transition-transform duration-250 ease-out motion-reduce:transition-none [@media(hover:hover)_and_(pointer:fine)]:group-hover:scale-105"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 33vw"
                  />
                </div>
                <div className="flex flex-col gap-1 p-2 border-t border-black/90">
                  <p className="text-xs sm:text-sm font-medium uppercase text-black line-clamp-1">{item.title}</p>
                  {item.subtitle && (
                    <p className="text-xs sm:text-sm font-normal text-black/40 line-clamp-2">{item.subtitle}</p>
                  )}
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
