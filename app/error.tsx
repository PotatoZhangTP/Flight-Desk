"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="grid min-h-screen place-items-center bg-page px-6"><section className="w-full max-w-md rounded-2xl border border-line bg-surface p-8">
    <h1 className="text-2xl font-bold">This page could not be loaded</h1>
    <p role="alert" className="mt-3 text-sm leading-6 text-muted">Check your connection and try loading the page again. If a save was interrupted, check the record before submitting it again.</p>
    <button type="button" onClick={reset} className="mt-6 rounded-full bg-brand px-5 py-3 font-semibold text-on-brand">Try loading again</button>
  </section></main>;
}
