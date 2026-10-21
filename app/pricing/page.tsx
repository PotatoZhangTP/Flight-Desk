import { T } from "@/components/i18n";
import Link from "@/components/navigation-link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pricing — Flight Desk", description: "All currently available Flight Desk features are free." };

const includedFeatures = [
  "landing.logging",
  "landing.history",
  "landing.simbrief",
  "landing.passport",
  "landing.map",
  "landing.achievements",
];

export default function PricingPage() {
  return <div className="min-h-screen bg-page text-ink">
    <SiteHeader />
    <main className="site-container py-10 sm:py-16 lg:py-20">
      <section aria-labelledby="pricing-title" className="px-1 text-center">
        <div className="mx-auto max-w-3xl">
          <h1 id="pricing-title" className="text-balance text-4xl font-bold tracking-[-0.04em] sm:text-6xl"><T id="pricing.titleStart" /><span className="text-brand"><T id="pricing.titleFree" /></span><T id="pricing.titleEnd" /></h1>
        </div>

        <article className="mx-auto mt-8 max-w-3xl overflow-hidden rounded-3xl border border-brand/25 bg-surface p-5 text-left shadow-2xl shadow-brand/10 sm:p-8">
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
              <span className="min-w-0"><T id={feature} /></span>
              {feature === "landing.simbrief" && <span className="ml-auto shrink-0 rounded-full bg-brand-soft px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-brand"><T id="common.soon" /></span>}
            </li>)}
          </ul>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/auth?mode=signup" className="button-primary min-w-32"><T id="pricing.register" /></Link>
            <Link href="/auth?mode=login" className="button-secondary min-w-32"><T id="pricing.login" /></Link>
          </div>
        </article>
      </section>
    </main>
    <SiteFooter />
  </div>;
}
