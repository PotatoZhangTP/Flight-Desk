"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "@/components/navigation-link";
import { LocalizedDate, T } from "@/components/i18n";

type Flight = { id: string; flight_date: string; departure_country_code?: string | null; arrival_country_code?: string | null };
type Stamp = { code: string; first: string; latest: string; visits: number; flights: number; rotation: number; tone: string; shape: string };
type Props = { displayName: string; memberSince: string; userId: string; flights: Flight[]; totalFlights: number; countries: number; minutes: number };
type Phase = "closed" | "opening" | "open" | "turning-forward" | "turning-backward" | "closing";
type Direction = "forward" | "backward";

const themes = { navy: ["#171427", "#d5b36a"], purple: ["#26163d", "#c8b6e9"], green: ["#12352d", "#d0b86b"], burgundy: ["#481d2b", "#e7c18c"], charcoal: ["#202126", "#c7c8d0"] } as const;
const hash = (value: string) => [...value].reduce((sum, character) => (sum * 31 + character.charCodeAt(0)) % 997, 0);

function makeStamps(flights: Flight[]) {
  const stamps = new Map<string, Stamp>();
  for (const flight of [...flights].sort((a, b) => a.flight_date.localeCompare(b.flight_date))) for (const countryCode of [flight.departure_country_code, flight.arrival_country_code]) {
    if (!countryCode) continue;
    const code = countryCode.toUpperCase(), existing = stamps.get(code), seed = hash(code);
    if (!existing) stamps.set(code, { code, first: flight.flight_date, latest: flight.flight_date, visits: 1, flights: 1, rotation: seed % 17 - 8, tone: ["stamp-red", "stamp-blue", "stamp-green", "stamp-purple"][seed % 4], shape: ["stamp-circle", "stamp-square", "stamp-triangle", "stamp-hex"][seed % 4] });
    else { existing.latest = flight.flight_date; existing.flights += 1; if (existing.latest !== existing.first) existing.visits += 1; }
  }
  return [...stamps.values()];
}

