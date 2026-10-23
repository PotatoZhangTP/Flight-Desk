#!/usr/bin/env node
/*
 * Prepare an idempotent SQL seed from a downloaded SimBrief aircraft JSON file.
 * The script intentionally does not fetch the external website during builds or
 * app requests. Download the official list separately, then run:
 *   node scripts/aircraft/import-simbrief-aircraft-catalog.mjs aircraft.json > seed.sql
 *
 * Accepted row fields: code, name, manufacturer, family, aliases.
 */
import fs from "node:fs";

const file = process.argv[2];
if (!file) throw new Error("Usage: import-simbrief-aircraft-catalog.mjs <aircraft.json>");
const source = JSON.parse(fs.readFileSync(file, "utf8"));
const rows = Array.isArray(source) ? source : source.aircraft;
if (!Array.isArray(rows)) throw new Error("Expected a JSON array or { aircraft: [] }.");
const sql = value => value == null ? "NULL" : `'${String(value).trim().replaceAll("'", "''")}'`;
const normalize = value => String(value ?? "").trim().toUpperCase().replace(/[^A-Z0-9]+/g, "");
const output = [];
for (const row of rows) {
  const code = normalize(row.code || row.icao || row.simbrief_code);
  const name = String(row.name || row.display_name || "").trim();
  if (!code || !name) continue;
  const manufacturer = String(row.manufacturer || "").trim().toLowerCase();
  const family = String(row.family || "").trim();
  const aliases = [code, ...(Array.isArray(row.aliases) ? row.aliases : [])].map(normalize).filter(Boolean);
  output.push(`-- ${code}\nINSERT INTO public.achievement_aircraft_type_aliases (alias_key, canonical_type_key, manufacturer, display_name, manufacturer_family, simbrief_supported, is_active) VALUES\n  ${aliases.map(alias => `(${sql(alias)}, ${sql(code)}, ${["boeing", "airbus", "embraer", "atr", "bombardier", "other"].includes(manufacturer) ? sql(manufacturer) : "NULL"}, ${sql(name)}, ${sql(family || code)}, true, true)`).join(",\n  ")}\nON CONFLICT (alias_key) DO UPDATE SET canonical_type_key = EXCLUDED.canonical_type_key, manufacturer = EXCLUDED.manufacturer, display_name = EXCLUDED.display_name, manufacturer_family = EXCLUDED.manufacturer_family, simbrief_supported = true, is_active = true, updated_at = now();`);
}
process.stdout.write(`-- Generated from an official SimBrief aircraft export.\nBEGIN;\n${output.join("\n\n")}\nCOMMIT;\n`);
