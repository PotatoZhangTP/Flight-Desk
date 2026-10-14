import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "Flight Desk — Your flying, clearly logged", description: "A simple, personal flight logbook for pilots and frequent flyers." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
