"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";

type Props = { initialMin: string; initialMax: string; maximumHours: number };
type Thumb = "min" | "max";

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const formatHours = (value: number) => Number.isInteger(value) ? `${value}h` : `${Math.floor(value)}h 30m`;

export function DurationRangeFilter({ initialMin, initialMax, maximumHours }: Props) {
  const initialMinimum = clamp(Number(initialMin) || 0, 0, maximumHours);
  const initialMaximum = clamp(Number(initialMax) || maximumHours, initialMinimum, maximumHours);
  const [minimum, setMinimum] = useState(initialMinimum);
  const [maximum, setMaximum] = useState(initialMaximum);
  const track = useRef<HTMLDivElement>(null);
  const dragging = useRef<Thumb | null>(null);
  const active = minimum > 0 || maximum < maximumHours;
  const position = (value: number) => `${(value / maximumHours) * 100}%`;

  const setValue = (thumb: Thumb, value: number) => {
    const next = Math.round(clamp(value, 0, maximumHours) * 2) / 2;
    if (thumb === "min") setMinimum(Math.min(next, maximum));
    else setMaximum(Math.max(next, minimum));
  };
  const valueAt = (clientX: number) => {
    const rect = track.current?.getBoundingClientRect();
    return rect ? ((clientX - rect.left) / rect.width) * maximumHours : 0;
  };
  useEffect(() => {
    const move = (event: PointerEvent) => { if (dragging.current) setValue(dragging.current, valueAt(event.clientX)); };
    const end = () => { dragging.current = null; };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", end);
    return () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", end); };
  });
  const keyboard = (thumb: Thumb, event: KeyboardEvent<HTMLButtonElement>) => {
    const step = event.shiftKey ? 1 : 0.5;
    if (event.key === "ArrowLeft" || event.key === "ArrowDown") { event.preventDefault(); setValue(thumb, (thumb === "min" ? minimum : maximum) - step); }
    if (event.key === "ArrowRight" || event.key === "ArrowUp") { event.preventDefault(); setValue(thumb, (thumb === "min" ? minimum : maximum) + step); }
    if (event.key === "Home") { event.preventDefault(); setValue(thumb, 0); }
    if (event.key === "End") { event.preventDefault(); setValue(thumb, maximumHours); }
  };
  const start = (thumb: Thumb, event: React.PointerEvent) => { event.preventDefault(); dragging.current = thumb; event.currentTarget.setPointerCapture?.(event.pointerId); };

  return <div className="relative min-w-0 sm:col-span-2 lg:col-span-3">
    <input type="hidden" name="minDuration" value={active ? String(minimum) : ""} readOnly />
    <input type="hidden" name="maxDuration" value={maximum < maximumHours ? String(maximum) : ""} readOnly />
    <div className="flex items-baseline justify-between gap-3 text-[10px] font-bold uppercase tracking-[0.14em] text-subtle"><span>Flight Duration</span><span className="text-brand">{active ? `${formatHours(minimum)} – ${maximum === maximumHours ? `${formatHours(maximum)}+` : formatHours(maximum)}` : "Any Duration"}</span></div>
    <div ref={track} className="relative mt-4 h-8 touch-none" onPointerDown={(event) => { const value = valueAt(event.clientX); start(Math.abs(value - minimum) <= Math.abs(value - maximum) ? "min" : "max", event); setValue(Math.abs(value - minimum) <= Math.abs(value - maximum) ? "min" : "max", value); }}>
      <div className="absolute top-1/2 h-1.5 w-full -translate-y-1/2 rounded-full bg-surface-muted" />
      <div className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-brand" style={{ left: position(minimum), right: `${100 - (maximum / maximumHours) * 100}%` }} />
      {(["min", "max"] as Thumb[]).map((thumb) => { const value = thumb === "min" ? minimum : maximum; return <button key={thumb} type="button" role="slider" aria-label={thumb === "min" ? "Minimum flight duration" : "Maximum flight duration"} aria-valuemin={0} aria-valuemax={maximumHours} aria-valuenow={value} aria-valuetext={formatHours(value)} onPointerDown={(event) => { event.stopPropagation(); start(thumb, event); }} onKeyDown={(event) => keyboard(thumb, event)} className="absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-brand bg-surface shadow-sm outline-none transition focus-visible:ring-4 focus-visible:ring-brand/20" style={{ left: position(value) }} />; })}
    </div>
    <div className="flex justify-between text-xs text-subtle"><span>0h</span><span>{formatHours(maximumHours)}+</span></div>
  </div>;
}
