import { T, CmsText } from "@/components/i18n";
import Link from "@/components/navigation-link";
import Image from "@/components/localized-image";
import { UpcomingButton } from "@/components/upcoming-button";
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
    href: "/flights/new",
    description: "Record your flights with essential journey details, including airports, dates, and aircraft information.",
    icon: <><path d="M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2" /><rect x="8" y="2" width="8" height="4" rx="1" /><path d="M8 12h8m-8 5h5" /></>,
  },
  {
    title: "Flight History",
    href: "/dashboard",
    description: "Keep your flights organized and revisit your past journeys in one place.",
    icon: <><path d="M3 11a9 9 0 1 1 2.5 7M3 4v7h7" /><path d="M12 7v5l3 2" /></>,
  },
  {
    title: "Flight Statistics",
    href: "/dashboard",
    description: "Discover insights and statistics from your personal flight history.",
    icon: <><path d="M4 3v17h17M9 15v-4m5 4V7m5 8V4" /></>,
  },
  {
    title: "Excel Import",
    href: null,
    description: "Planned: bring your past journeys together with spreadsheet imports and a review before saving.",
    icon: <><path d="M14 2H6a2 2 0 0 0-2 2v16h16V8Z" /><path d="M14 2v6h6M8 12h8m-8 4h8m-4-4v8" /></>,
  },
  {
    title: "Flight Map",
    href: null,
    description: "Planned: explore the routes and airports that shape your personal flying story on a map.",
    icon: <><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3ZM9 3v15m6-12v15" /></>,
  },
  {
    title: "Flight Checklist",
    href: null,
    description: "Planned: keep useful checklists for your aviation interests and simulator journeys in one place.",
    icon: <><path d="m3 6 2 2 4-4m-6 9 2 2 4-4M12 6h9m-9 7h9M3 20h18" /></>,
  },
];

export default async function HomePage() {
  const [{ items, failed }, copy] = await Promise.all([publishedRoadmap(), publishedLandingCopy()]);
  return <div className="landing-page min-h-screen bg-page text-ink"><SiteHeader /><main>
    <section aria-labelledby="hero-title" className="site-container landing-hero text-center">
      <p className="eyebrow whitespace-pre-line"><CmsText id="content.heroEyebrow" source={copy["landing.hero.eyebrow"]} /></p>
      <h1 id="hero-title" className="mx-auto mt-6 max-w-5xl text-balance text-4xl font-bold leading-[1.1] tracking-[-0.04em] sm:text-[clamp(2.5rem,6vw,4.75rem)]"><T id="landing.hero" /></h1>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
        <LogbookLink />
      </div>
      <div className="mt-10 text-left sm:mt-14"><JourneyDemo /></div>
      <div className="mt-8 flex justify-center">
        <Link href="#features" className="inline-flex h-12 w-52 shrink-0 items-center justify-center gap-2 rounded-full border border-line bg-surface px-4 text-sm font-bold text-ink transition hover:-translate-y-0.5 hover:border-line-strong hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand"><CmsText id="content.heroExplore" source={copy["landing.hero.secondary_label"]} /> <span aria-hidden="true">↓</span></Link>
      </div>
    </section>

    <section id="features" aria-labelledby="features-title" className="site-container landing-section scroll-mt-8">
      <h2 id="features-title" className="text-center text-3xl font-bold tracking-tight sm:text-4xl"><T id="landing.features" /></h2>
      <p className="mx-auto mt-2 max-w-2xl text-center text-base leading-7 text-muted"><T id="landing.featuresIntro" /></p>
      <div className="feature-feed mt-6">{features.map((feature, index) => <article key={feature.title} className="feature-item interaction-card relative rounded-2xl border border-line bg-surface shadow-sm shadow-ink/5">
        <span className="feature-icon inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand"><svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{feature.icon}</svg></span>
        <div className="min-w-0"><h3 id={`feature-title-${index}`} className="text-base font-bold leading-6"><T source={feature.title} /></h3>
        <p className="mt-1 text-sm leading-6 text-muted"><T source={feature.description} /></p></div>
        {feature.href ? <Link href={feature.href} aria-labelledby={`feature-title-${index}`} className="absolute inset-0 rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand" /> : <UpcomingButton label={feature.title} aria-labelledby={`feature-title-${index}`} className="absolute inset-0 cursor-pointer rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand" />}
      </article>)}</div>
    </section>

    <section id="product-preview" aria-labelledby="preview-title" className="site-container landing-section">
      <div className="mx-auto text-center">
        <h2 id="preview-title" className="text-3xl font-bold tracking-tight sm:text-4xl"><T id="landing.preview" /></h2>
        <p className="mx-auto mt-2 max-w-3xl text-base leading-7 text-muted"><T id="landing.previewHelp" /></p>
      </div>
      {/* Fixed static product image, independent of the live Add Flight form. */}
      <figure data-product-preview className="landing-preview mx-auto mt-6 w-full overflow-hidden rounded-2xl border border-line bg-surface shadow-sm shadow-ink/5">
        <Image src="/images/add-flight-preview.webp" alt="Add Flight product preview showing the flight ticket and empty journey detail fields." width={1024} height={800} sizes="(min-width: 1088px) 1024px, (min-width: 640px) calc(100vw - 64px), calc(100vw - 32px)" className="h-auto w-full" unoptimized />
        <figcaption className="border-t border-line px-5 py-3 text-center text-xs leading-5 text-muted"><T id="landing.previewCaption" /></figcaption>
      </figure>
    </section>

    <RoadmapSummary items={items} failed={failed} copy={copy} />
  </main><SiteFooter copy={copy} /></div>;
}
