import Image from "next/image";
import { getLibrary } from "./utils";

export default function LibraryPage() {
  const books = getLibrary();

  return (
    <main className="flex flex-col gap-2">
      <header className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Library</h1>
      </header>

      {books.length === 0 ? (
        <p className="text-(--muted)">No books yet.</p>
      ) : (
        <div className="relative left-1/2 right-1/2 -mx-[50vw] w-screen">
          <div className="grid grid-cols-2 lg:grid-cols-4 border-t border-l border-black/90">
            {books.map((book) => {
              const Wrapper = book.url ? "a" : "div";
              const linkProps = book.url
                ? { href: book.url, target: "_blank" as const, rel: "noopener noreferrer" }
                : {};

              return (
                <Wrapper
                  key={book.id}
                  {...linkProps}
                  className="group flex flex-col border-r border-b border-black/90 bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-black/40 touch-manipulation"
                >
                  <div className="relative aspect-[2/3] overflow-hidden">
                    <Image
                      src={book.image}
                      alt={book.title}
                      width={400}
                      height={600}
                      className="h-full w-full object-cover"
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 25vw"
                    />
                  </div>
                  <div className="flex flex-col gap-1 p-2 border-t border-black/90">
                    <p className="text-xs sm:text-sm font-medium uppercase text-black/40 italic line-clamp-1">
                      {book.author}
                    </p>
                    <p className="text-xs sm:text-sm font-medium uppercase text-black line-clamp-1">
                      {book.title}
                    </p>
                  </div>
                </Wrapper>
              );
            })}
          </div>
        </div>
      )}
    </main>
  );
}
