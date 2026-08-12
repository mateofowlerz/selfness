import type { Metadata } from "next";
import { getBookmarks } from "./utils";

export const metadata: Metadata = {
  title: "Bookmarks | Mateo Fowler",
};

export default function BookmarksPage() {
  const bookmarks = getBookmarks();

  return (
    <main className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Bookmarks</h1>
      </header>

      {bookmarks.length === 0 ? (
        <p className="text-(--muted)">No bookmarks yet.</p>
      ) : (
        <div className="relative left-1/2 right-1/2 -mx-[50vw] w-screen">
          <div className="grid grid-cols-1 border-t border-l border-black/90 sm:grid-cols-2">
            {bookmarks.map((bookmark) => (
              <a
                key={bookmark.id}
                href={bookmark.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex min-h-36 flex-col justify-between gap-8 border-r border-b border-black/90 bg-white p-4 text-black touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-black/40"
              >
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-medium uppercase text-black/40">{bookmark.kind}</p>
                  <h2 className="m-0 text-xl font-semibold text-black">{bookmark.title}</h2>
                  {bookmark.subtitle && <p className="text-sm text-black/50">{bookmark.subtitle}</p>}
                </div>
                <p className="truncate text-sm text-black/50 transition-colors duration-150 ease-out md:group-hover:text-black">
                  {bookmark.url}
                </p>
              </a>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
