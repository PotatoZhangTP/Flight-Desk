import { T, CmsText } from "@/components/i18n";
import Link from "@/components/navigation-link";
import Image from "@/components/localized-image";
import { UpcomingButton } from "@/components/upcoming-button";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { JourneyDemo } from "@/components/journey-demo";
import { LogbookLink } from "@/components/logbook-link";
import { RoadmapSummary } from "@/components/roadmap-cards";
import { LandingProductShowcase } from "@/components/landing-product-showcase";
import { LandingAchievementsShowcase } from "@/components/landing-achievements-showcase";
import { publishedRoadmap } from "@/lib/roadmap/server";
import { publishedLandingCopy } from "@/lib/content/server";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

async function LandingRoadmap({ copy }: { copy: Awaited<ReturnType<typeof publishedLandingCopy>> }) {
  const { items, failed } = await publishedRoadmap();
  return <RoadmapSummary items={items} failed={failed} copy={copy} />;
}

function LandingRoadmapFallback() {
  return <section className="site-container landing-section" aria-label="Roadmap loading">
    <div className="mx-auto h-10 w-56 rounded-xl skeleton-shimmer" />
    <div className="mt-7 grid gap-4 sm:grid-cols-3">
      {[0, 1, 2].map(item => <div key={item} className="h-32 rounded-2xl border border-line skeleton-shimmer" />)}
    </div>
  </section>;
}

const features = [
  {
    title: "landing.logging",
    href: "/flights/new",
    description: "landing.loggingHelp",
    icon: <><path d="M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2" /><rect x="8" y="2" width="8" height="4" rx="1" /><path d="M8 12h8m-8 5h5" /></>,
  },
  {
    title: "landing.history",
    href: "/flights",
    description: "landing.historyHelp",
    icon: <><path d="M3 11a9 9 0 1 1 2.5 7M3 4v7h7" /><path d="M12 7v5l3 2" /></>,
  },
  {
    title: "landing.simbrief",
    href: null,
    description: "landing.simbriefHelp",
    comingSoon: true,
    icon: <><path d="M14 2H6a2 2 0 0 0-2 2v16h16V8Z" /><path d="M14 2v6h6M12 18v-7m-3 3 3-3 3 3" /></>,
  },
  {
    title: "landing.passport",
    href: "/dashboard",
    description: "landing.passportHelp",
    icon: <><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 3v18m3-13h4m-4 4h4m-4 4h3" /></>,
  },
  {
    title: "landing.map",
    href: "/flight-map",
    description: "landing.mapCurrentHelp",
    icon: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" /></>,
  },
  {
    title: "landing.achievements",
    href: "/achievements",
    description: "landing.achievementsHelp",
    icon: <><circle cx="12" cy="9" r="6" /><path d="m8 14-1 8 5-3 5 3-1-8M9 9l2 2 4-4" /></>,
  },
];

export default async function HomePage() {
  const copy = await publishedLandingCopy();
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
      <div className="feature-feed mt-7">{features.map((feature, index) => <article key={feature.title} className="feature-item interaction-card relative rounded-2xl border border-line bg-surface shadow-sm shadow-ink/5">
        <span className="feature-icon inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand"><svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{feature.icon}</svg></span>
        <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 id={`feature-title-${index}`} className="text-base font-bold leading-6"><T id={feature.title} /></h3>{feature.comingSoon && <span className="rounded-full bg-brand-soft px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-brand"><T id="common.soon" /></span>}</div>
        <p className="mt-1 text-sm leading-6 text-muted"><T id={feature.description} /></p></div>
        {feature.href ? <Link href={feature.href} aria-labelledby={`feature-title-${index}`} className="absolute inset-0 rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand" /> : <UpcomingButton label={feature.title} aria-labelledby={`feature-title-${index}`} className="absolute inset-0 cursor-pointer rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand" />}
      </article>)}</div>
    </section>

    <section id="product-preview" aria-labelledby="preview-title" className="site-container landing-section">
      <div className="mx-auto text-center">
        <h2 id="preview-title" className="text-3xl font-bold tracking-tight sm:text-4xl"><T id="landing.preview" /></h2>
      </div>
      {/* Fixed static product image, independent of the live Add Flight form. */}
      <figure data-product-preview className="landing-preview mx-auto mt-6 w-full overflow-hidden rounded-2xl border border-line bg-surface shadow-sm shadow-ink/5">
        <Image src="/images/add-flight-preview.webp" alt="Add Flight product preview showing the flight ticket and empty journey detail fields." width={1024} height={800} sizes="(min-width: 1088px) 1024px, (min-width: 640px) calc(100vw - 64px), calc(100vw - 32px)" className="h-auto w-full" />
        <figcaption className="border-t border-line px-5 py-3 text-center text-xs leading-5 text-muted"><T id="landing.previewCaption" /></figcaption>
      </figure>
    </section>

    <LandingProductShowcase />
    <LandingAchievementsShowcase />

    <Suspense fallback={<LandingRoadmapFallback />}><LandingRoadmap copy={copy} /></Suspense>
  </main><SiteFooter copy={copy} /></div>;
}
