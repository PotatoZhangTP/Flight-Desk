"use client";
import { T } from "@/components/i18n";


export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="grid min-h-screen place-items-center bg-page px-6"><section className="w-full max-w-md rounded-2xl border border-line bg-surface p-8">
    <h1 className="text-2xl font-bold"><T id="common.errorTitle" /></h1>
    <p role="alert" className="mt-3 text-sm leading-6 text-muted"><T id="common.errorHelp" /></p>
    <button type="button" onClick={reset} className="mt-6 rounded-full bg-brand px-5 py-3 font-semibold text-on-brand"><T id="common.retry" /></button>
  </section></main>;
}
