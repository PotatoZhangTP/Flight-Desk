import { Spinner } from "./async-button";

export function RouteLoading({ label = "Loading page…" }: { label?: string }) {
  return <div className="min-h-screen bg-page px-6 py-8 text-ink">
    <div role="status" aria-live="polite" className="mx-auto flex max-w-7xl items-center gap-2 text-sm font-semibold text-brand"><Spinner />{label}</div>
    <div aria-hidden="true" className="mx-auto mt-12 max-w-6xl space-y-6">
      <div className="h-9 w-2/3 max-w-lg rounded-xl bg-surface-muted" />
      <div className="h-4 w-1/2 max-w-md rounded-lg bg-surface-muted" />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map(key => <div key={key} className="h-44 rounded-2xl border border-line bg-surface p-6"><div className="h-4 w-2/3 rounded bg-surface-muted" /><div className="mt-6 h-6 w-1/3 rounded bg-surface-muted" /></div>)}</div>
      <div className="h-56 rounded-2xl border border-line bg-surface" />
    </div>
  </div>;
}
