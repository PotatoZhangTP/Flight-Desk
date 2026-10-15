import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { JourneyDemo } from "@/components/journey-demo";
import { RoadmapSummary } from "@/components/roadmap-cards";
import { publishedRoadmap } from "@/lib/roadmap/server";

export const dynamic = "force-dynamic";
const features = [
  { title: "Flight Logbook", symbol: "↗", state: "Available", copy: "Every flight has a story. Keep your airports, airline, aircraft, local times and notes in one personal logbook." },
  { title: "Flight Statistics", symbol: "▥", state: "Basic statistics", copy: "Review your recorded flight count and profile. Richer duration, airport and country insights are planned." },
  { title: "Aviation Profile", symbol: "◎", state: "Private profile", copy: "A home for your aviation story, biography and recorded aircraft. Public sharing is not available yet." },
  { title: "Flight Map", symbol: "⌁", state: "Planned", copy: "A new perspective on the routes you’ve flown. A personal route map is on the flight plan." },
  { title: "Excel Import", symbol: "↥", state: "Planned", copy: "Bring your history along. Spreadsheet previews and validated Excel / CSV imports are planned." },
  { title: "Flight Checklist", symbol: "☑", state: "Planned", copy: "Thoughtful checklists for aviation enthusiasts and simulator pilots. A future addition to your toolkit." },
];

export default async function HomePage() {
  const { items, failed } = await publishedRoadmap();
  return <div className="min-h-screen overflow-x-clip"><SiteHeader /><main>
    <section className="relative overflow-hidden bg-page"><div aria-hidden="true" className="pointer-events-none absolute inset-0 grid-paper opacity-50 [mask-image:linear-gradient(to_bottom,black,transparent)]" /><div className="relative mx-auto grid max-w-7xl items-center gap-14 px-6 py-16 sm:py-24 lg:grid-cols-[1fr_1fr] lg:gap-16 lg:px-12 lg:py-28">
      <div><p className="eyebrow"><span className="mr-2 inline-block h-2 w-2 rounded-full bg-brand" />For everyone who looks up.</p><h1 className="mt-7 text-5xl font-bold leading-[1.05] tracking-[-0.045em] sm:text-7xl lg:text-[76px]">Your flying,<br /><span className="text-ink">clearly logged.</span></h1><p className="mt-7 max-w-lg text-lg leading-8 text-muted">From the first takeoff to the next horizon. A personal flight logbook for the journeys, aircraft and memories that make you love aviation.</p>
        <div className="mt-9 flex flex-wrap items-center gap-5"><Link href="/dashboard" className="rounded-full bg-brand px-7 py-3.5 font-bold text-on-brand shadow-lg shadow-brand/15 transition hover:-translate-y-0.5 hover:bg-brand-hover active:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand">Open your logbook ↗</Link><Link href="#features" className="text-sm font-bold text-muted hover:text-brand">Explore Flight Desk ↓</Link></div><p className="mt-6 text-xs font-medium text-muted">Your own account. Your own records. Room to grow.</p>
      </div><JourneyDemo />
    </div></section>
    <section className="border-y border-line bg-surface"><div className="mx-auto grid max-w-7xl gap-5 px-6 py-7 text-sm text-muted sm:grid-cols-3 lg:px-12"><p><span className="mr-3 text-brand">✈</span>Designed around the journey</p><p><span className="mr-3 text-brand">◷</span>Local times, global perspective</p><p><span className="mr-3 text-brand">◎</span>Personal records stay private</p></div></section>
    <section id="features" className="mx-auto max-w-7xl scroll-mt-6 px-6 py-20 sm:py-24 lg:px-12"><div className="flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><p className="eyebrow">Your aviation companion</p><h2 className="mt-4 max-w-lg text-3xl font-bold tracking-tight sm:text-4xl">More than a list of flights.<br />A story that’s yours.</h2></div><p className="max-w-sm leading-7 text-muted">Start with a personal logbook today. Follow the roadmap as we build a broader home for aviation enthusiasts.</p></div>
      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{features.map(feature => <article key={feature.title} className="rounded-2xl border border-line bg-surface p-7 transition duration-200 hover:-translate-y-1 hover:border-line-strong hover:shadow-lg hover:shadow-ink/5"><div className="flex items-center justify-between gap-3"><span aria-hidden="true" className="grid h-11 w-11 place-items-center rounded-xl bg-page text-2xl text-brand">{feature.symbol}</span><span className={`rounded-full px-3 py-1 text-xs font-semibold ${feature.state === "Planned" ? "bg-surface-muted text-muted" : "bg-completed-bg text-completed-fg"}`}>{feature.state}</span></div><h3 className="mt-6 text-xl font-bold">{feature.title}</h3><p className="mt-3 text-sm leading-7 text-muted">{feature.copy}</p></article>)}</div>
    </section>
    <RoadmapSummary items={items} failed={failed} />
    <section id="how-it-works" className="mx-auto max-w-7xl px-6 py-20 sm:py-24 lg:px-12"><p className="eyebrow">Why Flight Desk</p><h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">Made for the way you love flying.</h2><p className="mt-4 max-w-2xl leading-7 text-muted">A considered home for your aviation story, with a product flight plan everyone can follow.</p><div className="mt-10 grid gap-8 rounded-[2rem] bg-panel p-8 text-on-panel sm:p-12 md:grid-cols-3">{[{ n: "01", title: "Your story stays yours", copy: "Your personal flight records are private. The public product roadmap is a shared view of what we’re building." }, { n: "02", title: "Built around aviation", copy: "Airports, aircraft and local times come together in a ticket-style logbook designed for aviation enthusiasts." }, { n: "03", title: "An open flight plan", copy: "Follow published milestones without signing in. See what’s completed, in progress and planned next." }].map(step => <div key={step.n}><p className="text-xs font-bold tracking-widest text-panel-accent">{step.n} / THE DIFFERENCE</p><h3 className="mt-4 text-xl font-bold">{step.title}</h3><p className="mt-3 text-sm leading-7 text-panel-muted">{step.copy}</p></div>)}</div><div className="mt-10 text-center"><Link href="/dashboard" className="inline-block rounded-full bg-brand px-7 py-3.5 font-bold text-on-brand transition hover:bg-brand-hover">Start your logbook →</Link></div></section>
  </main><SiteFooter /></div>;
}
