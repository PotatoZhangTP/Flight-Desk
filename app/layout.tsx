import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { themeInitScript } from "@/lib/theme";
import { NavigationFeedback } from "@/components/navigation-feedback";
import { MutationFeedback } from "@/components/mutation-feedback";
import { Suspense } from "react";
export const metadata: Metadata = { title: "Flight Desk — Your flying, clearly logged", description: "A simple, personal flight logbook for pilots and frequent flyers." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en" data-theme="system" suppressHydrationWarning><head><script id="flightdesk-theme-init" dangerouslySetInnerHTML={{ __html: themeInitScript }} /></head><body><ThemeProvider><NavigationFeedback>{children}<Suspense fallback={null}><MutationFeedback /></Suspense></NavigationFeedback></ThemeProvider></body></html>; }
