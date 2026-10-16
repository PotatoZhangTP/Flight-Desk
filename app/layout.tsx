import type { Metadata } from "next";
import "./globals.css";
import "maplibre-gl/dist/maplibre-gl.css";
import { ThemeProvider } from "@/components/theme-provider";
import { themeInitScript } from "@/lib/theme";
import { NavigationFeedback } from "@/components/navigation-feedback";
import { MutationFeedback } from "@/components/mutation-feedback";
import { Suspense } from "react";
import { LanguageProvider } from "@/components/i18n";
import { languageSnapshot } from "@/lib/i18n/server";
export const metadata: Metadata = { title: "Flight Desk — Your flying, clearly logged", description: "A simple, personal flight logbook for pilots and frequent flyers." };
export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { const language = await languageSnapshot(); return <html lang={language.locale} data-theme="system" suppressHydrationWarning><head><script id="flightdesk-theme-init" dangerouslySetInnerHTML={{ __html: themeInitScript }} /></head><body><LanguageProvider initialLocale={language.locale} overrides={language.overrides} accountReady={language.accountReady} initialPreferences={language.preferences}><ThemeProvider><NavigationFeedback>{children}<Suspense fallback={null}><MutationFeedback /></Suspense></NavigationFeedback></ThemeProvider></LanguageProvider></body></html>; }
