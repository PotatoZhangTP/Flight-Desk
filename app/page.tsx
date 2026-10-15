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
    <section className="relative overflow-hidden bg-[#f7f9fc]"><div aria-hidden="true" className="pointer-events-none absolute inset-0 grid-paper opacity-50 [mask-image:linear-gradient(to_bottom,black,transparent)]" /><div className="relative mx-auto grid max-w-7xl items-center gap-14 px-6 py-16 sm:py-24 lg:grid-cols-[1fr_1fr] lg:gap-16 lg:px-12 lg:py-28">
      <div><p className="eyebrow"><span className="mr-2 inline-block h-2 w-2 rounded-full bg-[#168c82]" />For everyone who looks up.</p><h1 className="mt-7 text-5xl font-bold leading-[1.05] tracking-[-0.045em] sm:text-7xl lg:text-[76px]">Your flying,<br /><span className="text-[#168c82]">clearly logged.</span></h1><p className="mt-7 max-w-lg text-lg leading-8 text-[#486581]">From the first takeoff to the next horizon. A personal flight logbook for the journeys, aircraft and memories that make you love aviation.</p>
        <div className="mt-9 flex flex-wrap items-center gap-5"><Link href="/dashboard" className="rounded-full bg-[#e8753a] px-7 py-3.5 font-bold text-white shadow-lg shadow-orange-200/60 transition hover:-translate-y-0.5 hover:bg-[#cf5f29] active:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#e8753a]">Open your logbook ↗</Link><Link href="#features" className="text-sm font-bold text-[#486581] hover:text-[#168c82]">Explore Flight Desk ↓</Link></div><p className="mt-6 text-xs font-medium text-[#627d98]">Your own account. Your own records. Room to grow.</p>
      </div><JourneyDemo />
    </div></section>
    <section className="border-y border-[#d9e2ec] bg-white"><div className="mx-auto grid max-w-7xl gap-5 px-6 py-7 text-sm text-[#486581] sm:grid-cols-3 lg:px-12"><p><span className="mr-3 text-[#168c82]">✈</span>Designed around the journey</p><p><span className="mr-3 text-[#168c82]">◷</span>Local times, global perspective</p><p><span className="mr-3 text-[#168c82]">◎</span>Personal records stay private</p></div></section>
    <section id="features" className="mx-auto max-w-7xl scroll-mt-6 px-6 py-20 sm:py-24 lg:px-12"><div className="flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><p className="eyebrow">Your aviation companion</p><h2 className="mt-4 max-w-lg text-3xl font-bold tracking-tight sm:text-4xl">More than a list of flights.<br />A story that’s yours.</h2></div><p className="max-w-sm leading-7 text-[#627d98]">Start with a personal logbook today. Follow the roadmap as we build a broader home for aviation enthusiasts.</p></div>
      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{features.map(feature => <article key={feature.title} className="rounded-2xl border border-[#d9e2ec] bg-white p-7 transition duration-200 hover:-translate-y-1 hover:border-[#9fd8d2] hover:shadow-lg hover:shadow-[#102a43]/5"><div className="flex items-center justify-between gap-3"><span aria-hidden="true" className="grid h-11 w-11 place-items-center rounded-xl bg-[#eef5f5] text-2xl text-[#168c82]">{feature.symbol}</span><span className={`rounded-full px-3 py-1 text-xs font-semibold ${feature.state === "Planned" ? "bg-[#edf2f7] text-[#627d98]" : "bg-[#dff4f0] text-[#11675f]"}`}>{feature.state}</span></div><h3 className="mt-6 text-xl font-bold">{feature.title}</h3><p className="mt-3 text-sm leading-7 text-[#627d98]">{feature.copy}</p></article>)}</div>
    </section>
    <section id="how-it-works" className="mx-auto max-w-7xl px-6 pb-20 lg:px-12"><div className="grid gap-8 rounded-[2rem] bg-[#102a43] p-8 text-white sm:p-12 md:grid-cols-3">{[{ n: "01", title: "Make it personal", copy: "Create your account and give your aviation story a home." }, { n: "02", title: "Capture a journey", copy: "Add a flight, from its airports and local times to the aircraft you remember." }, { n: "03", title: "Keep the story growing", copy: "Revisit your records, edit the details and build your personal history." }].map(step => <div key={step.n}><p className="text-xs font-bold tracking-widest text-[#f8a779]">{step.n} / THE JOURNEY</p><h3 className="mt-4 text-xl font-bold">{step.title}</h3><p className="mt-3 text-sm leading-7 text-[#bcccdc]">{step.copy}</p></div>)}</div></section>
    <RoadmapSummary items={items} failed={failed} />
    <section className="mx-auto max-w-7xl px-6 py-20 text-center lg:px-12"><p className="eyebrow">Next stop: your next memory</p><h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">Every journey deserves a place.</h2><Link href="/dashboard" className="mt-8 inline-block rounded-full bg-[#e8753a] px-7 py-3.5 font-bold text-white transition hover:bg-[#cf5f29]">Start your logbook ↗</Link></section>
  </main><SiteFooter /></div>;
}
