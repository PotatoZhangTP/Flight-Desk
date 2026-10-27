import type { SupabaseClient } from "@supabase/supabase-js";
import { displayCountryCode } from "@/lib/country-region";

type ChallengeLike = {
  departure_icao: string;
  arrival_icao: string;
  distance_km: number;
  category: string;
  about?: string | null;
  reason_en?: string | null;
  reason_zh?: string | null;
};

type AirportFacts = {
  icao_code: string;
  country_code: string | null;
  country_name: string | null;
  municipality: string | null;
  continent_code: string | null;
  airport_type: string | null;
  scheduled_service: boolean | null;
  latitude: number | null;
  longitude: number | null;
};

const continentNames: Record<string, string> = { AF: "Africa", AS: "Asia", EU: "Europe", NA: "North America", OC: "Oceania", SA: "South America", AN: "Antarctica" };
const continentNamesZh: Record<string, string> = { AF: "非洲", AS: "亚洲", EU: "欧洲", NA: "北美洲", OC: "大洋洲", SA: "南美洲", AN: "南极洲" };

function countryName(code: string | null, locale: "en" | "zh-CN") {
  if (!code) return locale === "zh-CN" ? "不同地区" : "different regions";
  try { return new Intl.DisplayNames([locale], { type: "region" }).of(code) || code; } catch { return code; }
}

function city(airport: AirportFacts, locale: "en" | "zh-CN") {
  return airport.municipality?.trim() || airport.country_name?.trim() || (locale === "zh-CN" ? "这座城市" : "this airport");
}

function categoryText(category: string, locale: "en" | "zh-CN") {
  if (locale === "zh-CN") return ({ quick: "短途探索", regional: "区域航线体验", medium: "中程航线规划", long: "长途飞行与跨洲探索" }[category] || "航线探索");
  return ({ quick: "a compact short-distance exploration", regional: "a practical regional flight", medium: "a rewarding medium-haul planning exercise", long: "a long-haul exploration assignment" }[category] || "a route worth exploring");
}

