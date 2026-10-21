import { T } from "@/components/i18n";
import { LogbookLink } from "@/components/logbook-link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pricing — Flight Desk", description: "All currently available Flight Desk features are free." };

const includedFeatures = [
  "pricing.logging",
  "pricing.map",
  "pricing.passport",
  "pricing.achievements",
  "pricing.challenges",
  "pricing.preferences",
];

export default function PricingPage() {
  return <div className="min-h-screen bg-page text-ink">
    <SiteHeader />
    <main className="site-container py-10 sm:py-16 lg:py-20">
      <section aria-labelledby="pricing-title" className="relative overflow-hidden rounded-[2rem] border border-line bg-surface px-5 py-12 text-center shadow-xl shadow-brand/5 sm:px-10 sm:py-16">
        <div aria-hidden="true" className="pointer-events-none absolute -left-24 -top-28 h-72 w-72 rounded-full bg-brand-soft/70 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-36 -right-20 h-80 w-80 rounded-full bg-brand/10 blur-3xl" />
        <div className="relative mx-auto max-w-3xl">
          <p className="eyebrow"><T id="pricing.eyebrow" /></p>
          <h1 id="pricing-title" className="mt-5 text-balance text-4xl font-bold tracking-[-0.04em] sm:text-6xl"><T id="pricing.title" /></h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-muted sm:text-lg"><T id="pricing.intro" /></p>
        </div>

        <article className="relative mx-auto mt-10 max-w-3xl overflow-hidden rounded-3xl border border-brand/25 bg-page/80 p-5 text-left shadow-2xl shadow-brand/10 backdrop-blur-sm sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-5 border-b border-line pb-7">
            <div>
              <span className="inline-flex rounded-full bg-brand-soft px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-brand"><T id="pricing.currentPlan" /></span>
              <h2 className="mt-4 text-3xl font-bold"><T id="pricing.free" /></h2>
              <p className="mt-2 text-sm font-semibold text-brand"><T id="pricing.foreverForNow" /></p>
            </div>
            <div className="rounded-2xl border border-brand/20 bg-surface px-5 py-4 text-right shadow-sm">
              <strong className="block text-4xl font-bold tracking-tight text-brand">$0</strong>
              <span className="text-xs font-semibold text-muted"><T id="pricing.noPayment" /></span>
            </div>
          </div>

          <p className="mt-7 text-base font-semibold leading-7"><T id="pricing.included" /></p>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {includedFeatures.map(feature => <li key={feature} className="flex min-w-0 items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 text-sm font-semibold">
              <span aria-hidden="true" className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-soft text-brand">✓</span>
              <T id={feature} />
            </li>)}
          </ul>

          <div className="mt-8 flex justify-center"><LogbookLink /></div>
        </article>
      </section>
    </main>
    <SiteFooter />
  </div>;
}
