"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { Spinner } from "./async-button";

const NavigationContext = createContext<(id: string, pending: boolean) => void>(() => {});
export const useNavigationFeedback = () => useContext(NavigationContext);

export function NavigationFeedback({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<Set<string>>(() => new Set());
  const track = useCallback((id: string, pending: boolean) => {
    setActive(current => {
      if (current.has(id) === pending) return current;
      const next = new Set(current);
      if (pending) next.add(id); else next.delete(id);
      return next;
    });
  }, []);
  return <NavigationContext.Provider value={track}>{children}
    {!!active.size && <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 top-0 z-[100]">
      <div className="navigation-track h-0.5 bg-brand" />
      <span className="absolute right-4 top-3 inline-flex items-center gap-2 rounded-full border border-line bg-elevated px-3 py-2 text-xs font-semibold text-brand shadow-sm"><Spinner />Opening page…</span>
    </div>}
  </NavigationContext.Provider>;
}
