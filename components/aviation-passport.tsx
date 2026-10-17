"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "@/components/navigation-link";
import { LocalizedDate, T } from "@/components/i18n";
import { CountryFlag } from "@/components/country-flag";
import { normalizeCountryCode } from "@/lib/country-codes";

type Flight = { id: string; flight_date: string; departure_country_code?: string | null; arrival_country_code?: string | null };
type Stamp = { code: string; first: string; latest: string; visits: number; flights: number; rotation: number; tone: string; shape: string; size: string; line: string; label: string; motif: string };
type Props = { displayName: string; memberSince: string; userId: string; flights: Flight[]; totalFlights: number; countries: number; minutes: number };
type Phase = "closed" | "opening" | "open" | "turning-forward" | "turning-backward" | "closing" | "back-cover" | "book-flipping-front";

const themes = { navy: ["#171427", "#d5b36a"], purple: ["#26163d", "#c8b6e9"], green: ["#12352d", "#d0b86b"], burgundy: ["#481d2b", "#e7c18c"], charcoal: ["#202126", "#c7c8d0"] } as const;
const hash = (value: string) => [...value].reduce((sum, character) => (sum * 31 + character.charCodeAt(0)) % 997, 0);
const stampLabels = ["ARRIVED", "ENTRY", "IMMIGRATION", "VISA", "TRANSIT"];
const stampMotifs = ["✈", "★", "⌁", "△", "≋"];

const stampSlots: Record<number, Array<[number, number]>> = {
  1: [[50, 48]],
  2: [[31, 34], [68, 65]],
  3: [[28, 28], [70, 39], [45, 73]],
  4: [[28, 25], [70, 31], [35, 69], [72, 75]],
  5: [[25, 23], [67, 25], [48, 49], [27, 75], [73, 73]],
  6: [[23, 22], [51, 29], [78, 23], [28, 70], [55, 75], [79, 66]],
};

function makeStamps(flights: Flight[]) {
  const stamps = new Map<string, Stamp>();
  for (const flight of [...flights].sort((a, b) => a.flight_date.localeCompare(b.flight_date))) for (const countryCode of [flight.departure_country_code, flight.arrival_country_code]) {
    if (!countryCode) continue;
    const code = normalizeCountryCode(countryCode), existing = stamps.get(code), seed = hash(code);
    if (!existing) stamps.set(code, { code, first: flight.flight_date, latest: flight.flight_date, visits: 1, flights: 1, rotation: seed % 25 - 12, tone: ["stamp-red", "stamp-blue", "stamp-green", "stamp-purple", "stamp-slate", "stamp-brown", "stamp-brass", "stamp-teal", "stamp-mauve"][seed % 9], shape: ["stamp-circle", "stamp-square", "stamp-rounded", "stamp-hex", "stamp-octagon", "stamp-ellipse", "stamp-oblong", "stamp-triangle"][seed % 8], size: ["stamp-small", "stamp-medium", "stamp-large"][seed % 3], line: ["stamp-single", "stamp-double", "stamp-dashed", "stamp-heavy", "stamp-notched"][seed % 5], label: stampLabels[seed % stampLabels.length], motif: stampMotifs[(seed * 7) % stampMotifs.length] });
    else { existing.latest = flight.flight_date; existing.flights += 1; if (existing.latest !== existing.first) existing.visits += 1; }
  }
  return [...stamps.values()];
}

