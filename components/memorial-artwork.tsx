import { useId } from "react";
import { normalizeDisplayTone } from "@/lib/memorial-presentation";

/** Decorative, local SVG artwork; no images, requests, or animation. */
export function MemorialArtwork({ type, tone }: { type?: string | null; tone?: string | null }) {
  const id = useId().replace(/:/g, "");
  const historical = normalizeDisplayTone(tone, type) === "celebrating";
  return <svg aria-hidden="true" focusable="false" viewBox="0 0 160 190" className="block h-auto w-full" data-memorial-artwork={historical ? "emblem" : "candle"}>
    {historical ? <>
      <circle cx="80" cy="95" r="65" fill="#D5B36A" fillOpacity=".025" stroke="#D5B36A" strokeWidth="1.5" />
      <circle cx="80" cy="95" r="59" fill="none" stroke="#D5B36A" strokeOpacity=".35" strokeWidth=".7" />
      <path d="M35 112c8-36 52-57 88-42M38 120c18 18 49 24 73 6" fill="none" stroke="#D5B36A" strokeOpacity=".65" strokeWidth="1.2" strokeLinecap="round" />
      <path d="m104 62-8 31 20 20-4 5-23-12-13 17 5 9-3 3-10-10-13-5 2-4 10 1 10-21-20-16 3-5 27 11 15-25Z" fill="#E8D4A5" />
      <path d="m80 44 2 4-2 4-2-4ZM122 98l2 3-2 3-2-3ZM40 94l1.5 2.5L40 99l-1.5-2.5Z" fill="#D5B36A" />
      <path d="M64 145h32M72 150h16" stroke="#D5B36A" strokeOpacity=".65" strokeWidth="1" strokeLinecap="round" />
    </> : <>
      <defs>
        <radialGradient id={`${id}-glow`}><stop stopColor="#E6C87E" stopOpacity=".15" /><stop offset="1" stopColor="#E6C87E" stopOpacity="0" /></radialGradient>
        <linearGradient id={`${id}-wax`} x1="0" x2="1"><stop stopColor="#CFC6B3" /><stop offset=".42" stopColor="#F4EDDC" /><stop offset="1" stopColor="#DED4BE" /></linearGradient>
      </defs>
      <ellipse cx="80" cy="64" rx="57" ry="61" fill={`url(#${id}-glow)`} />
      <ellipse cx="80" cy="164" rx="35" ry="5" fill="#D5B36A" fillOpacity=".08" />
      <path className="memorial-candle-flame" d="M80 31c-3 13-15 21-13 33 1 9 7 13 13 13 9 0 15-8 13-17-1-10-9-18-13-29Z" fill="#DCC181" />
      <path className="memorial-candle-inner-flame" d="M80 50c-1 8-7 13-6 19 1 5 3 7 6 7 5 0 8-4 7-9-1-6-5-11-7-17Z" fill="#F6E8BD" />
      <path d="M59 90h42v67c0 8-42 8-42 0Z" fill={`url(#${id}-wax)`} />
      <ellipse cx="80" cy="90" rx="21" ry="5" fill="#F5EFDF" />
      <ellipse cx="80" cy="90" rx="9" ry="2.2" fill="#C6B997" fillOpacity=".7" />
      <path d="M80 89v-9" stroke="#605347" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M64 94v18c0 5 5 5 5 0v-10" fill="none" stroke="#F5EFDF" strokeWidth="3" strokeLinecap="round" />
      <path d="M55 163h50" stroke="#D5B36A" strokeOpacity=".55" strokeWidth="1" strokeLinecap="round" />
    </>}
  </svg>;
}
