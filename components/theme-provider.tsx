"use client";

import { createContext, useContext, useSyncExternalStore, type ReactNode } from "react";
import { normalizeTheme, themeStorageKey, type ThemeMode } from "@/lib/theme";

const changeEvent = "flightdesk-theme-change";
const ThemeContext = createContext<{ theme: ThemeMode; setTheme: (theme: ThemeMode) => void } | null>(null);

function snapshot() { return normalizeTheme(document.documentElement.dataset.theme); }
function serverSnapshot(): ThemeMode { return "system"; }
function subscribe(onChange: () => void) {
  function storage(event: StorageEvent) {
    if (event.key !== themeStorageKey && event.key !== null) return;
    if (event.storageArea) {
      try { if (event.storageArea !== window.localStorage) return; } catch { return; }
    }
    document.documentElement.dataset.theme = normalizeTheme(event.newValue);
    onChange();
  }
  window.addEventListener(changeEvent, onChange);
  window.addEventListener("storage", storage);
  return () => { window.removeEventListener(changeEvent, onChange); window.removeEventListener("storage", storage); };
}
function setTheme(value: ThemeMode) {
  const theme = normalizeTheme(value);
  document.documentElement.dataset.theme = theme;
  try { localStorage.setItem(themeStorageKey, theme); } catch { /* Keep an in-memory choice when storage is blocked. */ }
  window.dispatchEvent(new Event(changeEvent));
}
export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("Theme controls require the root ThemeProvider.");
  return context;
}
