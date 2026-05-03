import Link from "next/link";
import MediaSection from "./components/MediaSection";
import { getAllWritings } from "./lib/writings";

const Section = ({ children, className = "pb-[50px]" }: { children: React.ReactNode; className?: string }) => {
  return <section className={`flex flex-col gap-2 ${className}`}>{children}</section>;
};

const media = [
  {
    title: "From Entre Rios to Silicon Valley: under 20, rejected 100 times, and raised US$2.7 million",
    outlet: "Forbes",
    url: "https://www.forbesargentina.com/negocios/de-rios-silicon-valley-tienen-20-anos-rechazaron-100-veces-consiguieron-us-27-millones-n73939",
  },
  {
    title: "Argentine AI startup raises US$2 million in round led by Mexican fund",
    outlet: "Bloomberg",
    url: "https://www.bloomberglinea.com/latinoamerica/argentina/startup-argentina-de-inteligencia-artificial-levanta-us2m-en-ronda-liderada-por-fondo-mexicano/",
  },
  {
    title: "Generation Colapinto: the under-20 founders who raised nearly US$3 million and want to win in the US",
    outlet: "Infobae",
    url: "https://www.infobae.com/economia/2025/04/20/generacion-colapinto-la-historia-de-los-emprendedores-sub-20-que-consiguieron-casi-usd-3-millones-y-quieren-triunfar-en-eeuu/",
  },
  {
    title: "Under 20 and building AI-focused companies",
    outlet: "LA NACION",
    url: "https://www.lanacion.com.ar/economia/negocios/tres-jovenes-argentinos-que-usan-la-ia-para-cambiar-sus-industrias-nid12112025/",
  },
  {
    title: "Starting up at 20: three friends built an app that attracted global investors",
    outlet: "El Cronista",
    url: "https://www.cronista.com/apertura/emprendedoress/emprender-a-los-20-anos-tres-amigos-crearon-una-app-que-sedujo-a-inversores-globales/",
  },
];

export default function Home() {
  const writings = getAllWritings();

  return (
    <main className="flex flex-col gap-6">
      <Section className="pb-0">
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
      <Section className="-mt-2 pb-[50px]">
        <MediaSection items={media} />
      </Section>
      <Section>
        <Link href="/cv" className="flex justify-between items-center">
          <span className="font-semibold md:hover:text-primary-dark transition-colors">CV</span>
          <span className="text-(--muted)">→</span>
        </Link>
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
