import Link from "next/link";
import { getAllWritings } from "./lib/writings";

const Section = ({ children }: { children: React.ReactNode }) => {
  return <section className="flex flex-col gap-2 pb-[50px]">{children}</section>;
};

export default function Home() {
  const writings = getAllWritings();

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
          , a company that&apos;s building the best shopping experience ever made.
        </p>
      </Section>
      <Section>
        <Link href="/products" className="flex justify-between items-center">
          <span className="font-semibold md:hover:text-primary-dark transition-colors">Wishlist</span>
          <span className="text-(--muted)">→</span>
        </Link>
      </Section>
      {writings.length > 0 ? (
        <Section>
          <p className="font-semibold">Writing</p>
          <div className="flex flex-col gap-2">
            {writings.map((writing) => (
              <Link key={writing.slug} href={`/${writing.slug}`} className="flex items-center justify-between gap-4">
                <span className="md:hover:text-primary-dark transition-colors">{writing.title}</span>
                <span className="text-sm text-(--muted)">{writing.date ?? "→"}</span>
              </Link>
            ))}
          </div>
        </Section>
      ) : null}
      <Section>
        <Link href="/library" className="flex justify-between items-center">
          <span className="font-semibold md:hover:text-primary-dark transition-colors">Library</span>
          <span className="text-(--muted)">→</span>
        </Link>
      </Section>
      <Section>
        <Link href="/vault" className="flex justify-between items-center">
          <span className="font-semibold md:hover:text-primary-dark transition-colors">Vault</span>
          <span className="text-(--muted)">→</span>
        </Link>
      </Section>
    </main>
  );
}
