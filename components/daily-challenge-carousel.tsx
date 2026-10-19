"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "@/components/navigation-link";
import { DashboardMemorialCard } from "@/components/dashboard-memorial-card";
import { MemorialArtwork } from "@/components/memorial-artwork";
import { T, useLanguage, useText } from "@/components/i18n";
import { formatDistance } from "@/lib/preferences";
import {
  challengeCategoryLabel,
  sortChallengesByDuration,
  type Challenge,
  type Memorial,
} from "@/components/daily-challenge";

type ApiMemorial = Memorial & {
  event_key?: string;
  event_date?: string;
  publish_start_date?: string;
  publish_end_date?: string;
  publish_year?: number;
  publish_month?: number;
  publish_day?: number;
};
const utcToday = () => new Date().toISOString().slice(0, 10);
const dateFor = (
  event: ApiMemorial,
  field: "event" | "publish_start" | "publish_end",
) =>
  event[`${field}_date`] ||
  (event[`${field}_year` as keyof ApiMemorial]
    ? `${event[`${field}_year` as keyof ApiMemorial]}-${String(event[`${field}_month` as keyof ApiMemorial]).padStart(2, "0")}-${String(event[`${field}_day` as keyof ApiMemorial]).padStart(2, "0")}`
    : "");
const isPublished = (event: ApiMemorial, today: string) => {
  const start = dateFor(event, "publish_start") || today;
  const end = dateFor(event, "publish_end") || start;
  if (!event.recurring) return today >= start && today <= end;
  const monthDay = today.slice(5);
  const startDay = start.slice(5);
  const endDay = end.slice(5);
  return startDay <= endDay
    ? monthDay >= startDay && monthDay <= endDay
    : monthDay >= startDay || monthDay <= endDay;
};
const isMemorialDay = (event: ApiMemorial, today: string) => {
  const eventDate = dateFor(event, "event");
  return (
    Boolean(eventDate) &&
    (event.recurring
      ? today.slice(5) === eventDate.slice(5)
      : today === eventDate)
  );
};

function ChallengeRow({
  challenge,
  distanceUnit,
}: {
  challenge: Challenge;
  distanceUnit: "km" | "mi" | "nm";
}) {
  const t = useText();
  return (
    <Link
      href={`/challenges?route=${challenge.category}`}
      className="flex items-center justify-between gap-3 rounded-xl border border-line px-3 py-2.5 transition hover:border-brand/50 hover:bg-brand-soft/30"
    >
      <span className="min-w-0">
        <span className="block text-[10px] font-bold tracking-wider text-brand">
          {challengeCategoryLabel(challenge.category)}
        </span>
        <span className="mt-0.5 block truncate font-bold">
          {challenge.departure_iata} <span className="text-brand">→</span>{" "}
          {challenge.arrival_iata}
        </span>
      </span>
      <span className="shrink-0 text-right text-xs text-muted">
        {t("flight.durationValue", {
          hours: Math.floor(challenge.estimated_minutes / 60),
          minutes: challenge.estimated_minutes % 60,
        })}
        <br />
        {formatDistance(challenge.distance_km, distanceUnit)}
      </span>
    </Link>
  );
}

