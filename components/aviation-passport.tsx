"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "@/components/navigation-link";
import { LocalizedDate, T } from "@/components/i18n";
import { CountryFlag } from "@/components/country-flag";
import { normalizeCountryCode } from "@/lib/country-codes";

type Flight = { id: string; flight_date: string; departure_country_code?: string | null; arrival_country_code?: string | null };
type Stamp = { code: string; first: string; latest: string; visits: number; flights: number; rotation: number; tone: string; shape: string; size: string; line: string; motif: string; layout: string };
type Props = { displayName: string; memberSince: string; userId: string; flights: Flight[]; totalFlights: number; countries: number; minutes: number };
type Phase = "closed" | "opening" | "open" | "turning-forward" | "turning-backward" | "closing" | "back-cover" | "book-flipping-front";

const themes = { navy: ["#171427", "#d5b36a"], purple: ["#26163d", "#c8b6e9"], green: ["#12352d", "#d0b86b"], burgundy: ["#481d2b", "#e7c18c"], charcoal: ["#202126", "#c7c8d0"] } as const;
const hash = (value: string) => [...value].reduce((sum, character) => (sum * 31 + character.charCodeAt(0)) % 997, 0);
const stableRandomSeed = (value: string) => {
  let seed = 2166136261;
  for (const character of value) seed = Math.imul(seed ^ character.charCodeAt(0), 16777619);
  seed ^= seed >>> 16;
  seed = Math.imul(seed, 0x7feb352d);
  seed ^= seed >>> 15;
  seed = Math.imul(seed, 0x846ca68b);
  return (seed ^ (seed >>> 16)) >>> 0;
};
const stampMotifs = ["✈", "☾", "≋", "•••", "◌", "⌁", "✦", "⌇"];

