"use client";
import { deleteFlight } from "@/app/flights/actions";
import { SubmitButton } from "@/components/async-button";
import { T, useText } from "@/components/i18n";
export function DeleteFlightForm({ id, returnTo = "/dashboard", className = "" }: { id: string; returnTo?: string; className?: string }) { const t=useText(); return <form action={async formData => { await deleteFlight(id, formData); }} onSubmit={event => { if (!window.confirm(t("Delete This Flight? This Action Cannot Be Undone."))) event.preventDefault(); }}><input type="hidden" name="returnTo" value={returnTo}/><SubmitButton busyLabel="Deleting Flight…" className={`button-danger min-w-32 ${className}`}><T id="flight.delete" /></SubmitButton></form>; }
