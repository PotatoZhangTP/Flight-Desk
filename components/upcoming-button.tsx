"use client";

import type { ReactNode } from "react";
import { useText } from "./i18n";

export function UpcomingButton({ children, className, label }: { children?: ReactNode; className?: string; label?: string }) {
  const t = useText();
  return <button type="button" aria-label={label ? t(label) : undefined} className={className} onClick={() => window.alert(t("common.upcomingNotice"))}>{children}</button>;
}
