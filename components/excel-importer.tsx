"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { T, useText } from "@/components/i18n";
import { airportCodeFromColumns, autoMatch, detectHeaderRow, detectImportDuplicate, excelFields, normalizeAircraftValue, normalizeDateValue, normalizeDurationValue, normalizeFlightPair, normalizeHeader, normalizeTimeValue, validateImportFields, type Confidence, type ExcelField, type NormalizedValue, type ReviewStatus } from "@/lib/excel-import";
import { airportCodes, type Airport } from "@/lib/airports";
import { airportAliasCode } from "@/lib/airport-aliases";
import { getScheduledFlightTime } from "@/lib/flight-time";

type RawSheet = { name: string; rawRows: string[][] };
type ConfirmationTarget = { field: "departure_airport" | "arrival_airport"; sourceRow: number; original: string };
type AircraftOption = { code: string; name: string; aliases?: string[] };
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const extensions = [".xlsx", ".xls", ".csv"];

export function ExcelImporter() {
  const input = useRef<HTMLInputElement>(null);
  const t = useText();
  const [sheets, setSheets] = useState<RawSheet[]>([]);
  const [fileName, setFileName] = useState("");
  const [selectedSheet, setSelectedSheet] = useState("");
  const [headerMode, setHeaderMode] = useState<"auto" | "manual" | "none">("auto");
  const [manualHeader, setManualHeader] = useState(0);
  const [mapping, setMapping] = useState<Record<number, ExcelField | "ignore"> >({});
  const [confidence, setConfidence] = useState<Record<number, Confidence>>({});
  const [locked, setLocked] = useState<Set<number>>(new Set());
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dateFormat, setDateFormat] = useState<"MM/DD/YYYY" | "DD/MM/YYYY" | "YYYY-MM-DD">("MM/DD/YYYY");
  const [airportCandidates, setAirportCandidates] = useState<Record<string, Airport[]>>({});
  const [airportSelections, setAirportSelections] = useState<Record<string, Airport>>({});
  const [rowAirportSelections, setRowAirportSelections] = useState<Record<string, Airport>>({});
  const [airportLoading, setAirportLoading] = useState(false);
  const [aircraftCandidates, setAircraftCandidates] = useState<Record<string, AircraftOption[]>>({});
  const [confirmation, setConfirmation] = useState<ConfirmationTarget | null>(null);
  const [confirmationOptions, setConfirmationOptions] = useState<Airport[]>([]);
  const [confirmationQuery, setConfirmationQuery] = useState("");
  const [rowOverrides, setRowOverrides] = useState<Record<string, string>>({});
  const [existingFlights, setExistingFlights] = useState<Record<string, unknown>[]>([]);
  const [duplicateLoading, setDuplicateLoading] = useState(false);
  const [reviewFilter, setReviewFilter] = useState<ReviewStatus | "All">("All");
  const [onlyIssues, setOnlyIssues] = useState(false);
  const [skippedRows, setSkippedRows] = useState<Set<number>>(new Set());
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [batchId, setBatchId] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState<{ rowNumber: number; result: string; error?: string }[] | null>(null);
  const current = sheets.find(sheet => sheet.name === selectedSheet);
  const headerIndex = headerMode === "none" ? -1 : headerMode === "manual" ? manualHeader : detectHeaderRow(current?.rawRows || []);
  const headers = useMemo(() => headerIndex >= 0 ? (current?.rawRows[headerIndex] || []).map((value, index) => String(value || `Column ${index + 1}`)) : (current?.rawRows[0] || []).map((_, index) => `Column ${index + 1}`), [current, headerIndex]);
  const dataRows = useMemo(() => {
    const rows = current?.rawRows || [];
    return rows.slice(headerIndex >= 0 ? headerIndex + 1 : 0)
      .map((values, index) => ({ sourceRow: headerIndex >= 0 ? headerIndex + index + 2 : index + 1, values }))
      .filter(row => row.values.some(value => value.trim() !== ""));
  }, [current, headerIndex]);
  const fieldColumn = useCallback((field: ExcelField) => Object.keys(mapping).find(index => mapping[Number(index)] === field), [mapping]);
  const airportColumns = useMemo(() => [...new Set([
    fieldColumn("departure_airport"), fieldColumn("arrival_airport"),
    ...headers.map((header, index) => normalizeHeader(header).includes("icao") ? String(index) : ""),
  ].filter(Boolean))], [fieldColumn, headers]);

  useEffect(() => {
    let live = true;
    const values = [...new Set(dataRows.flatMap(row => airportColumns.flatMap(column => {
      const raw = (row.values[Number(column)] || "").trim();
      if (!raw) return [];
      const isIcaoColumn = normalizeHeader(headers[Number(column)] || "").includes("icao");
      const embeddedCodes = raw.toUpperCase().match(/\b[A-Z]{4}\b/g) || [];
      return isIcaoColumn ? embeddedCodes : [raw, ...embeddedCodes];
    })))];
    if (!values.length) { setAirportCandidates({}); return; }
    setAirportLoading(true);
    Promise.all(values.map(async value => {
      const queries = [...new Set([value, airportAliasCode(value)].filter(Boolean) as string[])];
      for (const query of queries) {
        try {
          const response = await fetch(`/api/airports?q=${encodeURIComponent(query)}`, { cache: "no-store" });
          const body = await response.json();
          if (response.ok && Array.isArray(body.airports) && body.airports.length) return [value.toLowerCase(), body.airports as Airport[]] as const;
        } catch { /* Try the canonical code fallback below. */ }
      }
      return [value.toLowerCase(), []] as const;
    })).then(entries => { if (live) setAirportCandidates(Object.fromEntries(entries)); }).finally(() => { if (live) setAirportLoading(false); });
    return () => { live = false; };
  }, [airportColumns, dataRows, headers]);

  const aircraftColumn = fieldColumn("aircraft_type");
  useEffect(() => {
    let live = true;
    const values = aircraftColumn
      ? [...new Set(dataRows.map(row => (row.values[Number(aircraftColumn)] || "").trim()).filter(Boolean))]
      : [];
    if (!values.length) { setAircraftCandidates({}); return; }
    Promise.all(values.map(async value => {
      try {
        const response = await fetch(`/api/aircraft-catalog?q=${encodeURIComponent(value)}`, { cache: "no-store" });
        const body = await response.json();
        return [value.toLowerCase(), response.ok && Array.isArray(body.items) ? body.items as AircraftOption[] : []] as const;
      } catch { return [value.toLowerCase(), []] as const; }
    })).then(entries => { if (live) setAircraftCandidates(Object.fromEntries(entries)); });
    return () => { live = false; };
  }, [aircraftColumn, dataRows]);

  const aircraftResult = useCallback((row: { values: string[] }): NormalizedValue => {
    const original = aircraftColumn ? (row.values[Number(aircraftColumn)] || "").trim() : "";
    if (!original) return { original, normalized: "", status: "Unresolved" };
    const options = aircraftCandidates[original.toLowerCase()] || [];
    const key = original.toLowerCase().replace(/[\s-]+/g, "");
    const exact = options.filter(option => [option.code, option.name, ...(option.aliases || [])]
      .some(value => value.toLowerCase().replace(/[\s-]+/g, "") === key));
    if (exact.length === 1) return { original, normalized: exact[0].code, status: "Resolved" };
    if (options.length === 1 && /^[AB]\d{3}$/i.test(options[0].code)) return { original, normalized: options[0].code, status: "Resolved" };
    return normalizeAircraftValue(original);
  }, [aircraftCandidates, aircraftColumn]);

  const airportCodeFallback = useCallback((field: "departure_airport" | "arrival_airport", row: { values: string[] }) => airportCodeFromColumns(field, headers, row.values), [headers]);
  const airportResult = useCallback((field: "departure_airport" | "arrival_airport", row: { sourceRow: number; values: string[] }): NormalizedValue & { candidates: Airport[] } => {
    const column = fieldColumn(field); const original = column ? (row.values[Number(column)] || "").trim() : ""; const fallbackCode = airportCodeFallback(field, row); const embeddedCode = original.toUpperCase().match(/\b[A-Z]{4}\b/)?.[0] || ""; const queryCode = fallbackCode || embeddedCode; const key = original.toLowerCase();
    const displayOriginal = original || queryCode;
    const candidates = airportCandidates[key] || airportCandidates[queryCode.toLowerCase()] || []; const selected = rowAirportSelections[`${field}:${row.sourceRow}`] || airportSelections[key] || airportSelections[queryCode.toLowerCase()];
    if (!displayOriginal) return { original: "", normalized: "", status: "Unresolved", candidates };
    if (selected) return { original: displayOriginal, normalized: airportCodes(selected), status: "Resolved", candidates };
    const code = /^[A-Z]{3,4}$/i.test(displayOriginal) || Boolean(queryCode);
    const exact = candidates.filter(item => [item.name, item.iata, item.icao, item.ident, item.municipality].filter(Boolean).some(value => String(value).trim().toLowerCase() === key));
    if ((code || fallbackCode) && candidates.length === 1) return { original: displayOriginal, normalized: airportCodes(candidates[0]), status: "Resolved", candidates };
    if (!code && exact.length === 1) return { original: displayOriginal, normalized: airportCodes(exact[0]), status: "Resolved", candidates };
    // The shared airport search also resolves maintained aliases (for example
    // 天津滨海 -> TSN/ZBTJ). Those aliases are intentionally not copied onto
    // the airport row, so the query will not appear in `exact`. A single
    // catalog result is nevertheless an unambiguous resolution and should be
    // applied automatically; cities with multiple airports remain pending.
    if (!code && candidates.length === 1) return { original: displayOriginal, normalized: airportCodes(candidates[0]), status: "Resolved", candidates };
    return { original: displayOriginal, normalized: displayOriginal, status: candidates.length > 1 ? "Needs Confirmation" : "Unresolved", candidates };
  }, [airportCandidates, airportCodeFallback, airportSelections, fieldColumn, rowAirportSelections]);

  const normalizedRows = useMemo(() => dataRows.map(row => {
    const value = (field: ExcelField) => { const override = rowOverrides[`${row.sourceRow}:${field}`]; if (override !== undefined) return override; const column = fieldColumn(field); return column ? row.values[Number(column)] || "" : ""; };
    const pair = normalizeFlightPair(value("airline"), value("flight_number"));
    const fields: Record<string, NormalizedValue & { candidates?: Airport[] }> = {
      departure_airport: airportResult("departure_airport", row), arrival_airport: airportResult("arrival_airport", row),
      airline: pair.airline, flight_number: pair.flightNumber,
      aircraft_type: aircraftResult(row), departure_date: normalizeDateValue(value("departure_date"), dateFormat), arrival_date: normalizeDateValue(value("arrival_date"), dateFormat),
      departure_time: normalizeTimeValue(value("departure_time")), arrival_time: normalizeTimeValue(value("arrival_time")), flight_duration: normalizeDurationValue(value("flight_duration")),
      status: value("status") ? { original: value("status"), normalized: value("status").toLowerCase(), status: "Resolved" } : { original: "", normalized: "", status: "Unresolved" },
      row_number: { original: String(row.sourceRow), normalized: String(row.sourceRow), status: "Resolved" },
    };
    return { sourceRow: row.sourceRow, fields };
  }), [aircraftResult, airportResult, dataRows, dateFormat, fieldColumn, rowOverrides]);

  useEffect(() => {
    if (!sheets.length) { setExistingFlights([]); return; }
    let live = true;
    setDuplicateLoading(true);
    fetch("/api/flights/import-check", { cache: "no-store" }).then(response => response.ok ? response.json() : { flights: [] }).then(body => { if (live) setExistingFlights(Array.isArray(body.flights) ? body.flights : []); }).catch(() => { if (live) setExistingFlights([]); }).finally(() => { if (live) setDuplicateLoading(false); });
    return () => { live = false; };
  }, [sheets.length]);

  const reviews = useMemo(() => {
    const seen: Record<string, unknown>[] = [];
    return normalizedRows.map(row => {
      const base = validateImportFields(row.fields);
      const duplicate = detectImportDuplicate(row.fields, [...existingFlights, ...seen] as never[]);
      const status: ReviewStatus = skippedRows.has(row.sourceRow) ? "Skipped" : base.status === "Incomplete" ? "Incomplete" : duplicate.kind !== "none" ? "Duplicate" : base.status;
      const rawReasons = [...base.reasons, ...(duplicate.reason ? [duplicate.reason] : [])];
      if (base.status === "Needs Review" && !rawReasons.length) rawReasons.push("One or more fields require confirmation.");
      const reasons = rawReasons.map(reason => t(reason));
      seen.push({ id: `row-${row.sourceRow}`, flight_date: row.fields.departure_date.normalized, flight_number: row.fields.flight_number.normalized, airline: row.fields.airline.normalized, departure_airport_iata: row.fields.departure_airport.normalized, arrival_airport_iata: row.fields.arrival_airport.normalized });
      return { ...row, status, reasons, duplicate: duplicate.kind };
    });
  }, [existingFlights, normalizedRows, skippedRows, t]);
  const reviewCounts = useMemo(() => reviews.reduce<Record<string, number>>((counts, row) => { counts[row.status] = (counts[row.status] || 0) + 1; return counts; }, {}), [reviews]);
  const visibleReviews = useMemo(() => reviews.filter(row => (reviewFilter === "All" || row.status === reviewFilter) && (!onlyIssues || row.status !== "Ready")), [onlyIssues, reviewFilter, reviews]);
  const updateRowValue = (sourceRow: number, field: ExcelField, value: string) => setRowOverrides(previous => ({ ...previous, [`${sourceRow}:${field}`]: value }));
  const focusReviewRow = (sourceRow: number) => {
    document.querySelector<HTMLElement>(`[data-excel-review-row="${sourceRow}"] input[data-review-field]`)?.focus();
  };
  const toggleRowSelection = (sourceRow: number) => setSelectedRows(previous => { const next = new Set(previous); if (next.has(sourceRow)) next.delete(sourceRow); else next.add(sourceRow); return next; });
  const bulkSkip = () => { setSkippedRows(previous => new Set([...previous, ...selectedRows])); setSelectedRows(new Set()); };
  const airportForRow = useCallback((row: (typeof normalizedRows)[number], field: "departure_airport" | "arrival_airport") => {
    const item = row.fields[field];
    const original = item.original.toLowerCase();
    return rowAirportSelections[`${field}:${row.sourceRow}`] || airportSelections[original] || item.candidates?.find(airport => airportCodes(airport) === item.normalized) || item.candidates?.find(airport => [airport.iata, airport.icao, airport.ident].includes(item.normalized));
  }, [airportSelections, rowAirportSelections]);
  const importableRows = useMemo(() => reviews.filter(row => row.status === "Ready"), [reviews]);
  const buildImportRecord = useCallback((row: (typeof normalizedRows)[number]) => {
    const departure = airportForRow(row, "departure_airport"); const arrival = airportForRow(row, "arrival_airport");
    if (!departure || !arrival || !departure.timezone || !arrival.timezone) throw new Error("Airport details or timezone are missing.");
    const departureDate = row.fields.departure_date.normalized; const arrivalDate = row.fields.arrival_date.normalized;
    const departureTime = row.fields.departure_time.normalized.slice(0, 5); const arrivalTime = row.fields.arrival_time.normalized.slice(0, 5);
    const completeSchedule = Boolean(departureDate && arrivalDate && departureTime && arrivalTime);
    const departureUtc = completeSchedule ? getScheduledFlightTime(departureDate, departureTime, departure.timezone) : { iso: null, error: null };
    const arrivalUtc = completeSchedule ? getScheduledFlightTime(arrivalDate, arrivalTime, arrival.timezone) : { iso: null, error: null };
    if (departureUtc.error || arrivalUtc.error || (completeSchedule && (!departureUtc.iso || !arrivalUtc.iso))) throw new Error(departureUtc.error || arrivalUtc.error || "Unable to resolve flight times.");
    const importedDuration = row.fields.flight_duration.normalized ? Number(row.fields.flight_duration.normalized) : null;
    const scheduledDuration = completeSchedule ? Math.round((new Date(arrivalUtc.iso!).getTime() - new Date(departureUtc.iso!).getTime()) / 60000) : importedDuration != null && Number.isSafeInteger(importedDuration) && importedDuration >= 0 ? importedDuration : null;
    if (scheduledDuration != null && scheduledDuration < 0) throw new Error("Arrival must not precede departure.");
    const code = (airport: Airport) => airport.iata || airport.icao || airport.ident || airport.name;
    return { row_number: row.sourceRow, data: {
      flight_date: departureDate || arrivalDate || null, flight_number: row.fields.flight_number.normalized, airline: row.fields.airline.normalized,
      departure_airport: code(departure), arrival_airport: code(arrival),
      departure_airport_iata: departure.iata || "", departure_airport_icao: departure.icao || "", departure_airport_name: departure.name, departure_country_code: departure.countryCode || "", departure_timezone: departure.timezone, departure_local_date: departureDate, departure_local_time: departureTime, departure_scheduled_at_utc: departureUtc.iso,
      arrival_airport_iata: arrival.iata || "", arrival_airport_icao: arrival.icao || "", arrival_airport_name: arrival.name, arrival_country_code: arrival.countryCode || "", arrival_timezone: arrival.timezone, arrival_local_date: arrivalDate, arrival_local_time: arrivalTime, arrival_scheduled_at_utc: arrivalUtc.iso,
      scheduledDurationMinutes: scheduledDuration, aircraft_type: row.fields.aircraft_type.normalized, registration: "", notes: "", status: completeSchedule && row.fields.status.normalized !== "planned" ? "completed" : "planned", source: "manual", is_user_modified: false,
    }};
  }, [airportForRow]);
  async function importSelectedRows(rows = reviews) {
    if (importing || !rows.length) return;
    const currentBatch = batchId || crypto.randomUUID(); setBatchId(currentBatch); setImporting(true); setError("");
    try {
      const records = rows.map(row => {
        if (row.status === "Ready") {
          try { return buildImportRecord(row); } catch (caught) { return { row_number: row.sourceRow, data: {}, preflight_result: "failed", error_type: "validation", error_message: caught instanceof Error ? caught.message : "Unable to prepare this row.", suggestion: "Correct the row and retry it." }; }
        }
        const originalData = Object.fromEntries(Object.entries(row.fields).map(([field, value]) => [field, value.original]));
        return { row_number: row.sourceRow, data: originalData, preflight_result: row.status === "Skipped" ? "skipped" : "failed", error_type: "review", error_message: row.reasons.join(" ") || "This row was not approved for import.", suggestion: row.status === "Skipped" ? "Remove the skip decision to include this row." : "Resolve the review issues and retry this row." };
      });
      const response = await fetch("/api/flights/import-batch", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ batchId: currentBatch, fileName, totalRecords: reviews.length, records }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "The import could not be completed.");
      const returned = body.results || [];
      setImportResults(previous => previous ? [...previous.filter(old => !returned.some((next: { rowNumber: number }) => next.rowNumber === old.rowNumber)), ...returned] : returned);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "The import could not be completed."); }
    finally { setImporting(false); }
  }
  const resultCounts = useMemo(() => (importResults || []).reduce<Record<string, number>>((counts, row) => { counts[row.result] = (counts[row.result] || 0) + 1; return counts; }, {}), [importResults]);
  const retryFailedRows = () => { const failed = new Set((importResults || []).filter(row => row.result === "failed").map(row => row.rowNumber)); void importSelectedRows(importableRows.filter(row => failed.has(row.sourceRow))); };

  useEffect(() => {
    if (!confirmation) { setConfirmationOptions([]); return; }
    const local = airportCandidates[confirmation.original.toLowerCase()] || [];
    if (!confirmationQuery.trim()) { setConfirmationOptions(local); return; }
    let live = true; const timer = setTimeout(async () => { try { const response = await fetch(`/api/airports?q=${encodeURIComponent(confirmationQuery.trim())}`, { cache: "no-store" }); const body = await response.json(); if (live) setConfirmationOptions(response.ok && Array.isArray(body.airports) ? body.airports : []); } catch { if (live) setConfirmationOptions([]); } }, 180);
    return () => { live = false; clearTimeout(timer); };
  }, [airportCandidates, confirmation, confirmationQuery]);

  const runAutoMatch = useCallback((preserve = true) => {
    const result = autoMatch(headers, dataRows.map(row => row.values), preserve ? locked : new Set());
    setMapping(previous => preserve ? { ...result.result, ...Object.fromEntries([...locked].map(index => [index, previous[index]])) } : result.result);
    setConfidence(result.confidence);
  }, [dataRows, headers, locked]);
  useEffect(() => { if (headers.length) { setLocked(new Set()); const result = autoMatch(headers, dataRows.map(row => row.values)); setMapping(result.result); setConfidence(result.confidence); } }, [selectedSheet, headerIndex, headers.length]); // eslint-disable-line react-hooks/exhaustive-deps

  async function parse(file: File) {
    setError("");
    const lower = file.name.toLowerCase();
    if (!extensions.some(extension => lower.endsWith(extension))) { setError(t("Only .xlsx, .xls, and .csv files are supported.")); return; }
    if (file.size > MAX_FILE_SIZE) { setError(t("The file must be 10 MB or smaller.")); return; }
    setLoading(true);
    try {
      const XLSX = await import("xlsx");
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: false, cellNF: false, cellText: true, bookVBA: false });
      const parsed = workbook.SheetNames.map(name => {
        const sheet = workbook.Sheets[name];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: false, blankrows: true }) as unknown[][];
        return { name, rawRows: rows.map(row => row.map(value => value == null ? "" : String(value))) };
      });
      if (!parsed.length) throw new Error("No worksheets were found.");
      setFileName(file.name); setSheets(parsed); setSelectedSheet(parsed[0].name); setHeaderMode("auto"); setManualHeader(0); setLocked(new Set());
    } catch (caught) { console.error("[excel-import] parse failed", caught); setError(t("This file could not be parsed. Please check the file and try again.")); }
    finally { setLoading(false); }
  }
  function choose(event: React.ChangeEvent<HTMLInputElement>) { const file = event.target.files?.[0]; if (file) void parse(file); event.target.value = ""; }
  function changeMapping(index: number, value: ExcelField | "ignore") {
    setMapping(previous => { const next = { ...previous }; Object.keys(next).forEach(key => { if (Number(key) !== index && next[Number(key)] === value && value !== "ignore") next[Number(key)] = "ignore"; }); next[index] = value; return next; });
    setLocked(previous => new Set(previous).add(index));
  }
  function openConfirmation(field: "departure_airport" | "arrival_airport", row: { sourceRow: number; fields: Record<string, NormalizedValue & { candidates?: Airport[] }> }) {
    const result = row.fields[field];
    if (!result.original) return;
    setConfirmation({ field, sourceRow: row.sourceRow, original: result.original }); setConfirmationQuery(""); setConfirmationOptions(result.candidates || []);
  }
  function chooseAirport(airport: Airport, applyAll: boolean) {
    if (!confirmation) return;
    const key = confirmation.original.toLowerCase();
    if (applyAll) setAirportSelections(previous => ({ ...previous, [key]: airport }));
    else setRowAirportSelections(previous => ({ ...previous, [`${confirmation.field}:${confirmation.sourceRow}`]: airport }));
    setConfirmation(null); setConfirmationQuery("");
  }
  const autoMatched = Object.values(mapping).filter(value => value !== "ignore").length;
  return <div className="mt-8 space-y-6">
    {!sheets.length ? <section className={`rounded-2xl border-2 border-dashed p-8 text-center transition ${dragging ? "border-brand bg-brand-soft" : "border-line-strong bg-surface"}`} onDragOver={event => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={event => { event.preventDefault(); setDragging(false); const file = event.dataTransfer.files[0]; if (file) void parse(file); }}>
      <div className="mx-auto max-w-xl"><div className="text-4xl text-brand">⇧</div><h2 className="mt-3 text-xl font-bold"><T id="excel.uploadTitle" /></h2><p className="mt-2 text-sm text-muted"><T id="excel.uploadHelp" /></p><button type="button" className="button-primary mt-5" onClick={() => input.current?.click()} disabled={loading}>{loading ? <T id="excel.parsing" /> : <T id="excel.chooseFile" />}</button><p className="mt-3 text-xs text-subtle"><T id="excel.fileLimit" /></p></div>
    </section> : <>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-4"><div className="min-w-0"><p className="text-sm font-bold text-ink">{fileName}</p><p className="text-xs text-muted">{sheets.length} <T id="excel.sheets" /> · {dataRows.length} <T id="excel.rows" /></p></div><button type="button" className="button-secondary" onClick={() => input.current?.click()}><T id="excel.replaceFile" /></button></div>
      <section className="rounded-2xl border border-line bg-surface p-5"><div className="flex flex-wrap items-end gap-4"><label className="min-w-[12rem] flex-1 text-sm font-semibold"><T id="excel.sheet" /><select value={selectedSheet} onChange={event => setSelectedSheet(event.target.value)} className="mt-1.5 w-full rounded-xl border border-line-strong bg-surface px-3 py-3 text-sm">{sheets.map(sheet => <option key={sheet.name} value={sheet.name}>{sheet.name}</option>)}</select></label><label className="min-w-[12rem] flex-1 text-sm font-semibold"><T id="excel.headerMode" /><select value={headerMode} onChange={event => setHeaderMode(event.target.value as typeof headerMode)} className="mt-1.5 w-full rounded-xl border border-line-strong bg-surface px-3 py-3 text-sm"><option value="auto">{t("Auto-detect header")}</option><option value="manual">{t("Choose header row")}</option><option value="none">{t("No header row")}</option></select></label>{headerMode === "manual" && <label className="w-40 text-sm font-semibold"><T id="excel.headerRow" /><select value={manualHeader} onChange={event => setManualHeader(Number(event.target.value))} className="mt-1.5 w-full rounded-xl border border-line-strong bg-surface px-3 py-3 text-sm">{(current?.rawRows || []).slice(0, 30).map((_, index) => <option key={index} value={index}>{index + 1}</option>)}</select></label>}</div>{headerMode === "auto" && <p className="mt-3 text-xs text-muted">{headerIndex >= 0 ? t("Header row detected") + `: ${headerIndex + 1}` : t("No clear header row found; please choose one or use no-header mode.")}</p>}</section>
      <section className="overflow-hidden rounded-2xl border border-line bg-surface"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-5"><div><h2 className="text-xl font-bold"><T id="excel.matchTitle" /></h2><p className="mt-1 text-sm text-muted"><T id="excel.matchHelp" /></p></div><div className="flex flex-wrap gap-2"><button type="button" className="button-secondary !px-3 !py-2 text-xs" onClick={() => runAutoMatch(true)}><T id="excel.autoMatch" /></button><button type="button" className="button-secondary !px-3 !py-2 text-xs" onClick={() => { setLocked(new Set()); runAutoMatch(false); }}><T id="excel.resetMapping" /></button><button type="button" className="button-secondary !px-3 !py-2 text-xs" onClick={() => { setMapping(previous => Object.fromEntries(Object.keys(previous).map(key => [key, "ignore"]))); setLocked(new Set()); }}><T id="excel.ignoreUnmatched" /></button></div></div><div className="overflow-x-auto"><table className="min-w-[760px] w-full text-left text-sm"><thead className="bg-surface-muted text-xs uppercase tracking-wider text-subtle"><tr><th className="px-4 py-3"><T id="excel.yourColumn" /></th><th className="px-4 py-3"><T id="excel.sampleData" /></th><th className="px-4 py-3"><T id="excel.flightDeskField" /></th><th className="px-4 py-3"><T id="excel.status" /></th></tr></thead><tbody>{headers.map((header, index) => <tr key={`${header}-${index}`} className="border-t border-line"><td className="max-w-48 truncate px-4 py-3 font-semibold" title={header}>{header}</td><td className="max-w-64 truncate px-4 py-3 text-muted">{(dataRows.slice(0, 3).map(row => row.values[index] || "—").join(" · ")) || "—"}</td><td className="px-4 py-3"><select value={mapping[index] || "ignore"} onChange={event => changeMapping(index, event.target.value as ExcelField | "ignore")} className="w-full min-w-48 rounded-lg border border-line-strong bg-surface px-2 py-2 text-sm"><option value="ignore"><T id="excel.ignore" /></option>{excelFields.map(([value, label]) => <option key={value} value={value}>{t(label)}</option>)}</select></td><td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs font-bold ${mapping[index] && mapping[index] !== "ignore" ? confidence[index] === "High" ? "bg-completed-bg text-completed-fg" : confidence[index] === "Medium" ? "bg-brand-soft text-brand" : "bg-surface-muted text-muted" : "bg-surface-muted text-muted"}`}>{mapping[index] && mapping[index] !== "ignore" ? confidence[index] : t("Ignored")}</span></td></tr>)}</tbody></table></div></section>
      <section className="overflow-hidden rounded-2xl border border-line bg-surface"><div className="flex items-center justify-between gap-3 border-b border-line p-5"><div><h2 className="text-xl font-bold"><T id="excel.previewTitle" /></h2><p className="mt-1 text-sm text-muted">{autoMatched} <T id="excel.fieldsMapped" /> · {Math.min(dataRows.length, 10)} <T id="excel.previewRows" /></p></div></div><div className="overflow-x-auto"><table className="min-w-[900px] w-full text-left text-sm"><thead className="bg-surface-muted text-xs uppercase tracking-wider text-subtle"><tr><th className="px-4 py-3">#</th>{headers.map((_, index) => mapping[index] && mapping[index] !== "ignore" ? <th key={index} className="px-4 py-3">{t(excelFields.find(([value]) => value === mapping[index])?.[1] || "")}</th> : null)}</tr></thead><tbody>{dataRows.slice(0, 10).map(row => <tr key={row.sourceRow} className="border-t border-line"><td className="px-4 py-3 text-muted">{row.sourceRow}</td>{headers.map((_, index) => mapping[index] && mapping[index] !== "ignore" ? <td key={index} className="max-w-56 truncate px-4 py-3">{row.values[index] || "—"}</td> : null)}</tr>)}</tbody></table></div></section>
      <section className="overflow-hidden rounded-2xl border border-line bg-surface"><div className="flex flex-wrap items-end justify-between gap-3 border-b border-line p-5"><div><h2 className="text-xl font-bold"><T id="excel.normalizationTitle" /></h2><p className="mt-1 text-sm text-muted"><T id="excel.normalizationHelp" /></p></div><label className="text-sm font-semibold"><T id="excel.dateFormat" /><select value={dateFormat} onChange={event => setDateFormat(event.target.value as typeof dateFormat)} className="ml-2 rounded-lg border border-line-strong bg-surface px-2 py-2 text-sm"><option value="MM/DD/YYYY">MM/DD/YYYY</option><option value="DD/MM/YYYY">DD/MM/YYYY</option><option value="YYYY-MM-DD">YYYY-MM-DD</option></select></label></div>{airportLoading && <p className="border-b border-line px-5 py-3 text-xs text-muted"><T id="excel.resolvingAirports" /></p>}<div className="overflow-x-auto"><table className="min-w-[1040px] w-full text-left text-sm"><thead className="bg-surface-muted text-xs uppercase tracking-wider text-subtle"><tr><th className="px-4 py-3">#</th>{(["departure_airport", "arrival_airport", "airline", "flight_number", "aircraft_type", "departure_date", "arrival_date", "departure_time", "arrival_time", "flight_duration"] as ExcelField[]).map(field => <th key={field} className="px-4 py-3">{t(excelFields.find(([value]) => value === field)?.[1] || "")}</th>)}</tr></thead><tbody>{normalizedRows.slice(0, 10).map(row => <tr key={row.sourceRow} className="border-t border-line align-top"><td className="px-4 py-3 text-muted">{row.sourceRow}</td>{(["departure_airport", "arrival_airport", "airline", "flight_number", "aircraft_type", "departure_date", "arrival_date", "departure_time", "arrival_time", "flight_duration"] as ExcelField[]).map(field => { const item = row.fields[field]; const airportField = field === "departure_airport" || field === "arrival_airport"; const status = !item.original ? "Not Provided" : item.status; return <td key={field} className="max-w-44 px-4 py-3"><p className="truncate" title={item.original}>{item.normalized || "—"}</p><p className="mt-1 truncate text-xs text-muted" title={item.original}>{item.original || "—"}</p><button type="button" onClick={() => airportField ? openConfirmation(field, row) : undefined} className={`mt-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${status === "Resolved" ? "bg-completed-bg text-completed-fg" : status === "Needs Confirmation" ? "bg-brand-soft text-brand" : status === "Not Provided" ? "bg-surface-muted text-muted" : "bg-danger-bg text-danger-fg"}`}>{status === "Resolved" ? <T id="excel.resolved" /> : status === "Needs Confirmation" ? <T id="excel.needsConfirmation" /> : status === "Not Provided" ? t("Not Provided") : <T id="excel.unresolved" />}{airportField && item.status !== "Resolved" && item.original ? " · " : ""}</button></td>; })}</tr>)}</tbody></table></div></section>
      {confirmation && <section className="rounded-2xl border border-brand/40 bg-brand-soft/30 p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-bold"><T id="excel.confirmationTitle" /></h2><p className="mt-1 text-sm text-muted"><T id="excel.originalValue" />: <strong>{confirmation.original}</strong></p></div><button type="button" className="button-secondary !px-3 !py-2 text-xs" onClick={() => setConfirmation(null)}><T id="common.close" /></button></div><input value={confirmationQuery} onChange={event => setConfirmationQuery(event.target.value)} placeholder={t("Search airport by code, name or city")} className="mt-4 w-full rounded-xl border border-line-strong bg-surface px-3 py-3 text-sm" />{confirmationOptions.length ? <div className="mt-3 grid gap-2 sm:grid-cols-2">{confirmationOptions.map(airport => <div key={airport.id || airport.name} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface p-3"><div className="min-w-0"><p className="truncate font-semibold">{airportCodes(airport)} — {airport.name}</p><p className="truncate text-xs text-muted">{[airport.municipality, airport.countryName].filter(Boolean).join(", ")}</p></div><div className="flex shrink-0 gap-1"><button type="button" className="button-primary !min-h-8 !px-2 !py-1 text-xs" onClick={() => chooseAirport(airport, false)}><T id="excel.select" /></button><button type="button" className="button-secondary !min-h-8 !px-2 !py-1 text-xs" onClick={() => chooseAirport(airport, true)}><T id="excel.applyAll" /></button></div></div>)}</div> : <p className="mt-3 text-sm text-muted"><T id="excel.noAirportMatches" /></p>}</section>}
      <section className="overflow-hidden rounded-2xl border border-line bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-5"><div><h2 className="text-xl font-bold">{t("Validation & Review")}</h2><p className="mt-1 text-sm text-muted">{duplicateLoading ? t("Checking your existing flights…") : t("Review every row before the future import step. Nothing is saved yet.")}</p></div><button type="button" className="button-secondary !px-3 !py-2 text-xs" disabled={!selectedRows.size} onClick={bulkSkip}>{t("Skip selected")}</button></div>
        <div className="grid grid-cols-2 gap-2 border-b border-line p-4 text-sm sm:grid-cols-5"><div><strong>{reviews.length}</strong><span className="ml-1 text-muted">{t("Total")}</span></div><div><strong className="text-completed-fg">{reviewCounts.Ready || 0}</strong><span className="ml-1 text-muted">{t("Ready")}</span></div><div><strong className="text-brand">{reviewCounts["Needs Review"] || 0}</strong><span className="ml-1 text-muted">{t("Needs Review")}</span></div><div><strong className="text-danger-fg">{reviewCounts.Incomplete || 0}</strong><span className="ml-1 text-muted">{t("Incomplete")}</span></div><div><strong>{reviewCounts.Duplicate || 0}</strong><span className="ml-1 text-muted">{t("Duplicate")}</span></div></div>
        <div className="flex flex-wrap items-center gap-2 border-b border-line p-4"><select value={reviewFilter} onChange={event => setReviewFilter(event.target.value as ReviewStatus | "All")} className="rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm"><option value="All">{t("All")}</option>{(["Ready", "Needs Review", "Incomplete", "Duplicate", "Skipped"] as ReviewStatus[]).map(status => <option key={status} value={status}>{t(status)}</option>)}</select><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={onlyIssues} onChange={event => setOnlyIssues(event.target.checked)} />{t("Only Show Issues")}</label></div>
        <div className="max-h-[42rem] overflow-auto"><table className="min-w-[980px] w-full text-left text-sm"><thead className="sticky top-0 z-10 bg-surface-muted text-xs uppercase tracking-wider text-subtle"><tr><th className="px-3 py-3">{t("Select")}</th><th className="px-3 py-3">#</th><th className="px-3 py-3">{t("Status")}</th><th className="px-3 py-3">{t("Reasons")}</th><th className="px-3 py-3">{t("Flight details")}</th></tr></thead><tbody>{visibleReviews.map(row => <tr key={row.sourceRow} data-excel-review-row={row.sourceRow} className="border-t border-line align-top"><td className="px-3 py-3"><input type="checkbox" checked={selectedRows.has(row.sourceRow)} onChange={() => toggleRowSelection(row.sourceRow)} /></td><td className="px-3 py-3 text-muted">{row.sourceRow}</td><td className="px-3 py-3"><span className={`rounded-full px-2 py-1 text-xs font-bold ${row.status === "Ready" ? "bg-completed-bg text-completed-fg" : row.status === "Needs Review" ? "bg-brand-soft text-brand" : row.status === "Skipped" ? "bg-surface-muted text-muted" : "bg-danger-bg text-danger-fg"}`}>{t(row.status)}</span>{row.status === "Needs Review" && <><p className="mt-2 text-xs text-brand">{t("Edit the highlighted fields or select an airport to resolve this row.")}</p><button type="button" className="mt-2 text-xs font-semibold text-brand underline" onClick={() => focusReviewRow(row.sourceRow)}>{t("Review fields")}</button></>}{row.status === "Duplicate" && <button type="button" className="mt-2 block text-xs font-semibold text-brand underline" onClick={() => setSkippedRows(previous => { const next = new Set(previous); next.delete(row.sourceRow); return next; })}>{t("Keep this row")}</button>}</td><td className="max-w-64 px-3 py-3 text-xs text-muted">{row.reasons.length ? row.reasons.join(" ") : t("No issues found.")}</td><td className="px-3 py-3"><div className="grid gap-2 sm:grid-cols-4">{(["departure_date", "departure_time", "arrival_time", "flight_number", "aircraft_type", "flight_duration"] as ExcelField[]).map(field => { const item = row.fields[field]; const issue = (item?.status !== "Resolved" && Boolean(item?.original)) || (field === "flight_duration" && Boolean(item?.original) && !/^\d+$/.test(item?.normalized || "")); return <label key={field} className="text-xs font-semibold text-muted">{t(excelFields.find(([value]) => value === field)?.[1] || field)}<input data-review-field={field} value={item?.original || ""} onChange={event => updateRowValue(row.sourceRow, field, event.target.value)} className={`mt-1 w-full min-w-28 rounded-lg border bg-surface px-2 py-2 text-xs ${issue ? "border-danger text-danger-fg ring-1 ring-danger/20" : "border-line-strong"}`} /></label>; })}<div className="text-xs font-semibold text-muted">{t("Airports")}<div className="mt-1 flex gap-1"><button type="button" className={`button-secondary !px-2 !py-1 text-xs ${row.fields.departure_airport?.status !== "Resolved" ? "border-danger text-danger-fg" : ""}`} onClick={() => openConfirmation("departure_airport", row)}>{row.fields.departure_airport?.normalized || t("Departure")}</button><button type="button" className={`button-secondary !px-2 !py-1 text-xs ${row.fields.arrival_airport?.status !== "Resolved" ? "border-danger text-danger-fg" : ""}`} onClick={() => openConfirmation("arrival_airport", row)}>{row.fields.arrival_airport?.normalized || t("Arrival")}</button></div></div></div></td></tr>)}</tbody></table>{!visibleReviews.length && <p className="p-6 text-sm text-muted">{t("No records match this filter.")}</p>}</div>
        {importResults ? <div className="border-t border-line bg-surface-muted p-5"><h3 className="font-bold">{t("Import Complete")}</h3><div className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4"><span>{t("Total Records")}: <strong>{importResults.length}</strong></span><span>{t("Successfully Imported")}: <strong>{resultCounts.imported || 0}</strong></span><span>{t("Already Imported")}: <strong>{resultCounts.already_imported || 0}</strong></span><span>{t("Failed")}: <strong>{resultCounts.failed || 0}</strong></span></div><div className="mt-4 flex flex-wrap gap-2"><a href="/flights" className="button-primary">{t("View My Flights")}</a>{resultCounts.failed ? <button type="button" className="button-secondary" disabled={importing} onClick={retryFailedRows}>{t("Retry Failed Records")}</button> : null}<button type="button" className="button-secondary" onClick={() => setImportResults(null)}>{t("Return to Import Review")}</button></div></div> : <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-surface-muted p-5"><div><p className="font-bold">{t("Import Summary")}</p><p className="mt-1 text-sm text-muted">{t("Only Ready records will be imported.")} {importableRows.length} {t("records ready")}</p></div><button type="button" className="button-primary" disabled={importing || !importableRows.length} onClick={() => void importSelectedRows()}>{importing ? t("Importing…") : t("Import Ready Records")}</button></div>}
      </section>
      {importResults && <p className="rounded-xl border border-line bg-surface p-4 text-sm text-muted">{t("Skipped")}: {resultCounts.skipped || 0}</p>}
    </>}
    {error && <p role="alert" className="rounded-xl bg-danger-bg p-4 text-sm text-danger-fg">{error}</p>}
    <input ref={input} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={choose} />
  </div>;
}