function StampMotif({ code, fallback }: { code: string; fallback: string }) {
  const common = { viewBox: "0 0 32 32", "aria-hidden": true, focusable: false } as const;
  if (code === "US") return <svg {...common}><path d="M13 27h9M15 24h5M16 21h3V10l2-2-2-1-1-4-1 4-3 2 2 2v10M12 15l4-2M20 13l4 2" /><path d="M10 28h15" /></svg>;
  if (code === "CN") return <svg {...common}><path d="M3 24c5-1 6-5 10-5s5 3 9 2 4-4 7-5M6 22v-6h5v4M20 20v-7h5v5M8 16l1-4 2 4M21 13l2-4 2 4" /><path d="M4 27h24" /></svg>;
  if (code === "JP") return <svg {...common}><path d="M6 10h20M9 10v15M23 10v15M4 7h24M12 13l4 4 4-4" /><circle cx="16" cy="5" r="2" /></svg>;
  if (code === "FR") return <svg {...common}><path d="M16 3l-3 10-5 15M16 3l3 10 5 15M10 20h12M7 28h18M13 13h6" /></svg>;
  if (code === "GB") return <svg {...common}><path d="M10 28h12M12 28V8h8v20M14 5h4v3M14 12h4M14 17h4M14 22h4" /><circle cx="16" cy="14.5" r="1.7" /></svg>;
  if (code === "DE") return <svg {...common}><path d="M4 27h24M7 24h18M8 12h16M10 12V24M15 12V24M20 12V24M25 12V24M6 12l10-7 10 7" /></svg>;
  if (code === "KR") return <svg {...common}><path d="M6 26h20M9 26V14h14v12M7 14h18M10 11h12M12 8h8M14 5h4M12 18h8M12 22h8" /><path d="M8 11l4 3M24 11l-4 3" /></svg>;
  if (code === "CA") return <svg {...common}><path d="M16 3l2 6 4-2-1 5 5 1-4 4 2 3-6-1v9h-4v-9l-6 1 2-3-4-4 5-1-1-5 4 2z" /></svg>;
  if (code === "MX") return <svg {...common}><path d="M4 27h24M7 24h18l-3-5H10zM10 19h12l-3-5h-6zM13 14h6l-3-6z" /></svg>;
  if (code === "BR") return <svg {...common}><path d="M16 5v7M12 8l4 4 4-4M10 12h12M12 12l-2 15M20 12l2 15M8 27h16" /><path d="M4 20c4-3 7-3 11 0s8 3 13 0" /></svg>;
  if (code === "NL") return <svg {...common}><path d="M12 28h8l-1-15h-6zM16 13V3M16 13L7 8M16 13l9-5M16 13l7 8M16 13l-7 8" /></svg>;
  if (code === "TH") return <svg {...common}><path d="M5 27h22M8 24h16M10 20h12M12 15h8M14 10h4M16 4v6M8 24l2-4M24 24l-2-4M10 20l2-5M22 20l-2-5" /></svg>;
  if (code === "TR") return <svg {...common}><path d="M22 8a9 9 0 1 0 0 16 10 10 0 1 1 0-16z" /><path d="M22 13l1.2 2.5 2.8.4-2 2 .5 2.8-2.5-1.3-2.5 1.3.5-2.8-2-2 2.8-.4z" /></svg>;
  if (code === "VN") return <svg {...common}><path d="M5 27h22M8 24h16M10 20h12M12 15h8M14 10h4M16 4v6" /><path d="M6 27c4-3 7-3 10 0 3-3 6-3 10 0" /></svg>;
  if (code === "MY") return <svg {...common}><path d="M7 28h7V9h-4v19M18 28h7V9h-4v19M9 9l3-5 3 5M20 9l3-5 3 5M14 18h7" /></svg>;
  if (code === "ZA") return <svg {...common}><path d="M3 26l8-13 5 7 4-6 9 12zM9 26c4-4 10-4 14 0" /><circle cx="24" cy="7" r="3" /></svg>;
  if (code === "ES") return <svg {...common}><path d="M6 28h20M8 28V13h5v15M19 28V10h5v18M10 13l1-7 2 7M21 10l1-7 2 7M13 19h6v9" /></svg>;
  if (code === "IT") return <svg {...common}><path d="M7 27h18M10 27V12h12v15M8 12h16M12 8h8M14 5h4M13 16h6M13 21h6" /></svg>;
  if (code === "AU") return <svg {...common}><path d="M5 25c3-8 7-12 13-14 4-1 7 1 9 5-3 1-5 3-6 7-5-2-10-1-16 2z" /><path d="M8 9l1-4M6 7l5 1M25 7l1-3M23 5l5 1" /></svg>;
  const variant = hash(code) % 4;
  if (variant === 0) return <svg {...common}><path d="M3 25l7-10 5 6 5-9 9 13z" /><path d="M4 28h24" /><text x="16" y="9" textAnchor="middle">{fallback}</text></svg>;
  if (variant === 1) return <svg {...common}><path d="M3 20c4-4 8-4 12 0s8 4 14 0M3 25c4-4 8-4 12 0s8 4 14 0" /><path d="M16 4v11M11 9l5-5 5 5" /></svg>;
  if (variant === 2) return <svg {...common}><path d="M5 27h22M8 27V13h5v14M14 27V8h5v19M20 27V16h5v11" /><circle cx="24" cy="7" r="3" /></svg>;
  return <svg {...common}><circle cx="16" cy="16" r="10" /><path d="M16 3v5M16 24v5M3 16h5M24 16h5M16 16l6-5M16 16l-3 7" /><text x="16" y="19" textAnchor="middle">{fallback}</text></svg>;
}

const stampSlotLayouts: Record<number, Array<Array<[number, number]>>> = {
  1: [[[50, 48]], [[38, 43]], [[62, 54]]],
  2: [[[31, 34], [68, 65]], [[68, 32], [32, 68]], [[30, 50], [70, 50]], [[50, 29], [50, 70]]],
  3: [[[27, 31], [71, 35], [48, 72]], [[50, 27], [29, 68], [72, 66]], [[28, 30], [31, 72], [70, 51]]],
  4: [[[27, 27], [71, 31], [29, 72], [72, 70]], [[50, 24], [27, 50], [73, 49], [50, 75]], [[28, 34], [64, 27], [72, 68], [36, 74]]],
  5: [[[25, 24], [70, 27], [49, 49], [27, 75], [73, 72]], [[50, 22], [25, 43], [74, 41], [34, 75], [68, 74]], [[27, 27], [66, 24], [73, 57], [51, 76], [25, 67]]],
};

