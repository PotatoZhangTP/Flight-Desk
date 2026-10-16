"use client";
import { T, UiError } from "@/components/i18n";


import { useRef, useState, type ReactNode } from "react";
import { unstable_rethrow } from "next/navigation";

/** Keep Next's action/redirect semantics and useFormStatus; never retry a write. */
export function ServerActionForm({ action, children, className }: { action: (data: FormData) => Promise<void>; children: ReactNode; className?: string }) {
  const locked = useRef(false);
  const failed = useRef(false);
  const [error, setError] = useState("");
  return <form className={className} onSubmit={event => {
    // Block repeat events before React queues a second action for later execution.
    if (locked.current) { event.preventDefault(); return; }
    locked.current = true; failed.current = false; setError("");
  }} onReset={event => {
    // React resets uncontrolled action forms after resolution, even if our
    // transport-error handler returned normally. Keep the user's input on failure.
    if (failed.current) event.preventDefault();
  }} action={async data => {
    try { await action(data); }
    catch (error) {
      unstable_rethrow(error);
      failed.current = true;
      setError("The request could not be confirmed. Check your connection and try again.");
    } finally { locked.current = false; }
  }}>{children}{error && <p role="alert" className="mt-3 rounded-xl bg-danger-bg p-3 text-sm text-danger-fg"><UiError message={error} /></p>}</form>;
}
