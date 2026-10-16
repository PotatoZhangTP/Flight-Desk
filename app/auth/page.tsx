import { T } from "@/components/i18n";
import Link from "@/components/navigation-link";
import { Brand } from "@/components/brand";
import { PreferencesMenu } from "@/components/preferences-menu";
import { AuthForm } from "@/components/auth-form";
import { AuthAircraft } from "@/components/auth-aircraft";

export default async function AuthPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  return <main className="min-h-screen bg-page text-ink"><div className="mx-auto grid min-h-screen max-w-[1440px] lg:grid-cols-[1.1fr_.9fr]">
    <section className="flex min-w-0 flex-col px-6 pb-8 pt-7 sm:px-10 lg:border-r lg:border-line lg:px-14 lg:py-10">
      <div className="flex flex-wrap items-center justify-between gap-3"><Brand /><PreferencesMenu /></div>
      <div className="mx-auto mt-12 w-full max-w-xl lg:my-auto lg:pt-14"><p className="text-xs font-bold tracking-[0.15em] text-brand"><T id="auth.logbookEyebrow" /></p><h1 className="mt-4 max-w-md text-4xl font-bold leading-[1.1] tracking-[-0.035em] sm:text-5xl"><T id="auth.keepEvery" /><br /><T id="auth.journeyView" /></h1><p className="mt-5 text-sm leading-7 text-muted"><T id="auth.capture" /></p><AuthAircraft /></div>
    </section>
    <section aria-labelledby="auth-access-title" className="flex min-w-0 items-center justify-center px-6 pb-12 pt-3 sm:px-10 lg:px-12 lg:py-12"><div className="w-full max-w-md"><Link href="/" className="mb-6 inline-block rounded text-sm font-semibold text-brand transition hover:text-brand-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand"><T id="common.backHome" /></Link><AuthForm initialError={params.error} /></div></section>
  </div></main>;
}