export function DailyChallengeCarousel() {
  const { locale, preferences } = useLanguage();
  const [data, setData] = useState<{
    challenges: Challenge[];
    memorials: ApiMemorial[];
  }>({ challenges: [], memorials: [] });
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<"daily" | "memorial">("daily");
  const selectedPageDate = useRef<string | null>(null);
  const today = utcToday();
  const load = async () => {
    setStatus("loading");
    setError(null);
    try {
      const response = await fetch("/api/challenges", { cache: "no-store" });
      const next = await response.json().catch(() => null);
      if (!response.ok || !next)
        throw new Error(
          next?.error || "Unable to load today’s flight assignments.",
        );
      const memorials = (next.memorials || []) as ApiMemorial[];
      setData({ challenges: next.challenges || [], memorials });
      setError(next.errors?.challenges || null);
      setStatus(
        next.errors?.challenges && !(next.challenges || []).length
          ? "error"
          : "ready",
      );
      if (
        selectedPageDate.current !== today &&
        memorials.some(
          (event) => isPublished(event, today) && isMemorialDay(event, today),
        )
      )
        setPage("memorial");
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load today’s flight assignments.",
      );
      setStatus("error");
    }
  };
  useEffect(() => {
    void load();
    return undefined; // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [today]);
  const memorials = useMemo(
    () => data.memorials.filter((event) => isPublished(event, today)),
    [data, today],
  );
  const selectPage = (nextPage: "daily" | "memorial") => {
    selectedPageDate.current = today;
    setPage(nextPage);
  };
  return (
    <div className="relative min-h-[178px] pb-6">
      {page === "daily" ? (
        <div className="space-y-2">
          {memorials.length > 0 && <button type="button" onClick={() => selectPage("memorial")} className="flex w-full items-center gap-3 rounded-xl border border-[#d5b36a]/45 bg-[#f4ead3] px-3 py-2.5 text-left transition hover:border-[#d5b36a] hover:bg-[#efe1bf] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d5b36a]">
            <span className="w-9 shrink-0"><MemorialArtwork type={memorials.length === 1 ? memorials[0].memorial_type : null} tone={memorials.length === 1 ? memorials[0].display_tone : null} /></span>
            <span className="min-w-0 flex-1"><span className="block text-[10px] font-bold uppercase tracking-wider text-[#80632b]">{memorials.length === 1 ? <T source="Memorial Flight This Week" /> : <T source="Memorial Flights This Week" />}</span><span className="block truncate text-sm font-bold text-[#3e3322]">{memorials.length === 1 ? (locale === "zh-CN" ? memorials[0].title_zh || memorials[0].title_en : memorials[0].title_en || memorials[0].title_zh) : <T source="Explore this week's special flights." />}</span></span>
            <span aria-hidden="true" className="shrink-0 text-xl text-[#80632b]">→</span>
          </button>}
          {status === "loading" && !data.challenges.length && (
            <div className="rounded-xl border border-dashed border-brand/30 bg-brand-soft/30 p-5 text-sm text-muted">
              <T source="Loading today’s flight assignments…" />
            </div>
          )}
          {status === "error" && !data.challenges.length && (
            <div className="rounded-xl border border-dashed border-danger/40 p-5 text-sm text-muted">
              <p>{error || "Unable to load today’s flight assignments."}</p>
              <button
                type="button"
                onClick={() => void load()}
                className="mt-3 text-sm font-bold text-brand underline underline-offset-4"
              >
                Try Again
              </button>
            </div>
          )}
          {status === "ready" &&
            sortChallengesByDuration(data.challenges).map((challenge) => (
              <ChallengeRow
                key={challenge.category}
                challenge={challenge}
                distanceUnit={preferences.distanceUnit}
              />
            ))}
          {status === "ready" && !data.challenges.length && (
            <p className="rounded-xl border border-dashed border-line p-5 text-sm text-muted">
              <T source="No Recommendations Available" />
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {memorials.length ? (
            memorials.map((event) => (
              <DashboardMemorialCard key={event.id} event={event} />
            ))
          ) : (
            <p className="rounded-xl border border-dashed border-line p-5 text-sm text-muted">
              <T source="No Memorial Flights Available At The Moment." />
            </p>
          )}
        </div>
      )}
      <div className="absolute bottom-0 left-0 right-0 flex justify-center gap-2">
        <button
          type="button"
          aria-label="Show Daily Challenges"
          aria-pressed={page === "daily"}
          onClick={() => selectPage("daily")}
          className={`h-2.5 w-2.5 rounded-full border transition ${page === "daily" ? "border-brand bg-brand" : "border-line-strong bg-transparent"}`}
        />
        <button
          type="button"
          aria-label="Show Memorial Flights"
          aria-pressed={page === "memorial"}
          onClick={() => selectPage("memorial")}
          className={`h-2.5 w-2.5 rounded-full border transition ${page === "memorial" ? "border-brand bg-brand" : "border-line-strong bg-transparent"}`}
        />
      </div>
    </div>
  );
}
