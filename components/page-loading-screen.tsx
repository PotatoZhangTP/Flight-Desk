"use client";
import { getLoadingMessages, type LoadingContext } from "@/lib/ui-messages";
import { useLanguage, T } from "./i18n";

/** Shared by route fallbacks and real pending navigation. No minimum delay. */
export function PageLoadingScreen({ context = "page", locale }: { context?: LoadingContext; locale?: string }) {
  const language = useLanguage();
  const copy = getLoadingMessages(locale ?? language.locale);
  return <div data-page-loading lang={copy.lang} className="page-loading-screen" role="status" aria-live="polite" aria-atomic="true">
    <div className="flex flex-col items-center px-6 text-center">
      <svg aria-hidden="true" viewBox="0 0 240 160" fill="none" className="h-40 w-60 max-w-[75vw] text-brand sm:h-48 sm:w-72">
        <path d="M25 139c45-2 73-24 100-54s55-52 89-57" stroke="currentColor" strokeWidth="1.5" opacity=".16" />
        <path className="loading-flight-trail" d="M35 146c44-9 72-33 95-58" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="3 8" opacity=".4" />
        <g className="loading-aircraft"><g transform="translate(96 42) rotate(38 32 32)">
          <path d="M32 5c-3 0-4 5-4 10v10L9 38v6l19-7v12l-7 5v4l11-3 11 3v-4l-7-5V37l19 7v-6L36 25V15c0-5-1-10-4-10Z" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M30 16h4M32 41v10" stroke="var(--on-brand)" strokeWidth="1.5" strokeLinecap="round" />
        </g></g>
      </svg>
      <p className="mt-2 text-xl font-semibold tracking-wide text-ink sm:text-2xl">{locale ? copy.label : <T id="common.loading" />}</p>
      <span className="sr-only">{locale ? copy.details[context] : <T id={`loading.${context}`} />}</span>
    </div>
  </div>;
}
