"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "@/components/navigation-link";
import { T, useLanguage, useText } from "@/components/i18n";
import { formatDistance } from "@/lib/preferences";

export type Challenge={challenge_date:string;category:string;departure_iata:string;departure_icao:string;arrival_iata:string;arrival_icao:string;departure_name:string;arrival_name:string;estimated_minutes:number;distance_km:number;suggested_aircraft:string|null;about:string};
export type Memorial={id:string;title_en:string;title_zh:string;description_en:string;description_zh:string;event_year:number;event_month:number;event_day:number;departure_iata:string;departure_icao:string;arrival_iata:string;arrival_icao:string;suggested_aircraft:string|null};
const labels:Record<string,string>={quick:"Quick Flight",regional:"Regional Flight",medium:"Medium Haul",long:"Long Haul"};
const utcDate=()=>new Date().toISOString().slice(0,10);
const labelSources:Record<string,string>={quick:"Quick Flight",regional:"Regional Flight",medium:"Medium Haul",long:"Long Haul"};

function ChallengeCard({item,compact=false}:{item:Challenge;compact?:boolean}){
 const [flipped,setFlipped]=useState(false); const {preferences}=useLanguage(); const t=useText();
 return <button type="button" aria-pressed={flipped} onClick={()=>setFlipped(value=>!value)} className={`group block w-full text-left [perspective:1000px] ${compact?"":"min-h-[190px]"}`}>
  <span className={`relative block min-h-full transition-transform duration-500 [transform-style:preserve-3d] ${flipped?"[transform:rotateY(180deg)]":""}`}>
   <span className="block rounded-2xl border border-line bg-surface p-5 [backface-visibility:hidden] group-hover:border-brand/50">
    <span className="text-sm font-bold text-brand"><T source={labelSources[item.category]||item.category}/></span><span className="mt-3 block text-2xl font-bold">{item.departure_iata} <span className="text-brand">→</span> {item.arrival_iata}</span><span className="mt-2 block text-sm text-muted">{item.departure_name} → {item.arrival_name}</span><span className="mt-3 block text-sm text-muted">{t("flight.durationValue",{hours:Math.floor(item.estimated_minutes/60),minutes:item.estimated_minutes%60})} · {formatDistance(item.distance_km,preferences.distanceUnit)} · {item.suggested_aircraft||"—"}</span>
   </span>
   <span className="absolute inset-0 block rounded-2xl border border-brand/40 bg-brand-soft p-5 [backface-visibility:hidden] [transform:rotateY(180deg)]"><span className="text-sm font-bold text-brand"><T source="Flight Details"/></span><span className="mt-4 block text-sm font-bold text-ink">{t("ICAO Codes")}</span><span className="mt-1 block text-xl font-bold">{item.departure_icao} <span className="text-brand">→</span> {item.arrival_icao}</span><span className="mt-4 block text-sm font-bold text-ink"><T source="Why this route"/></span><span className="mt-1 block text-sm leading-6 text-muted">{item.about}</span></span>
  </span>
 </button>;
}

function useDailyChallenges(initial?:{challenges:Challenge[];memorials:Memorial[]}){
 const [data,setData]=useState(initial||null); const [loadedDate,setLoadedDate]=useState(initial?.challenges[0]?.challenge_date||utcDate()); const [updating,setUpdating]=useState(false);
 const load=useCallback(async(date:string)=>{setUpdating(true);try{const response=await fetch(`/api/challenges?date=${date}`,{cache:"no-store"});if(!response.ok)throw new Error("challenge request failed");const next=await response.json();setData({challenges:next.challenges||[],memorials:next.memorials||[]});setLoadedDate(date)}catch{}finally{setUpdating(false)}},[]);
 useEffect(()=>{let timer:ReturnType<typeof setTimeout>;let disposed=false;const check=()=>{if(disposed)return;const current=utcDate();if(current!==loadedDate)void load(current);const now=Date.now();const next=Date.now()+86400000-(now%86400000)+1000;timer=setTimeout(check,Math.max(1000,next-now))};const onResume=()=>{if(utcDate()!==loadedDate)void load(utcDate())};timer=setTimeout(check,Math.max(1000,Date.now()+86400000-(Date.now()%86400000)+1000-Date.now()));document.addEventListener("visibilitychange",onResume);window.addEventListener("focus",onResume);return()=>{disposed=true;clearTimeout(timer);document.removeEventListener("visibilitychange",onResume);window.removeEventListener("focus",onResume)}},[load,loadedDate]);
 return {data,updating};
}

export function DailyChallengeCards({compact=false}:{compact?:boolean}){const {data,updating}=useDailyChallenges();if(!data)return <div className="rounded-xl border border-dashed border-brand/30 bg-brand-soft/30 p-5 text-sm text-muted"><T source="Loading today’s flight assignments…"/></div>;if(!data.challenges.length)return <div className="rounded-xl border border-dashed border-brand/30 bg-brand-soft/30 p-5 text-sm text-muted"><T source="No Recommendations Available"/></div>;return <div aria-busy={updating} className={compact?"grid gap-2":"grid gap-4 sm:grid-cols-2"}>{data.challenges.map(item=><ChallengeCard key={item.category} item={item} compact={compact}/>)}</div>}

export function DailyChallengePage({initial,selected}:{initial:{challenges:Challenge[];memorials:Memorial[]};selected?:string}){const {data,updating}=useDailyChallenges(initial);const current=data||initial;const challenge=useMemo(()=>current.challenges.find(item=>item.category===selected)||current.challenges[0],[current.challenges,selected]);return <div aria-busy={updating} className="space-y-8"><section><p className="eyebrow"><T source="Today's Flight Assignments"/></p><h1 className="mt-3 text-4xl font-bold tracking-tight text-brand"><T source="Daily Challenge"/></h1><p className="mt-3 text-muted"><T source="Discover a new route every day."/></p><div className="mt-7 grid gap-4 sm:grid-cols-2">{current.challenges.map(item=><ChallengeCard key={item.category} item={item}/>)}</div></section>{current.memorials.length>0&&<section className="rounded-2xl border border-[#d5b36a]/50 bg-[#2b263d] p-6 text-white"><p className="text-xs font-bold uppercase tracking-wider text-[#d5b36a]"><T source="Memorial Flight"/></p>{current.memorials.map(event=><div key={event.id} className="mt-3"><h2 className="text-2xl font-bold">{event.title_en}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-white/75">{event.description_en}</p><p className="mt-3 font-bold">{event.departure_iata} → {event.arrival_iata}</p></div>)}</section>}</div>}
