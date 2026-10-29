/**
 * Small built-in fallback for the aliases used by the first reference-data
 * migration. The database alias table remains the source of truth; this map
 * only keeps public airport search useful while an older preview has not yet
 * applied that migration.
 */
const aliases: Record<string, string> = {
  "天津滨海": "TSN",
  "天津滨海国际机场": "TSN",
  "tianjin binhai": "TSN",
  "首都机场": "PEK",
  "北京首都国际机场": "PEK",
  "大兴机场": "PKX",
  "北京大兴国际机场": "PKX",
  "浦东机场": "PVG",
  "上海浦东国际机场": "PVG",
  "虹桥机场": "SHA",
  "天府机场": "TFU",
  "成都天府国际机场": "TFU",
};

function normalize(value: string) {
  return value.trim().toLocaleLowerCase().replace(/[\s\u3000_-]+/g, "");
}

export function airportAliasCode(value: string) {
  return aliases[normalize(value)] || null;
}