function makeStamps(flights: Flight[]) {
  const stamps = new Map<string, Stamp>();
  for (const flight of [...flights].sort((a, b) => a.flight_date.localeCompare(b.flight_date))) for (const countryCode of [flight.departure_country_code, flight.arrival_country_code]) {
    if (!countryCode) continue;
    const code = normalizeCountryCode(countryCode), existing = stamps.get(code), seed = hash(code);
    if (!existing) {
      const shape = ["stamp-circle", "stamp-square", "stamp-rounded", "stamp-hex", "stamp-octagon", "stamp-ellipse", "stamp-oblong", "stamp-triangle"][seed % 8];
      const constrainedShape = ["stamp-triangle", "stamp-hex", "stamp-octagon", "stamp-ellipse", "stamp-oblong"].includes(shape);
      stamps.set(code, { code, first: flight.flight_date, latest: flight.flight_date, visits: 1, flights: 1, rotation: seed % 17 - 8, tone: ["stamp-red", "stamp-blue", "stamp-green", "stamp-purple", "stamp-slate", "stamp-brown", "stamp-brass", "stamp-teal", "stamp-mauve"][seed % 9], shape, size: constrainedShape || seed % 3 === 2 ? "stamp-large" : "stamp-medium", line: ["stamp-single", "stamp-double", "stamp-dashed", "stamp-heavy", "stamp-notched"][seed % 5], motif: stampMotifs[(seed * 7) % stampMotifs.length], layout: `stamp-layout-${seed % 4}` });
    }
    else { existing.latest = flight.flight_date; existing.flights += 1; if (existing.latest !== existing.first) existing.visits += 1; }
  }
  return [...stamps.values()];
}

