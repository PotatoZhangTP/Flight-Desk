"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { PageLoadingScreen } from "./page-loading-screen";

const NavigationContext = createContext<(id: string, pending: boolean) => void>(() => {});
const NavigationPendingContext = createContext(false);
export const useNavigationFeedback = () => useContext(NavigationContext);
export const useNavigationPending = () => useContext(NavigationPendingContext);

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
  const pending = !!active.size;
  return <NavigationContext.Provider value={track}><NavigationPendingContext.Provider value={pending}>
    <div inert={pending} aria-busy={pending}>{children}</div>
    {pending && <PageLoadingScreen />}
  </NavigationPendingContext.Provider></NavigationContext.Provider>;
}
