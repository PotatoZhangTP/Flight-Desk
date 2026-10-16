"use client";
import { T, useText } from "@/components/i18n";


import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";

/** The save actions redirect only after success; never report optimistic success. */
export function MutationFeedback() {
  const t = useText();
  const path = usePathname();
  const query = useSearchParams();
  const key = path + "?" + query.toString();
  const [dismissed, setDismissed] = useState("");
  const message = path === "/dashboard" && query.get("created") === "1" ? "Flight saved successfully."
    : path === "/dashboard" && query.get("password_updated") === "1" ? "Password updated successfully."
    : /^\/flights\/[^/]+$/.test(path) && query.get("updated") === "1" ? "Flight updated successfully." : "";
  if (!message || dismissed === key) return null;
  return <div role="status" className="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-md items-center justify-between gap-4 rounded-xl border border-brand/30 bg-elevated p-4 text-sm font-semibold text-ink shadow-lg"><span><span aria-hidden="true" className="mr-2 text-brand">✓</span><T source={message} /></span><button type="button" aria-label={t("Dismiss notification")} onClick={() => setDismissed(key)} className="rounded-lg px-2 py-1 text-muted">×</button></div>;
}