export function AviationPassport({ displayName, memberSince, userId, flights, totalFlights, countries, minutes }: Props) {
  const root = useRef<HTMLElement>(null);
  const closeRequested = useRef(false);
  const [phase, setPhase] = useState<Phase>("closed");
  const [quickClosing, setQuickClosing] = useState(false);
  const [turnedSheetCount, setTurnedSheetCount] = useState(0);
  const [turningSheetIndex, setTurningSheetIndex] = useState<number | null>(null);
  const [selected, setSelected] = useState<Stamp | null>(null);
  const [customize, setCustomize] = useState(false);
  const [theme, setTheme] = useState<keyof typeof themes>("navy");
  const stamps = useMemo(() => makeStamps(flights), [flights]);
  const [cover, metal] = themes[theme];
  const stampPages = useMemo(() => {
    const pages: Stamp[][] = [];
    let cursor = 0;
    let randomState = stableRandomSeed(`${userId}:stamp-page-counts`) || 1;
    while (cursor < stamps.length) {
      randomState ^= randomState << 13;
      randomState ^= randomState >>> 17;
      randomState ^= randomState << 5;
      let targetCount = 1 + (randomState >>> 0) % 3;
      if (pages.at(-1)?.length === 1 && targetCount === 1) targetCount = 2;
      const page = stamps.slice(cursor, cursor + targetCount);
      pages.push(page);
      cursor += page.length;
    }
    if (pages.length > 1 && pages.at(-1)?.length === 1 && pages.at(-2)?.length === 1) pages.at(-2)?.push(...(pages.pop() ?? []));
    return pages;
  }, [stamps, userId]);
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
    setQuickClosing(true);
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
    const layouts = stampSlotLayouts[Math.max(1, pageStamps.length)] ?? stampSlotLayouts[5];
    const slots = layouts[stableRandomSeed(`${userId}:stamp-layout:${index}`) % layouts.length];
    return <div className="passport-page passport-stamps"><div className="passport-stamp-page-heading"><p className="passport-eyebrow"><T id="passport.stamps" /></p><span className="passport-stamp-page-number">{index + 1}</span></div><div className="passport-stamp-field">{pageStamps.map((stamp, stampIndex) => {
      const slot = slots[stampIndex];
      const positionSeed = stableRandomSeed(`${userId}:${index}:${stamp.code}:${stampIndex}`);
      const shapeXMargin = stamp.shape === "stamp-triangle" ? 27 : stamp.shape === "stamp-oblong" || stamp.shape === "stamp-ellipse" ? 25 : stamp.shape === "stamp-octagon" || stamp.shape === "stamp-hex" ? 23 : 21;
      const shapeYMargin = stamp.shape === "stamp-triangle" ? 19 : stamp.shape === "stamp-oblong" || stamp.shape === "stamp-ellipse" ? 14 : 17;
      const sizeMargin = stamp.size === "stamp-large" ? 3 : stamp.size === "stamp-small" ? -2 : 0;
      const xMargin = Math.max(19, shapeXMargin + sizeMargin);
      const yMargin = Math.max(14, shapeYMargin + sizeMargin);
      const x = Math.max(xMargin, Math.min(100 - xMargin, slot[0] + positionSeed % 5 - 2));
      const y = Math.max(yMargin, Math.min(100 - yMargin, slot[1] + Math.floor(positionSeed / 5) % 5 - 2));
      return <button key={stamp.code} type="button" className={`passport-stamp ${stamp.tone} ${stamp.shape} ${stamp.size} ${stamp.line} ${stamp.layout}`} style={{ "--stamp-x": `${x}%`, "--stamp-y": `${y}%`, "--stamp-rotation": `${stamp.rotation}deg` } as React.CSSProperties} onClick={(event) => { event.stopPropagation(); setSelected(stamp); }}><span className="passport-stamp-label"><span>ENTRY</span><span>STAMP</span></span><span className="passport-stamp-flag"><CountryFlag code={stamp.code} /></span><span className="passport-stamp-motif"><StampMotif code={stamp.code} fallback={stamp.motif} /></span><span className="passport-stamp-date"><LocalizedDate value={stamp.first} /></span></button>;
    })}</div>{!stamps.length && index === 0 && <div className="passport-empty"><T id="passport.empty" /><Link href="/flights/new" className="button-primary mt-4"><T id="map.addFirstFlight" /></Link></div>}</div>;
  };
  const identityPage = <div className="passport-page passport-identity"><p className="passport-eyebrow"><T id="passport.identity" /></p><h3>Captain {displayName}</h3><dl><div><dt><T id="passport.memberSince" /></dt><dd><LocalizedDate value={memberSince} /></dd></div><div><dt><T id="passport.totalFlights" /></dt><dd>{totalFlights}</dd></div><div><dt><T id="passport.countriesVisited" /></dt><dd>{countries}</dd></div><div><dt><T id="passport.flightTime" /></dt><dd>{Math.floor(minutes / 60)}h {minutes % 60}m</dd></div><div><dt>Passport No.</dt><dd>{passportNo}</dd></div></dl></div>;
  const endingPage = <div className="passport-page passport-ending"><p className="passport-ending-primary"><span><T id="passport.endingPrimaryLine1" /></span><span><T id="passport.endingPrimaryLine2" /></span></p><div className="passport-ending-rule" /><p className="passport-ending-secondary"><T id="passport.endingSecondary" /></p></div>;
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
    <div className="mt-4 flex min-h-[390px] items-center justify-center"><div className={`passport-stage-v3 passport-phase-${phase} ${quickClosing ? "passport-quick-closing" : ""}`}><div className="passport-book-v3" onClick={handleBookClick}>
      <div className={`passport-front-cover-v3 ${phase} ${turnedSheetCount >= 1 ? "is-open" : ""} ${turnedSheetCount > 1 ? "is-behind" : ""}`} onAnimationEnd={(event) => { if (event.currentTarget !== event.target) return; if (phase === "opening") { setTurnedSheetCount(1); setPhase("open"); } if (phase === "closing") { setTurnedSheetCount(0); setQuickClosing(false); setPhase("closed"); } }}>
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
