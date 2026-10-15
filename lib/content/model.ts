export const landingDefaults = {
  "landing.hero.eyebrow": "For everyone who looks up.",
  "landing.hero.title": "Your Flying,\nClearly Logged.",
  "landing.hero.description": "A personal home for your flying history. Capture the journeys, aircraft and memories that make you love aviation.",
  "landing.hero.primary_label": "Open your logbook",
  "landing.hero.secondary_label": "Explore Flight Desk",
  "landing.features.eyebrow": "A clearer view of your flying",
  "landing.features.title": "Keep the details.\nEnjoy the bigger picture.",
  "landing.features.description": "A thoughtful place to record your flights, without getting in the way of the experience.",
  "landing.features.logbook.title": "Every flight, in one place",
  "landing.features.logbook.description": "A personal logbook for the routes, aircraft and details you want to remember.",
  "landing.features.timezones.title": "Local times. Global perspective.",
  "landing.features.timezones.description": "Keep each journey’s local times and timezones together, wherever you fly.",
  "landing.features.privacy.title": "Private by default",
  "landing.features.privacy.description": "Your flight records belong to your account. Your personal history stays private.",
  "landing.features.enthusiasts.title": "For the love of aviation",
  "landing.features.enthusiasts.description": "Built for enthusiasts who notice the aircraft, remember the airports and enjoy the journey.",
  "landing.roadmap.eyebrow": "Our flight plan",
  "landing.roadmap.title": "Building the Next Journey",
  "landing.roadmap.description": "What’s ready, what’s taking shape, and what’s next.",
  "landing.roadmap.link_label": "View Full Roadmap",
  "landing.why.eyebrow": "Why Flight Desk",
  "landing.why.title": "A logbook today.\nMore possibilities ahead.",
  "landing.why.description": "Start with your flight history. Follow along as Flight Desk grows into a broader home for aviation enthusiasts.",
  "landing.why.link_label": "Follow the product roadmap",
  "landing.why.logbook.title": "Flight logbook",
  "landing.why.logbook.description": "Add, revisit and edit the details of your journeys.",
  "landing.why.logbook.status_label": "Available",
  "landing.why.aircraft.title": "Aircraft records",
  "landing.why.aircraft.description": "Keep aircraft types and registrations alongside your flights.",
  "landing.why.aircraft.status_label": "Available",
  "landing.why.airports.title": "Airport data",
  "landing.why.airports.description": "A verified starting collection, with global airport search planned.",
  "landing.why.airports.status_label": "Starter dataset",
  "landing.why.checklists.title": "Flight checklists",
  "landing.why.checklists.description": "A future toolkit for aviation enthusiasts and simulator pilots.",
  "landing.why.checklists.status_label": "Planned",
  "landing.why.maps.title": "Maps & statistics",
  "landing.why.maps.description": "Basic statistics today. Richer insights and route maps are on the flight plan.",
  "landing.why.maps.status_label": "Expansion planned",
  "landing.why.mobile.title": "Mobile experience",
  "landing.why.mobile.description": "A dedicated app is a future direction, without a committed release date.",
  "landing.why.mobile.status_label": "Planned",
  "landing.footer.tagline": "For the love of the journey.",
  "landing.footer.link_label": "Product roadmap",
  "landing.footer.copyright": ""
} as const;

export type LandingKey = keyof typeof landingDefaults;
export type LandingCopy = Record<LandingKey, string>;
export type ContentRow = { content_key: string; content: string; publication_status: "draft" | "published"; updated_at?: string };
export const landingSections = [
  { id: "hero", title: "Hero" }, { id: "features", title: "Core Features" },
  { id: "roadmap", title: "Product Roadmap" }, { id: "why", title: "Why Flight Desk" },
  { id: "footer", title: "Footer" },
] as const;
export const landingFields = (Object.keys(landingDefaults) as LandingKey[]).map(key => ({
  key,
  section: key.split(".")[1],
  label: key.split(".").slice(2).join(" · ").replaceAll("_", " "),
  required: key !== "landing.footer.copyright",
  maxLength: key.endsWith(".description") ? 2000 : key.endsWith(".title") ? 240 : key.endsWith(".copyright") ? 500 : 160,
}));
export function resolvePublishedCopy(rows: ContentRow[]): LandingCopy {
  const copy: LandingCopy = { ...landingDefaults };
  for (const row of rows) {
    const field = landingFields.find(field => field.key === row.content_key);
    if (!field || row.publication_status !== "published" || typeof row.content !== "string") continue;
    if (field.required && !row.content.trim()) continue;
    copy[field.key] = row.content;
  }
  return copy;
}
export function resolveDraftCopy(rows: ContentRow[]): LandingCopy {
  const copy = resolvePublishedCopy(rows);
  for (const row of rows) {
    if (row.publication_status === "draft" && Object.hasOwn(landingDefaults, row.content_key)) copy[row.content_key as LandingKey] = row.content;
  }
  return copy;
}
export function validateLandingDraft(input: unknown): LandingCopy {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Invalid landing-page draft.");
  const values = input as Record<string, unknown>;
  if (Object.keys(values).some(key => !Object.hasOwn(landingDefaults, key))) throw new Error("Unknown content field.");
  const output = {} as LandingCopy;
  for (const field of landingFields) {
    const value = values[field.key];
    if (typeof value !== "string") throw new Error(`Missing field: ${field.label}.`);
    const text = value.trim();
    if (field.required && !text) throw new Error(`Please complete ${field.label}.`);
    if ([...text].length > field.maxLength) throw new Error(`${field.label} must be ${field.maxLength} characters or fewer.`);
    output[field.key] = text;
  }
  return output;
}
