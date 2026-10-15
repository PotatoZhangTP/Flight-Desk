import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { JourneyDemo } from "@/components/journey-demo";
import { LogbookLink } from "@/components/logbook-link";
import { RoadmapSummary } from "@/components/roadmap-cards";
import { publishedRoadmap } from "@/lib/roadmap/server";
import { publishedLandingCopy } from "@/lib/content/server";

export const dynamic = "force-dynamic";

const features = [
  {
    title: "Flight Logging",
    description: "Record your flights with essential journey details, including airports, dates, and aircraft information.",
    icon: <><path d="M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2" /><rect x="8" y="2" width="8" height="4" rx="1" /><path d="M8 12h8m-8 5h5" /></>,
  },
  {
    title: "Flight History",
    description: "Keep your flights organized and revisit your past journeys in one place.",
    icon: <><path d="M3 11a9 9 0 1 1 2.5 7M3 4v7h7" /><path d="M12 7v5l3 2" /></>,
  },
  {
    title: "Flight Statistics",
    description: "Discover insights and statistics from your personal flight history.",
    icon: <><path d="M4 3v17h17M9 15v-4m5 4V7m5 8V4" /></>,
  },
];

export default async function HomePage() {
  const [{ items, failed }, copy] = await Promise.all([publishedRoadmap(), publishedLandingCopy()]);
  return <div className="min-h-screen bg-page text-ink"><SiteHeader /><main>
    <section aria-labelledby="hero-title" className="mx-auto max-w-7xl px-6 pb-16 pt-20 text-center sm:pb-24 sm:pt-28 lg:px-12">
      <p className="eyebrow whitespace-pre-line">{copy["landing.hero.eyebrow"]}</p>
      <h1 id="hero-title" className="mx-auto mt-6 text-4xl font-bold leading-[1.1] tracking-[-0.04em] sm:whitespace-nowrap sm:text-[clamp(2.5rem,6vw,4.75rem)]">Every Flight Tells a Story</h1>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
        <LogbookLink />
        <Link href="#features" className="whitespace-pre-line rounded-full border border-line bg-surface px-6 py-3 font-semibold text-ink transition hover:border-line-strong hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand">{copy["landing.hero.secondary_label"]} <span aria-hidden="true">↓</span></Link>
      </div>
      <div className="mt-14 text-left sm:mt-16"><JourneyDemo /></div>
    </section>

    <section id="features" aria-labelledby="features-title" className="mx-auto max-w-7xl scroll-mt-8 px-6 py-16 sm:py-24 lg:px-12">
      <h2 id="features-title" className="text-center text-3xl font-bold tracking-tight sm:text-4xl">Built Around Your Journeys</h2>
      <div className="mt-10 grid auto-rows-fr gap-4 lg:grid-cols-3">{features.map(feature => <article key={feature.title} className="rounded-2xl border border-line bg-surface p-6 shadow-sm shadow-ink/5 transition hover:border-line-strong">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand"><svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{feature.icon}</svg></span>
        <h3 className="mt-5 text-base font-bold leading-6">{feature.title}</h3>
        <p className="mt-3 text-sm leading-6 text-muted">{feature.description}</p>
      </article>)}{[1, 2, 3].map(slot => <div key={slot} aria-hidden="true" data-feature-slot className="min-h-48 rounded-2xl border border-line bg-surface p-6 shadow-sm shadow-ink/5" />)}</div>
    </section>

    <section id="product-preview" aria-labelledby="preview-title" className="mx-auto max-w-7xl px-6 py-16 sm:py-24 lg:px-12">
      <div className="mx-auto text-center">
        <h2 id="preview-title" className="text-3xl font-bold tracking-tight sm:text-4xl">Your Flights. All in One Place</h2>
        <p className="mx-auto mt-4 text-base leading-7 text-muted lg:whitespace-nowrap">A clearer way to organize your journeys, revisit past flights, and explore your flight history.</p>
      </div>
      {/* Reserved for a real Dashboard capture; no synthetic product imagery. */}
      <div aria-hidden="true" data-product-preview className="mt-10 aspect-[16/10] w-full rounded-2xl border border-line bg-surface shadow-sm shadow-ink/5 sm:aspect-video" />
    </section>

    <RoadmapSummary items={items} failed={failed} copy={copy} />
  </main><SiteFooter copy={copy} /></div>;
}
