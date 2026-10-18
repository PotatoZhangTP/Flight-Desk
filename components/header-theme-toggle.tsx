"use client";

import { ThemeIcon } from "@/components/theme-controls";
import { useTheme } from "@/components/theme-provider";
import { useText } from "@/components/i18n";
import type { ThemeMode } from "@/lib/theme";

const nextTheme: Record<ThemeMode, ThemeMode> = { system: "light", light: "dark", dark: "system" };

export function HeaderThemeToggle() {
  const { theme, setTheme } = useTheme();
  const t = useText();
  const label = `${t(`settings.${theme}`)}. ${t("header.changeTheme")}`;
  return <button type="button" onClick={() => setTheme(nextTheme[theme])} title={label} aria-label={label} className="grid h-10 w-10 place-items-center rounded-full border border-line text-brand transition hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"><ThemeIcon mode={theme} /></button>;
}
