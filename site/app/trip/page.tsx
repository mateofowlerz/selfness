import Image from "next/image";
import Link from "next/link";

const stops = [
  {
    city: "London",
    country: "UK",
    dates: "Jun 8–10",
    days: 2,
    emoji: "🇬🇧",
    transport: "SFO → LHR (direct)",
    budget: { flights: 350, accommodation: 140, food: 80, total: 570 },
    hero: {
      src: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/67/London_Skyline_%28125508655%29.jpeg/1280px-London_Skyline_%28125508655%29.jpeg",
      alt: "London skyline",
    },
    highlights: [
      {
        label: "Borough Market",
        img: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2d/London_2018_March_IMG_0663.jpg/1280px-London_2018_March_IMG_0663.jpg",
      },
      {
        label: "Tate Modern",
        img: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/00/Tate_Modern_-_Bankside_Power_Station.jpg/1280px-Tate_Modern_-_Bankside_Power_Station.jpg",
      },
      {
        label: "Shoreditch walk",
        img: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6a/View_from_Curtain_Road%2C_Shoreditch.jpg/1280px-View_from_Curtain_Road%2C_Shoreditch.jpg",
      },
      { label: "Columbia Road Flower Market", img: null },
    ],
    notes: "Transit hub. Keep it light — arrive late, leave early.",
  },
  {
    city: "San Sebastián",
    country: "Spain",
    dates: "Jun 10–13",
    days: 3,
    emoji: "🇪🇸",
    transport: "LHR → BIO (Bilbao) budget flight + bus",
    budget: { flights: 60, accommodation: 180, food: 150, total: 390 },
    hero: {
      src: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b7/San_Sebastian_aerea.jpg/1280px-San_Sebastian_aerea.jpg",
      alt: "La Concha Bay, San Sebastián aerial view",
    },
    highlights: [
      {
        label: "Bar Néstor tortilla (12:30 or 20:30 sharp)",
        img: null,
      },
      {
        label: "La Concha beach",
        img: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b7/San_Sebastian_aerea.jpg/1280px-San_Sebastian_aerea.jpg",
      },
      {
        label: "Pintxos crawl Parte Vieja",
        img: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/Pinchos_txaka_bonito.jpg/1280px-Pinchos_txaka_bonito.jpg",
      },
      {
        label: "Monte Urgull",
        img: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6c/08.06.05_SanSebastian2.JPG/1280px-08.06.05_SanSebastian2.JPG",
      },
    ],
    notes: "Best food city in Europe. Book Bar Néstor tortilla in person the morning of.",
  },
  {
    city: "Picos de Europa",
    country: "Spain",
    dates: "Jun 13–15",
    days: 2,
    emoji: "🏔️",
    transport: "Bus San Sebastián → Cangas de Onís",
    budget: { flights: 0, accommodation: 80, food: 60, total: 140 },
    hero: {
      src: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/02/Picu_Urriellu.jpg/1280px-Picu_Urriellu.jpg",
      alt: "Picu Urriellu, Picos de Europa",
    },
    highlights: [
      {
        label: "Lagos de Covadonga (book shuttle early — cars banned in summer)",
        img: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/16/Lago_Ercina_2015.jpg/1280px-Lago_Ercina_2015.jpg",
      },
      { label: "Garganta del Cares hike", img: null },
      { label: "Covadonga basilica", img: null },
    ],
    notes: "Shuttle to Lagos is essential. Private cars often prohibited Jun–Sep.",
  },
  {
    city: "Llanes",
    country: "Spain",
    dates: "Jun 15–16",
    days: 1,
    emoji: "🌊",
    transport: "Bus from Cangas de Onís",
    budget: { flights: 0, accommodation: 50, food: 40, total: 90 },
    hero: {
      src: "https://upload.wikimedia.org/wikipedia/commons/c/cc/Faro_llanes_asturias.jpg",
      alt: "Llanes lighthouse, Asturias",
    },
    highlights: [
      { label: "Playa de Torimbia", img: null },
      { label: "Cubos de la Memoria", img: null },
      { label: "Casco histórico", img: null },
    ],
    notes: "Chill coastal stop. Good base between Picos and Porto.",
  },
  {
    city: "Porto + Peneda-Gerês",
    country: "Portugal",
    dates: "Jun 16–20",
    days: 4,
    emoji: "🇵🇹",
    transport: "Bus/train Llanes → Porto",
    budget: { flights: 0, accommodation: 220, food: 160, total: 380 },
    hero: {
      src: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/Puente_Don_Luis_I%2C_Oporto%2C_Portugal%2C_2012-05-09%2C_DD_13.JPG/1280px-Puente_Don_Luis_I%2C_Oporto%2C_Portugal%2C_2012-05-09%2C_DD_13.JPG",
      alt: "Dom Luís I bridge, Porto",
    },
    highlights: [
      {
        label: "Livraria Lello",
        img: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/Lello_Bookshop_9_April_2026.jpg/1280px-Lello_Bookshop_9_April_2026.jpg",
      },
      { label: "Ribeira waterfront", img: null },
      {
        label: "Peneda-Gerês day hike (rent car for the day)",
        img: "https://upload.wikimedia.org/wikipedia/commons/b/b7/Serra_Amarela_%283998067385%29_%282%29.jpg",
      },
      {
        label: "Francesinha at Café Santiago",
        img: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/Francesinha_Sandwich_%28cropped%29.jpg/1280px-Francesinha_Sandwich_%28cropped%29.jpg",
      },
      { label: "Fado at a tasca", img: null },
    ],
    notes: "Rent a car for 1 day to do Gerês properly. Otherwise everything else is walkable.",
  },
  {
    city: "Lisbon",
    country: "Portugal",
    dates: "Jun 20–23",
    days: 3,
    emoji: "🦅",
    transport: "Train Porto → Lisbon (~3h, ~€25)",
    budget: { flights: 25, accommodation: 180, food: 120, total: 325 },
    hero: {
      src: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Lisboa_-_Portugal_%2852597836992%29.jpg/1280px-Lisboa_-_Portugal_%2852597836992%29.jpg",
      alt: "Lisbon cityscape",
    },
    highlights: [
      { label: "LX Factory Sunday market", img: null },
      {
        label: "Alfama at dusk",
        img: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/Lisbon_alfalma.jpg/1280px-Lisbon_alfalma.jpg",
      },
      {
        label: "Pastel de nata at Pastéis de Belém",
        img: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/Pasteis_de_Belem.jpg/1280px-Pasteis_de_Belem.jpg",
      },
      {
        label: "Sintra day trip",
        img: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/10/Sintra_-_Palacio_da_Pena_%2820332995770%29_%28cropped2%29.jpg/1280px-Sintra_-_Palacio_da_Pena_%2820332995770%29_%28cropped2%29.jpg",
      },
      { label: "Miradouros at sunset", img: null },
    ],
    notes: "Book Sintra early if going — gets crowded fast.",
  },
  {
    city: "Sagres / Costa Vicentina",
    country: "Portugal",
    dates: "Jun 23–26",
    days: 3,
    emoji: "🏄",
    transport: "Bus Lisbon → Lagos + car rental (3 days, ~€120)",
    budget: { flights: 0, accommodation: 180, food: 90, total: 390 },
    hero: {
      src: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/bc/SaoVicente.JPG/1280px-SaoVicente.JPG",
      alt: "Cabo de São Vicente, SW tip of Europe",
    },
    highlights: [
      { label: "Praia do Castelejo", img: null },
      {
        label: "Cabo de São Vicente (SW tip of Europe)",
        img: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/bc/SaoVicente.JPG/1280px-SaoVicente.JPG",
      },
      { label: "Praia da Bordeira", img: null },
      { label: "Odeceixe", img: null },
    ],
    notes: "Car rental for this leg is non-negotiable — buses are sparse. Rent in Lagos, drop in Faro.",
  },
  {
    city: "Tenerife",
    country: "Spain",
    dates: "Jun 26–28",
    days: 2,
    emoji: "🌋",
    transport: "Faro → TFS (Ryanair, ~€40). Land at TFS (south), not TFN (north).",
    budget: { flights: 40, accommodation: 100, food: 70, total: 210 },
    hero: {
      src: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Teide_Canadas.jpg/1280px-Teide_Canadas.jpg",
      alt: "Teide National Park, Tenerife",
    },
    highlights: [
      {
        label: "Teide National Park",
        img: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Teide_Canadas.jpg/1280px-Teide_Canadas.jpg",
      },
      {
        label: "Masca gorge hike",
        img: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Masca_-_Macizo_de_Teno_03.jpg/1280px-Masca_-_Macizo_de_Teno_03.jpg",
      },
      {
        label: "Los Gigantes cliffs",
        img: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/Los_Gigantes%2C_Tenerife%2C_Espa%C3%B1a%2C_2012-12-16%2C_DD_10.jpg/1280px-Los_Gigantes%2C_Tenerife%2C_Espa%C3%B1a%2C_2012-12-16%2C_DD_10.jpg",
      },
      {
        label: "Playa de Las Teresitas",
        img: "https://upload.wikimedia.org/wikipedia/commons/6/6c/Las_Teresitas2a.jpg",
      },
    ],
    notes: "Budget airlines → TFS (south). Puerto de la Cruz is 1h away — factor that in.",
  },
  {
    city: "Buenos Aires",
    country: "Argentina",
    dates: "Jun 28+",
    days: 0,
    emoji: "🇦🇷",
    transport: "TFS → MAD → EZE (~€480 return, booked from SF)",
    budget: { flights: 480, accommodation: 0, food: 0, total: 480 },
    hero: null,
    highlights: [{ label: "Home ✦", img: null }],
    notes: "Transatlantic leg. Book early.",
  },
];

