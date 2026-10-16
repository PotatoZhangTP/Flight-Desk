"use client";
import { deleteFlight } from "@/app/flights/actions";
import { SubmitButton } from "@/components/async-button";
import { T, useText } from "@/components/i18n";
export function DeleteFlightForm({ id, returnTo = "/dashboard" }: { id: string; returnTo?: string }) { const t=useText(); return <form action={async formData => { await deleteFlight(id, formData); }} onSubmit={event => { if (!window.confirm(t("Delete This Flight? This Action Cannot Be Undone."))) event.preventDefault(); }}><input type="hidden" name="returnTo" value={returnTo}/><SubmitButton busyLabel="Deleting Flight…" className="rounded-full border border-danger-line px-3 py-2 text-sm font-bold text-danger-fg transition hover:bg-danger-bg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger-fg"><T id="flight.delete" /></SubmitButton></form>; }