function buildReason(challenge: ChallengeLike, departure: AirportFacts | undefined, arrival: AirportFacts | undefined, mappings: { original_code: string; target_code: string; is_active?: boolean }[], locale: "en" | "zh-CN") {
  if (!departure || !arrival) {
    return locale === "zh-CN"
      ? `这是一条${categoryText(challenge.category, locale)}，连接 ${challenge.departure_icao} 与 ${challenge.arrival_icao}，适合根据约 ${challenge.distance_km.toLocaleString("zh-CN")} 公里的航程安排一次有明确目标的飞行。`
      : `This ${categoryText(challenge.category, locale)} connects ${challenge.departure_icao} and ${challenge.arrival_icao}, giving you a clear flight to plan across approximately ${challenge.distance_km.toLocaleString("en-US")} km.`;
  }
  const departureCountry = displayCountryCode(departure.country_code, mappings);
  const arrivalCountry = displayCountryCode(arrival.country_code, mappings);
  const sameCountry = departureCountry && arrivalCountry && departureCountry === arrivalCountry;
  const sameContinent = departure.continent_code && arrival.continent_code && departure.continent_code === arrival.continent_code;
  const departureLarge = departure.airport_type === "large_airport" && departure.scheduled_service;
  const arrivalLarge = arrival.airport_type === "large_airport" && arrival.scheduled_service;
  const departureCity = city(departure, locale);
  const arrivalCity = city(arrival, locale);
  const distance = challenge.distance_km.toLocaleString(locale === "zh-CN" ? "zh-CN" : "en-US");

  if (locale === "zh-CN") {
    if (!sameCountry && departure.continent_code && arrival.continent_code && departure.continent_code !== arrival.continent_code) {
      return `从${departureCity}飞往${arrivalCity}，这条约 ${distance} 公里的航线连接${continentNamesZh[departure.continent_code] || "不同大陆"}与${continentNamesZh[arrival.continent_code] || "另一片大陆"}。${categoryText(challenge.category, locale)}让这次跨区域飞行有清晰的规划主题。`;
    }
    if (!sameCountry) return `从${departureCity}的${countryName(departureCountry, locale)}前往${arrivalCity}的${countryName(arrivalCountry, locale)}，这是一条真实的跨国机场连接。约 ${distance} 公里的航程适合进行${categoryText(challenge.category, locale)}。`;
    if (departureLarge && arrivalLarge) return `${departureCity}与${arrivalCity}之间均设有大型定期服务机场，适合体验两个航空交通节点之间的连接。约 ${distance} 公里的航程构成${categoryText(challenge.category, locale)}。`;
    if (!sameContinent) return `这条从${departureCity}到${arrivalCity}的航线跨越了不同地理区域。约 ${distance} 公里的距离，为${categoryText(challenge.category, locale)}提供了明确而可控的飞行目标。`;
    return `从${departureCity}前往${arrivalCity}，这是一条基于真实机场资料的${categoryText(challenge.category, locale)}。约 ${distance} 公里的航程适合把城市连接与飞行计划结合起来。`;
  }
  if (!sameCountry && departure.continent_code && arrival.continent_code && departure.continent_code !== arrival.continent_code) {
    return `From ${departureCity} to ${arrivalCity}, this approximately ${distance} km route links ${continentNames[departure.continent_code] || "one continent"} with ${continentNames[arrival.continent_code] || "another"}. It gives ${categoryText(challenge.category, locale)} a clear geographic purpose without implying a scheduled service. ` .trim();
  }
  if (!sameCountry) return `Travel from ${departureCity} in ${countryName(departureCountry, locale)} to ${arrivalCity} in ${countryName(arrivalCountry, locale)} on a genuine cross-border airport connection. At approximately ${distance} km, it is ${categoryText(challenge.category, locale)}.`;
  if (departureLarge && arrivalLarge) return `${departureCity} and ${arrivalCity} are served by large airports with scheduled service, making this a useful connection between two aviation nodes. The approximately ${distance} km sector is ${categoryText(challenge.category, locale)}.`;
  if (!sameContinent) return `This route from ${departureCity} to ${arrivalCity} spans distinct geographic regions. Its approximately ${distance} km distance gives you a focused objective for ${categoryText(challenge.category, locale)}.`;
  return `Linking ${departureCity} with ${arrivalCity}, this route is grounded in Flight Desk's airport reference data. The approximately ${distance} km sector makes it ${categoryText(challenge.category, locale)}.`;
}

export function fallbackReason(challenge: Pick<ChallengeLike, "departure_icao" | "arrival_icao" | "distance_km" | "category">, locale: "en" | "zh-CN") {
  return buildReason(challenge, undefined, undefined, [], locale);
}

export async function addDailyChallengeReasons<T extends ChallengeLike>(supabase: SupabaseClient, challenges: T[]) {
  if (!challenges.length) return challenges;
  const codes = [...new Set(challenges.flatMap(item => [item.departure_icao, item.arrival_icao]).filter(Boolean))];
  const [{ data: airports }, { data: mappings }] = await Promise.all([
    supabase.from("airports").select("icao_code,country_code,country_name,municipality,continent_code,airport_type,scheduled_service,latitude,longitude").in("icao_code", codes),
    supabase.from("country_region_mappings").select("original_code,target_code,is_active").eq("is_active", true),
  ]);
  const byIcao = new Map<string, AirportFacts>((airports ?? []).map(row => [String(row.icao_code).toUpperCase(), row as AirportFacts]));
  const activeMappings = (mappings ?? []) as { original_code: string; target_code: string; is_active?: boolean }[];
  return challenges.map(item => ({
    ...item,
    reason_en: buildReason(item, byIcao.get(item.departure_icao), byIcao.get(item.arrival_icao), activeMappings, "en"),
    reason_zh: buildReason(item, byIcao.get(item.departure_icao), byIcao.get(item.arrival_icao), activeMappings, "zh-CN"),
  }));
}