const totalBudget = stops.reduce((sum, s) => sum + s.budget.total, 0);

export default function TripPage() {
  return (
    <main className="flex flex-col gap-12">
      <section className="flex flex-col gap-3">
        <p className="font-semibold">Europe — June 2026</p>
        <p className="text-(--muted) text-sm">~3 weeks · London → Spain → Portugal → Tenerife → Buenos Aires</p>
        <p className="text-sm">
          Total budget: <span className="font-semibold">€{totalBudget.toLocaleString()}</span> for two people
        </p>
      </section>

      <section className="flex flex-col">
        {stops.map((stop, i) => (
          <div key={stop.city} className="flex gap-6 group">
            <div className="flex flex-col items-center">
              <div
                className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                  i === 0 || i === stops.length - 1 ? "bg-(--fg)" : "bg-(--muted)"
                }`}
              />
              {i < stops.length - 1 && <div className="w-px flex-1 bg-black/10 my-1" />}
            </div>

            <div className="flex flex-col gap-3 pb-12 w-full">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="font-semibold">
                  {stop.emoji} {stop.city}
                </span>
                <span className="text-sm text-(--muted)">{stop.dates}</span>
                {stop.days > 0 && <span className="text-xs text-(--muted)">({stop.days}n)</span>}
              </div>

              <p className="text-sm text-(--muted)">{stop.transport}</p>

              {stop.hero && (
                <div className="relative w-full h-48 rounded overflow-hidden">
                  <Image
                    src={stop.hero.src}
                    alt={stop.hero.alt}
                    fill
                    unoptimized
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 600px"
                  />
                </div>
              )}

              <ul className="flex flex-col gap-2">
                {stop.highlights.map((h) => (
                  <li key={h.label} className="flex flex-col gap-1.5">
                    <div className="flex gap-2 text-sm">
                      <span className="text-(--muted) shrink-0">—</span>
                      <span>{h.label}</span>
                    </div>
                    {h.img && (
                      <div className="relative w-full h-36 rounded overflow-hidden ml-4">
                        <Image
                          src={h.img}
                          alt={h.label}
                          fill
                          unoptimized
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, 560px"
                        />
                      </div>
                    )}
                  </li>
                ))}
              </ul>

              {stop.notes && <p className="text-xs text-(--muted) italic">{stop.notes}</p>}

              {stop.budget.total > 0 && (
                <div className="flex gap-3 text-xs text-(--muted) mt-1">
                  {stop.budget.flights > 0 && <span>✈ €{stop.budget.flights}</span>}
                  {stop.budget.accommodation > 0 && <span>🛏 €{stop.budget.accommodation}</span>}
                  {stop.budget.food > 0 && <span>🍽 €{stop.budget.food}</span>}
                  <span className="font-medium text-(--fg)">= €{stop.budget.total}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-3 border-t border-black/10 pt-8">
        <p className="font-semibold text-sm">Budget breakdown</p>
        <div className="flex flex-col gap-1.5">
          {[
            {
              label: "Flights (all legs)",
              amount: stops.reduce((s, x) => s + x.budget.flights, 0),
            },
            {
              label: "Accommodation",
              amount: stops.reduce((s, x) => s + x.budget.accommodation, 0),
            },
            {
              label: "Food & activities",
              amount: stops.reduce((s, x) => s + x.budget.food, 0),
            },
          ].map((row) => (
            <div key={row.label} className="flex justify-between text-sm">
              <span className="text-(--muted)">{row.label}</span>
              <span>€{row.amount.toLocaleString()}</span>
            </div>
          ))}
          <div className="flex justify-between text-sm font-semibold border-t border-black/10 pt-2 mt-1">
            <span>Total (2 people)</span>
            <span>€{totalBudget.toLocaleString()}</span>
          </div>
        </div>
      </section>

      <Link href="/" className="text-sm text-(--muted) md:hover:text-(--fg) transition-colors">
        ← back home
      </Link>
    </main>
  );
}