export function AviationPassport({ displayName, memberSince, userId, flights, totalFlights, countries, minutes }: Props) {
  const root = useRef<HTMLElement>(null);
  const closeRequested = useRef(false);
  const [phase, setPhase] = useState<Phase>("closed");
  const [turnedSheetCount, setTurnedSheetCount] = useState(0);
  const [turningSheetIndex, setTurningSheetIndex] = useState<number | null>(null);
  const [selected, setSelected] = useState<Stamp | null>(null);
  const [customize, setCustomize] = useState(false);
  const [theme, setTheme] = useState<keyof typeof themes>("navy");
  const stamps = useMemo(() => makeStamps(flights), [flights]);
  const [cover, metal] = themes[theme];
  const stampPages = useMemo(() => {
    const pages: Stamp[][] = [];
    let page: Stamp[] = [];
    let weight = 0;
    for (const stamp of stamps) {
      const stampWeight = stamp.size === "stamp-large" ? 1.65 : stamp.size === "stamp-small" ? .85 : 1.15;
      if (page.length >= 3 && (page.length >= 6 || weight + stampWeight > 5.2)) { pages.push(page); page = []; weight = 0; }
      page.push(stamp); weight += stampWeight;
    }
    if (page.length) pages.push(page);
    return pages;
  }, [stamps]);
  const requiredVisaPageCount = Math.max(1, stampPages.length);
  const visaPageCount = Math.max(4, requiredVisaPageCount + (requiredVisaPageCount % 2));
  const visaSheetCount = visaPageCount / 2;
  const physicalSheetCount = visaSheetCount + 1;
  const passportNo = `FD-${hash(userId).toString().padStart(4, "0")}`;

  useEffect(() => { try { setTheme((localStorage.getItem("flightdesk-passport-theme") as keyof typeof themes) || "navy"); } catch {} }, []);
  const saveTheme = (next: keyof typeof themes) => { setTheme(next); try { localStorage.setItem("flightdesk-passport-theme", next); } catch {} };

  const turnForward = () => {
    if (phase !== "open" || turnedSheetCount < 1 || turnedSheetCount > physicalSheetCount) return;
    setTurningSheetIndex(turnedSheetCount - 1);
    setPhase("turning-forward");
  };
  const turnBackward = () => {
    if (phase !== "open" || turnedSheetCount <= 1) return;
    setTurningSheetIndex(turnedSheetCount - 2);
    setPhase("turning-backward");
  };
  const requestClose = () => {
    if (phase !== "open") return;
    setSelected(null);
    if (turnedSheetCount > 1) { closeRequested.current = true; turnBackward(); }
    else setPhase("closing");
  };
  const finishSheetTurn = () => {
    if (turningSheetIndex === null) return;
    const nextCount = phase === "turning-forward" ? turnedSheetCount + 1 : turnedSheetCount - 1;
    setTurnedSheetCount(nextCount);
    setTurningSheetIndex(null);
    if (!closeRequested.current) {
      setPhase(nextCount === physicalSheetCount + 1 ? "back-cover" : "open");
      return;
    }
    if (nextCount > 1) {
      setPhase("open");
      requestAnimationFrame(() => { setTurningSheetIndex(nextCount - 2); setPhase("turning-backward"); });
    } else { closeRequested.current = false; setPhase("closing"); }
  };

  useEffect(() => {
    function outside(event: PointerEvent) {
      const target = event.target as Node, book = root.current?.querySelector(".passport-book-v3");
      if (target instanceof Element && target.closest(".passport-customizer, .passport-popover, button, a")) return;
      if (root.current?.contains(target) && book && !book.contains(target)) {
        if (selected) setSelected(null);
        else if (phase === "open") requestClose();
        else if (phase === "back-cover") setPhase("book-flipping-front");
      }
    }
    document.addEventListener("pointerdown", outside); return () => document.removeEventListener("pointerdown", outside);
  }, [phase, selected, turnedSheetCount]);

  const stampPage = (index: number) => {
    const pageStamps = stampPages[index] ?? [];
    const slots = stampSlots[Math.max(1, pageStamps.length)] ?? stampSlots[6];
    return <div className="passport-page passport-stamps"><p className="passport-eyebrow"><T id="passport.stamps" /> · {index + 1}</p><div className="passport-stamp-field">{pageStamps.map((stamp, stampIndex) => {
      const slot = slots[stampIndex];
      const positionSeed = hash(`${userId}:${index}:${stamp.code}:${stampIndex}`);
      const stampMargin = stamp.shape === "stamp-triangle" ? 22 : 17;
      const x = Math.max(stampMargin, Math.min(100 - stampMargin, slot[0] + positionSeed % 5 - 2));
      const y = stamp.shape === "stamp-triangle"
        ? Math.max(21, Math.min(79, slot[1] + Math.floor(positionSeed / 5) % 5 - 2))
        : Math.max(16, Math.min(84, slot[1] + Math.floor(positionSeed / 5) % 5 - 2));
      return <button key={stamp.code} type="button" className={`passport-stamp ${stamp.tone} ${stamp.shape} ${stamp.size} ${stamp.line}`} style={{ "--stamp-x": `${x}%`, "--stamp-y": `${y}%`, "--stamp-rotation": `${stamp.rotation}deg` } as React.CSSProperties} onClick={(event) => { event.stopPropagation(); setSelected(stamp); }}><span className="passport-stamp-label">{stamp.label}</span><span className="passport-stamp-flag"><CountryFlag code={stamp.code} /></span><b>{stamp.code}</b><span className="passport-stamp-motif" aria-hidden="true">{stamp.motif}</span><span className="passport-stamp-date"><LocalizedDate value={stamp.first} /></span></button>;
    })}</div>{!stamps.length && index === 0 && <div className="passport-empty"><T id="passport.empty" /><Link href="/flights/new" className="button-primary mt-4"><T id="map.addFirstFlight" /></Link></div>}</div>;
  };
  const identityPage = <div className="passport-page passport-identity"><p className="passport-eyebrow"><T id="passport.identity" /></p><h3>Captain {displayName}</h3><dl><div><dt><T id="passport.memberSince" /></dt><dd><LocalizedDate value={memberSince} /></dd></div><div><dt><T id="passport.totalFlights" /></dt><dd>{totalFlights}</dd></div><div><dt><T id="passport.countriesVisited" /></dt><dd>{countries}</dd></div><div><dt><T id="passport.flightTime" /></dt><dd>{Math.floor(minutes / 60)}h {minutes % 60}m</dd></div><div><dt>Passport No.</dt><dd>{passportNo}</dd></div></dl></div>;
  const endingPage = <div className="passport-page passport-ending"><div className="passport-ending-rule" /><p className="passport-ending-primary"><T id="passport.endingPrimary" /></p><p className="passport-ending-secondary"><T id="passport.endingSecondary" /></p></div>;
  const blankPage = <div className="passport-page passport-blank" aria-hidden="true" />;
  const coverFace = <><img className="passport-cover-brand" src="/images/flight-desk-logo-dark.svg" alt="Flight Desk" /><span className="passport-kicker">AVIATION<br />PASSPORT</span></>;

  const handleBookClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (phase === "closed") { setPhase("opening"); return; }
    if (phase === "back-cover") {
      setTurningSheetIndex(physicalSheetCount - 1);
      setPhase("turning-backward");
      return;
    }
    if (phase !== "open" || (event.target as HTMLElement).closest("button, a")) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    if (event.clientX < bounds.left + bounds.width / 2) turnedSheetCount === 1 ? setPhase("closing") : turnBackward();
    else turnForward();
  };

  return <section ref={root} data-spine-style="crease" className="dashboard-module relative min-w-0 bg-surface" style={{ "--passport-cover": cover, "--passport-metal": metal } as React.CSSProperties}>
    <div className="flex items-center justify-between gap-3"><h2 className="text-xl font-bold"><T id="passport.title" /></h2><button type="button" className="button-secondary" onClick={() => setCustomize((value) => !value)}>◈ <T id="passport.customize" /></button></div>
    {customize && <div className="passport-customizer" role="dialog"><h3><T id="passport.customize" /></h3><p><T id="passport.coverColor" /></p><div className="flex flex-wrap gap-2">{Object.keys(themes).map((key) => <button key={key} type="button" className="passport-swatch" style={{ background: themes[key as keyof typeof themes][0] }} aria-label={key} onClick={() => saveTheme(key as keyof typeof themes)} />)}</div><button type="button" className="button-secondary mt-4" onClick={() => setCustomize(false)}><T id="common.close" /></button></div>}
    <div className="mt-4 flex min-h-[390px] items-center justify-center"><div className={`passport-stage-v3 passport-phase-${phase}`}><div className="passport-book-v3" onClick={handleBookClick}>
      <div className={`passport-front-cover-v3 ${phase} ${turnedSheetCount >= 1 ? "is-open" : ""} ${turnedSheetCount > 1 ? "is-behind" : ""}`} onAnimationEnd={(event) => { if (event.currentTarget !== event.target) return; if (phase === "opening") { setTurnedSheetCount(1); setPhase("open"); } if (phase === "closing") { setTurnedSheetCount(0); setPhase("closed"); } }}>
        <div className="passport-cover-side passport-cover-outer">{coverFace}</div><div className="passport-cover-side passport-cover-inner">{identityPage}</div>
      </div>
      {Array.from({ length: visaSheetCount }, (_, index) => {
        const stableTurned = index < turnedSheetCount - 1;
        const isTurning = index === turningSheetIndex;
        const sheetState = isTurning ? (phase === "turning-forward" ? "turning-forward" : "turning-backward") : stableTurned ? "is-turned" : "is-unturned";
        const stackLevel = stableTurned ? index + 10 : physicalSheetCount - index + 10;
        return <div key={`passport-sheet-${index}`} className={`passport-page-sheet-v3 ${sheetState}`} style={{ zIndex: isTurning ? 50 : stackLevel }} onAnimationEnd={(event) => {
          if (event.currentTarget !== event.target) return;
          if (isTurning) finishSheetTurn();
        }}>
          <div className="passport-sheet-face passport-sheet-front">{index < visaSheetCount ? stampPage(index * 2) : endingPage}</div><div className="passport-sheet-face passport-sheet-back">{index < visaSheetCount ? stampPage(index * 2 + 1) : blankPage}</div>
        </div>;
      })}
      <div className={`passport-ending-assembly-v3 ${phase === "turning-forward" && turningSheetIndex === physicalSheetCount - 1 ? "closing-to-back" : ""} ${phase === "turning-backward" && turningSheetIndex === physicalSheetCount - 1 ? "opening-from-back" : ""} ${turnedSheetCount > physicalSheetCount ? "is-closed-back" : ""}`} style={{ zIndex: turningSheetIndex === physicalSheetCount - 1 ? 50 : physicalSheetCount + 10 }} onAnimationEnd={(event) => {
        if (event.currentTarget !== event.target || turningSheetIndex !== physicalSheetCount - 1) return;
        finishSheetTurn();
      }}>
        <div className="passport-ending-sheet-v3">
          <div className="passport-ending-face passport-ending-front">{endingPage}</div>
          <div className="passport-ending-face passport-ending-back">{blankPage}</div>
        </div>
        <div className="passport-ending-back-cover-v3">
          <div className="passport-ending-cover-face passport-ending-cover-inner" aria-hidden="true" />
          <div className="passport-ending-cover-face passport-ending-cover-outer" aria-hidden="true" />
        </div>
      </div>
      <div className={`passport-closed-book-v3 ${phase === "book-flipping-front" ? "book-flipping-front" : ""}`} onAnimationEnd={(event) => {
        if (event.currentTarget !== event.target || phase !== "book-flipping-front") return;
        setTurnedSheetCount(0);
        setPhase("closed");
      }}>
        <div className="passport-closed-book-face passport-closed-book-back" aria-hidden="true" />
        <div className="passport-closed-book-face passport-closed-book-front">{coverFace}</div>
      </div>
      <div className="passport-spine-v2" />
    </div></div></div>
    {selected && <div className="passport-popover" role="dialog"><button type="button" aria-label="Close" onClick={() => setSelected(null)}>×</button><h3>{selected.code}</h3><p><T id="passport.totalVisits" />: {selected.visits}</p><p><T id="passport.firstVisit" />: <LocalizedDate value={selected.first} /></p><p><T id="passport.latestVisit" />: <LocalizedDate value={selected.latest} /></p><p><T id="passport.relatedFlights" />: {selected.flights}</p></div>}
  </section>;
}