export function AviationPassport({ displayName, memberSince, userId, flights, totalFlights, countries, minutes }: Props) {
  const root = useRef<HTMLElement>(null);
  const closeRequested = useRef(false);
  const [phase, setPhase] = useState<Phase>("closed");
  const [spread, setSpread] = useState(0);
  const [turnDirection, setTurnDirection] = useState<Direction | null>(null);
  const [selected, setSelected] = useState<Stamp | null>(null);
  const [customize, setCustomize] = useState(false);
  const [theme, setTheme] = useState<keyof typeof themes>("navy");
  const stamps = useMemo(() => makeStamps(flights), [flights]);
  const [cover, metal] = themes[theme];
  const maxSpread = Math.max(0, Math.ceil(Math.max(1, Math.ceil(stamps.length / 5)) / 2));
  const passportNo = `FD-${hash(userId).toString().padStart(4, "0")}`;

  useEffect(() => { try { setTheme((localStorage.getItem("flightdesk-passport-theme") as keyof typeof themes) || "navy"); } catch {} }, []);
  const saveTheme = (next: keyof typeof themes) => { setTheme(next); try { localStorage.setItem("flightdesk-passport-theme", next); } catch {} };
  const beginTurn = (direction: Direction) => {
    if (phase !== "open" || (direction === "forward" && spread >= maxSpread) || (direction === "backward" && spread <= 0)) return;
    setTurnDirection(direction); setPhase(direction === "forward" ? "turning-forward" : "turning-backward");
  };
  const requestClose = () => {
    if (phase !== "open") return;
    setSelected(null);
    if (spread > 0) { closeRequested.current = true; beginTurn("backward"); }
    else setPhase("closing");
  };
  const finishTurn = () => {
    if (!turnDirection) return;
    const nextSpread = spread + (turnDirection === "forward" ? 1 : -1);
    setSpread(nextSpread); setTurnDirection(null);
    if (!closeRequested.current) { setPhase("open"); return; }
    if (nextSpread > 0) { setPhase("open"); requestAnimationFrame(() => { setTurnDirection("backward"); setPhase("turning-backward"); }); }
    else { closeRequested.current = false; setPhase("closing"); }
  };

  useEffect(() => {
    function outside(event: PointerEvent) {
      const target = event.target as Node, book = root.current?.querySelector(".passport-book-v2");
      if (phase === "open" && root.current?.contains(target) && book && !book.contains(target)) selected ? setSelected(null) : requestClose();
    }
    document.addEventListener("pointerdown", outside); return () => document.removeEventListener("pointerdown", outside);
  }, [phase, selected, spread]);

  const stampPage = (index: number) => <div className="passport-page passport-stamps"><p className="passport-eyebrow"><T id="passport.stamps" /> · {index + 1}</p><div className="passport-stamp-field">{stamps.slice(index * 5, index * 5 + 5).map((stamp) => <button key={stamp.code} type="button" className={`passport-stamp ${stamp.tone} ${stamp.shape}`} style={{ transform: `rotate(${stamp.rotation}deg)` }} onClick={(event) => { event.stopPropagation(); setSelected(stamp); }}><b>{stamp.code}</b><span><LocalizedDate value={stamp.first} /></span></button>)}</div>{!stamps.length && <div className="passport-empty"><T id="passport.empty" /><Link href="/flights/new" className="button-primary mt-4"><T id="map.addFirstFlight" /></Link></div>}</div>;
  const identityPage = <div className="passport-page passport-identity"><p className="passport-eyebrow"><T id="passport.identity" /></p><h3>Captain {displayName}</h3><dl><div><dt><T id="passport.memberSince" /></dt><dd><LocalizedDate value={memberSince} /></dd></div><div><dt><T id="passport.totalFlights" /></dt><dd>{totalFlights}</dd></div><div><dt><T id="passport.countriesVisited" /></dt><dd>{countries}</dd></div><div><dt><T id="passport.flightTime" /></dt><dd>{Math.floor(minutes / 60)}h {minutes % 60}m</dd></div><div><dt>Passport No.</dt><dd>{passportNo}</dd></div></dl></div>;
  const coverFace = <><span className="passport-brand"><img src="/images/flight-desk-logo-dark.svg" alt="Flight Desk" /><span>Flight Desk</span></span><span className="passport-kicker">AVIATION<br />PASSPORT</span></>;
  const currentLeft = spread === 0 ? identityPage : stampPage(spread * 2 - 1), currentRight = stampPage(spread * 2);
  const targetLeft = turnDirection === "forward" ? stampPage((spread + 1) * 2 - 1) : spread <= 1 ? identityPage : stampPage((spread - 1) * 2 - 1);
  const targetRight = turnDirection === "forward" ? stampPage((spread + 1) * 2) : stampPage((spread - 1) * 2);

  return <section ref={root} className="dashboard-module relative min-w-0 bg-surface" style={{ "--passport-cover": cover, "--passport-metal": metal } as React.CSSProperties}>
    <div className="flex items-center justify-between gap-3"><h2 className="text-xl font-bold"><T id="passport.title" /></h2><button type="button" className="button-secondary" onClick={() => setCustomize((value) => !value)}>◈ <T id="passport.customize" /></button></div>
    {customize && <div className="passport-customizer" role="dialog"><h3><T id="passport.customize" /></h3><p><T id="passport.coverColor" /></p><div className="flex flex-wrap gap-2">{Object.keys(themes).map((key) => <button key={key} type="button" className="passport-swatch" style={{ background: themes[key as keyof typeof themes][0] }} aria-label={key} onClick={() => saveTheme(key as keyof typeof themes)} />)}</div><button type="button" className="button-secondary mt-4" onClick={() => setCustomize(false)}><T id="common.close" /></button></div>}
    <div className="mt-4 flex min-h-[390px] items-center justify-center"><div className={`passport-stage-v2 passport-phase-${phase}`}><div className="passport-book-v2">
      <div className="passport-static-left" onClick={() => beginTurn("backward")}>{phase === "turning-backward" ? targetLeft : currentLeft}</div>
      <div className="passport-static-right" onClick={() => beginTurn("forward")}>{phase === "turning-forward" ? targetRight : currentRight}</div>
      <div className={`passport-front-cover ${phase} ${spread > 0 ? "passport-cover-behind" : ""}`} onClick={() => phase === "closed" && setPhase("opening")} onAnimationEnd={(event) => { if (event.currentTarget !== event.target) return; if (phase === "opening") setPhase("open"); if (phase === "closing") setPhase("closed"); }}>
        <div className="passport-cover-side passport-cover-outer">{coverFace}</div><div className="passport-cover-side passport-cover-inner">{identityPage}</div>
      </div>
      {turnDirection && <div className={`passport-active-sheet ${turnDirection}`} onAnimationEnd={(event) => { if (event.currentTarget === event.target) finishTurn(); }}>
        <div className="passport-sheet-face passport-sheet-front">{turnDirection === "forward" ? currentRight : targetRight}</div>
        <div className="passport-sheet-face passport-sheet-back">{turnDirection === "forward" ? targetLeft : currentLeft}</div>
      </div>}
      <div className="passport-spine-v2" />
    </div></div></div>
    {selected && <div className="passport-popover" role="dialog"><button type="button" aria-label="Close" onClick={() => setSelected(null)}>×</button><h3>{selected.code}</h3><p><T id="passport.totalVisits" />: {selected.visits}</p><p><T id="passport.firstVisit" />: <LocalizedDate value={selected.first} /></p><p><T id="passport.latestVisit" />: <LocalizedDate value={selected.latest} /></p><p><T id="passport.relatedFlights" />: {selected.flights}</p></div>}
  </section>;
}
