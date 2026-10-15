import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { JourneyDemo } from "@/components/journey-demo";
import { RoadmapSummary } from "@/components/roadmap-cards";
import { publishedRoadmap } from "@/lib/roadmap/server";

export const dynamic = "force-dynamic";

const benefits = [
  { title: "Every flight, in one place", copy: "A personal logbook for the routes, aircraft and details you want to remember." },
  { title: "Local times. Global perspective.", copy: "Keep each journey’s local times and timezones together, wherever you fly." },
  { title: "Private by default", copy: "Your flight records belong to your account. Your personal history stays private." },
  { title: "For the love of aviation", copy: "Built for enthusiasts who notice the aircraft, remember the airports and enjoy the journey." },
];

const directions = [
  { title: "Flight logbook", state: "Available", copy: "Add, revisit and edit the details of your journeys." },
  { title: "Aircraft records", state: "Available", copy: "Keep aircraft types and registrations alongside your flights." },
  { title: "Airport data", state: "Starter dataset", copy: "A verified starting collection, with global airport search planned." },
  { title: "Flight checklists", state: "Planned", copy: "A future toolkit for aviation enthusiasts and simulator pilots." },
  { title: "Maps & statistics", state: "Expansion planned", copy: "Basic statistics today. Richer insights and route maps are on the flight plan." },
  { title: "Mobile experience", state: "Planned", copy: "A dedicated app is a future direction, without a committed release date." },
];

export default async function HomePage() {
  const { items, failed } = await publishedRoadmap();
  return <div className="min-h-screen bg-page text-ink"><SiteHeader /><main>
    <section aria-labelledby="hero-title" className="mx-auto max-w-7xl px-6 pb-16 pt-20 text-center sm:pb-24 sm:pt-28 lg:px-12">
      <p className="eyebrow">For everyone who looks up.</p>
      <h1 id="hero-title" className="mx-auto mt-6 max-w-4xl text-5xl font-bold leading-[1.06] tracking-[-0.045em] sm:text-7xl lg:text-[88px]">Your Flying,{" "}<span className="block">Clearly Logged.</span></h1>
      <p className="mx-auto mt-6 max-w-xl text-base leading-7 text-muted sm:text-lg sm:leading-8">A personal home for your flying history. Capture the journeys, aircraft and memories that make you love aviation.</p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
        <Link href="/dashboard" className="rounded-full bg-brand px-6 py-3 font-semibold text-on-brand transition hover:-translate-y-0.5 hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand">Open your logbook <span aria-hidden="true">→</span></Link>
        <Link href="#features" className="rounded-full border border-line bg-surface px-6 py-3 font-semibold text-ink transition hover:border-line-strong hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand">Explore Flight Desk <span aria-hidden="true">↓</span></Link>
      </div>
      <div className="mt-14 text-left sm:mt-16"><JourneyDemo /></div>
    </section>

    <section id="features" aria-labelledby="benefits-title" className="mx-auto max-w-7xl scroll-mt-8 px-6 py-16 sm:py-24 lg:px-12">
      <div className="mx-auto max-w-2xl text-center"><p className="eyebrow">A clearer view of your flying</p><h2 id="benefits-title" className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">Keep the details.<br />Enjoy the bigger picture.</h2><p className="mx-auto mt-4 max-w-lg leading-7 text-muted">A thoughtful place to record your flights, without getting in the way of the experience.</p></div>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{benefits.map((benefit, index) => <article key={benefit.title} className="rounded-2xl border border-line bg-surface p-6 shadow-sm shadow-ink/5 transition hover:border-line-strong"><span aria-hidden="true" className="text-xs font-semibold tracking-widest text-brand">0{index + 1}</span><h3 className="mt-5 text-base font-bold leading-6">{benefit.title}</h3><p className="mt-3 text-sm leading-6 text-muted">{benefit.copy}</p></article>)}</div>
    </section>

    <RoadmapSummary items={items} failed={failed} />

    <section id="how-it-works" aria-labelledby="future-title" className="mx-auto max-w-7xl px-6 py-16 sm:py-24 lg:px-12">
      <div className="mx-auto max-w-2xl text-center"><p className="eyebrow">Why Flight Desk</p><h2 id="future-title" className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">A logbook today.<br />More possibilities ahead.</h2><p className="mx-auto mt-4 max-w-xl leading-7 text-muted">Start with your flight history. Follow along as Flight Desk grows into a broader home for aviation enthusiasts.</p></div>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{directions.map(direction => <article key={direction.title} className="rounded-2xl border border-line bg-surface p-6 transition hover:border-line-strong hover:shadow-sm hover:shadow-ink/5"><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-base font-bold">{direction.title}</h3><span className="rounded-full border border-line px-2.5 py-1 text-[11px] font-medium text-muted">{direction.state}</span></div><p className="mt-3 text-sm leading-6 text-muted">{direction.copy}</p></article>)}</div>
      <div className="mt-10 text-center"><Link href="/roadmap" className="rounded text-sm font-semibold text-brand hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand">Follow the product roadmap <span aria-hidden="true">→</span></Link></div>
    </section>
  </main><SiteFooter /></div>;
}
