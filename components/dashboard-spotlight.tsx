"use client";

import { useEffect } from "react";

export function DashboardSpotlight() {
  useEffect(() => {
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    if (!finePointer.matches) return;
    const move = (event: PointerEvent) => {
      const card = (event.target as Element | null)?.closest<HTMLElement>(".spotlight-card");
      if (!card) return;
      const rect = card.getBoundingClientRect();
      card.style.setProperty("--spotlight-x", `${event.clientX - rect.left}px`);
      card.style.setProperty("--spotlight-y", `${event.clientY - rect.top}px`);
      card.dataset.spotlightActive = "true";
    };
    const leave = (event: PointerEvent) => {
      const card = (event.target as Element | null)?.closest<HTMLElement>(".spotlight-card");
      if (card && !card.contains(event.relatedTarget as Node | null)) delete card.dataset.spotlightActive;
    };
    document.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerout", leave, { passive: true });
    return () => {
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerout", leave);
    };
  }, []);
  return null;
}
