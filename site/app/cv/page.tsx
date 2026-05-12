import Image from "next/image";
import Link from "next/link";

const built = [
	{
		title: "Scraping and crawling Agent",
		items: [
			<>
				We had to scrape all products from thousands of e-commerces that were
				custom built or with pre-defined technologies. I solved it with a{" "}
				<span className="font-semibold">computer-use based agent</span> that
				saved the navigation/scraping selectors as it discovered the site.
			</>,
		],
	},
	{
		title: "Agent-based product recommendations",
		items: [
			"We had millions of products and it made no sense to show the same products to a 20yo college undergrad man and a 35yo yoga mom. I built an agent that sees every movement you make in the app and builds hypotheses on what you might want to see next. Then it matches that natural language with products.",
		],
	},
	{
		title: "Web and mobile platforms",
		items: [
			<>
				Designed and coded the mobile React Native app and the full{" "}
				<a
					href="https://melian.com"
					target="_blank"
					rel="noopener noreferrer"
					className="font-semibold md:hover:text-primary-dark transition-colors"
				>
					web app
				</a>{" "}
				(built in Next.js) that displayed these recommendations and millions of
				products in an intuitive, fast way.
			</>,
		],
	},
];

const press = [
	{
		outlet: "Forbes",
		url: "https://www.forbesargentina.com/negocios/de-rios-silicon-valley-tienen-20-anos-rechazaron-100-veces-consiguieron-us-27-millones-n73939",
	},
	{
		outlet: "Bloomberg",
		url: "https://www.bloomberglinea.com/latinoamerica/argentina/startup-argentina-de-inteligencia-artificial-levanta-us2m-en-ronda-liderada-por-fondo-mexicano/",
	},
	{
		outlet: "Infobae",
		url: "https://www.infobae.com/economia/2025/04/20/generacion-colapinto-la-historia-de-los-emprendedores-sub-20-que-consiguieron-casi-usd-3-millones-y-quieren-triunfar-en-eeuu/",
	},
	{
		outlet: "La Nación",
		url: "https://www.lanacion.com.ar/economia/negocios/tres-jovenes-argentinos-que-usan-la-ia-para-cambiar-sus-industrias-nid12112025/",
	},
	{
		outlet: "El Cronista",
		url: "https://www.cronista.com/apertura/emprendedoress/emprender-a-los-20-anos-tres-amigos-crearon-una-app-que-sedujo-a-inversores-globales/",
	},
];

export default function CV() {
	return (
		<main className="flex flex-col gap-12">
			<section className="flex flex-col gap-6">
				<div className="relative w-40 aspect-[4/3] overflow-hidden">
					<Image
						src="/images/mateo.png"
						alt="Mateo Fowler"
						width={1024}
						height={768}
						className="h-full w-full object-cover"
						priority
					/>
				</div>
			</section>

			<p className="font-semibold">Education</p>
			<section className="flex flex-col gap-4">
				<p>
					I'm self-taught. I started tinkering with computers when I
					installed Linux at 13 and never stopped. Did some software engineering
					side gigs while I was learning to program until I started my own
					company at 17. Now I left my company and I'm learning about AI-safety
					full time to solve the most important open questions of our lifetime.
				</p>
			</section>

			<p className="font-semibold">What I built</p>
			<section className="flex flex-col gap-4">
				<p>
					At 17y I started <span className="font-semibold">Melian</span>, an
					AI-powered shopping platform. We gather all products from all online
					stores into one single place, so when you search, you don't have to
					open thousands of tabs. It's like a Pinterest for shopping.
					<br />
					<br />
					By the end of 2024 we were the third most downloaded shopping app in
					Argentina, ahead of Amazon. We made it to 300,000 MAU. We've raised{" "}
					<span className="font-semibold">~US$2.7M</span> across two rounds, the
					latest led by Hi Ventures with participation from Guillermo Rauch (CEO
					of Vercel).
				</p>
			</section>

			<p className="font-semibold">Technical achievements</p>
			<section className="flex flex-col gap-8">
				{built.map((group) => (
					<div key={group.title} className="flex flex-col gap-3">
						<p className="font-semibold text-(--muted)">{group.title}</p>
						<ul className="flex flex-col gap-3">
							{group.items.map((item, i) => (
								<li key={i} className="flex gap-3">
									<span className="text-(--muted) shrink-0">—</span>
									<span>{item}</span>
								</li>
							))}
						</ul>
					</div>
				))}
			</section>

			<p>
				I encourage you to go and try these by downloading{" "}
				<a
					href="https://melian.com"
					target="_blank"
					rel="noopener noreferrer"
					className="font-semibold md:hover:text-primary-dark transition-colors"
				>
					Melian
				</a>{" "}
				on the app store
			</p>

			<section className="flex flex-col gap-2">
				<p className="font-semibold">Press</p>
				<div className="flex flex-col gap-2">
					{press.map((item) => (
						<a
							key={item.url}
							href={item.url}
							target="_blank"
							rel="noopener noreferrer"
							className="flex items-center justify-between gap-4"
						>
							<span className="md:hover:text-primary-dark transition-colors">
								{item.outlet}
							</span>
							<span className="text-sm text-(--muted)">→</span>
						</a>
					))}
				</div>
			</section>

			<section className="flex flex-col gap-2">
				<p className="font-semibold">Get in touch</p>
				<a
					href="mailto:mateozaratefw@gmail.com"
					className="md:hover:text-primary-dark transition-colors"
				>
					mateozaratefw@gmail.com
				</a>
				<Link
					href="/"
					className="text-sm text-(--muted) md:hover:text-(--fg) transition-colors"
				>
					← back home
				</Link>
			</section>
		</main>
	);
}
