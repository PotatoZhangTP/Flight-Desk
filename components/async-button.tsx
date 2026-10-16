"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useFormStatus } from "react-dom";

export function Spinner() {
  return <svg aria-hidden="true" viewBox="0 0 20 20" className="interaction-spinner h-4 w-4 shrink-0" fill="none"><circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="2" opacity=".25" /><path d="M10 3a7 7 0 0 1 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>;
}

export function AsyncButton({ busy = false, busyLabel, children, disabled, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { busy?: boolean; busyLabel: string; children: ReactNode }) {
  return <><button {...props} disabled={disabled || busy} aria-busy={busy}>
    <span className="inline-flex items-center justify-center gap-2">{busy && <Spinner />}{busy ? busyLabel : children}</span>
  </button><span role="status" className="sr-only">{busy ? busyLabel : ""}</span></>;
}

export function SubmitButton(props: Omit<Parameters<typeof AsyncButton>[0], "busy">) {
  const { pending } = useFormStatus();
  return <AsyncButton {...props} type="submit" busy={pending} />;
}
