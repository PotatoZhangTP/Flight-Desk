"use client";

import type { ReactNode } from "react";

export function UpcomingButton({ children, className, label }: { children?: ReactNode; className?: string; label?: string }) {
  return <button type="button" aria-label={label} className={className} onClick={() => window.alert("该功能即将上线，敬请期待")}>{children}</button>;
}
