import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { JourneyDemo } from "@/components/journey-demo";
import { RoadmapSummary } from "@/components/roadmap-cards";
import { publishedRoadmap } from "@/lib/roadmap/server";
import { publishedLandingCopy } from "@/lib/content/server";

export const dynamic = "force-dynamic";

const benefitKeys = ["logbook", "timezones", "privacy", "enthusiasts"] as const;
const directionKeys = ["logbook", "aircraft", "airports", "checklists", "maps", "mobile"] as const;

export default async function HomePage() {
  const [{ items, failed }, copy] = await Promise.all([publishedRoadmap(), publishedLandingCopy()]);
  return <div className="min-h-screen bg-page text-ink"><SiteHeader /><main>
    <section aria-labelledby="hero-title" className="mx-auto max-w-7xl px-6 pb-16 pt-20 text-center sm:pb-24 sm:pt-28 lg:px-12">
      <p className="eyebrow whitespace-pre-line">{copy["landing.hero.eyebrow"]}</p>
      <h1 id="hero-title" className="mx-auto mt-6 max-w-4xl whitespace-pre-line text-5xl font-bold leading-[1.06] tracking-[-0.045em] sm:text-7xl lg:text-[88px]">{copy["landing.hero.title"]}</h1>
      <p className="mx-auto mt-6 max-w-xl whitespace-pre-line text-base leading-7 text-muted sm:text-lg sm:leading-8">{copy["landing.hero.description"]}</p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
        <Link href="/dashboard" className="whitespace-pre-line rounded-full bg-brand px-6 py-3 font-semibold text-on-brand transition hover:-translate-y-0.5 hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand">{copy["landing.hero.primary_label"]} <span aria-hidden="true">→</span></Link>
        <Link href="#features" className="whitespace-pre-line rounded-full border border-line bg-surface px-6 py-3 font-semibold text-ink transition hover:border-line-strong hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand">{copy["landing.hero.secondary_label"]} <span aria-hidden="true">↓</span></Link>
      </div>
      <div className="mt-14 text-left sm:mt-16"><JourneyDemo /></div>
    </section>

    <section id="features" aria-labelledby="benefits-title" className="mx-auto max-w-7xl scroll-mt-8 px-6 py-16 sm:py-24 lg:px-12">
      <div className="mx-auto max-w-2xl text-center"><p className="eyebrow whitespace-pre-line">{copy["landing.features.eyebrow"]}</p><h2 id="benefits-title" className="mt-4 whitespace-pre-line text-3xl font-bold tracking-tight sm:text-4xl">{copy["landing.features.title"]}</h2><p className="mx-auto mt-4 max-w-lg whitespace-pre-line leading-7 text-muted">{copy["landing.features.description"]}</p></div>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{benefitKeys.map((key, index) => <article key={key} className="rounded-2xl border border-line bg-surface p-6 shadow-sm shadow-ink/5 transition hover:border-line-strong"><span aria-hidden="true" className="text-xs font-semibold tracking-widest text-brand">0{index + 1}</span><h3 className="mt-5 whitespace-pre-line text-base font-bold leading-6">{copy[`landing.features.${key}.title`]}</h3><p className="mt-3 whitespace-pre-line text-sm leading-6 text-muted">{copy[`landing.features.${key}.description`]}</p></article>)}</div>
    </section>

    <RoadmapSummary items={items} failed={failed} copy={copy} />

    <section id="how-it-works" aria-labelledby="future-title" className="mx-auto max-w-7xl px-6 py-16 sm:py-24 lg:px-12">
      <div className="mx-auto max-w-2xl text-center"><p className="eyebrow whitespace-pre-line">{copy["landing.why.eyebrow"]}</p><h2 id="future-title" className="mt-4 whitespace-pre-line text-3xl font-bold tracking-tight sm:text-4xl">{copy["landing.why.title"]}</h2><p className="mx-auto mt-4 max-w-xl whitespace-pre-line leading-7 text-muted">{copy["landing.why.description"]}</p></div>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{directionKeys.map(key => <article key={key} className="rounded-2xl border border-line bg-surface p-6 transition hover:border-line-strong hover:shadow-sm hover:shadow-ink/5"><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="whitespace-pre-line text-base font-bold">{copy[`landing.why.${key}.title`]}</h3><span className="whitespace-pre-line rounded-full border border-line px-2.5 py-1 text-[11px] font-medium text-muted">{copy[`landing.why.${key}.status_label`]}</span></div><p className="mt-3 whitespace-pre-line text-sm leading-6 text-muted">{copy[`landing.why.${key}.description`]}</p></article>)}</div>
      <div className="mt-10 text-center"><Link href="/roadmap" className="whitespace-pre-line rounded text-sm font-semibold text-brand hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand">{copy["landing.why.link_label"]} <span aria-hidden="true">→</span></Link></div>
    </section>
  </main><SiteFooter copy={copy} /></div>;
}
