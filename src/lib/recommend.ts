import type { Listing, ListingType } from "@/lib/types";
import { BUDGET_TOLERANCE, MAX_RECOMMENDATIONS } from "@/lib/constants";
import { formatPHPCompact } from "@/lib/utils";

// =============================================================================
// RULE-BASED LISTING RECOMMENDATIONS (no AI / API calls)
// Parses customer text for property type, location, budget and bedrooms, then
// ranks AVAILABLE listings by how many criteria they meet. Ties break by closest
// to the stated budget (falling back to lowest price).
// =============================================================================

export interface ParsedSignals {
  type?: ListingType;
  cities: string[]; // canonical city names found in the text
  budget?: number; // PHP ceiling
  bedrooms?: number; // 0 = studio
}

export interface Recommendation {
  listing: Listing;
  score: number; // number of criteria matched
  reasons: string[]; // short "why this matches" chips
}

// Maps loose location words/areas to the canonical `city` used on listings.
const CITY_ALIASES: Record<string, string> = {
  makati: "Makati",
  bgc: "Taguig",
  taguig: "Taguig",
  "fort bonifacio": "Taguig",
  fort: "Taguig",
  mckinley: "Taguig",
  uptown: "Taguig",
  "quezon city": "Quezon City",
  qc: "Quezon City",
  mandaluyong: "Mandaluyong",
  ortigas: "Mandaluyong",
  boni: "Mandaluyong",
  muntinlupa: "Muntinlupa",
  alabang: "Muntinlupa",
  paranaque: "Parañaque",
  "parañaque": "Parañaque",
  "bf homes": "Parañaque",
  bacoor: "Bacoor",
  molino: "Bacoor",
  imus: "Imus",
  "santa rosa": "Santa Rosa",
  "sta rosa": "Santa Rosa",
  "sta. rosa": "Santa Rosa",
  nuvali: "Santa Rosa",
  laguna: "Santa Rosa",
  tagaytay: "Tagaytay",
  silang: "Silang",
  cavite: "Imus",
};

const TYPE_ALIASES: Record<string, ListingType> = {
  condo: "condo",
  condominium: "condo",
  unit: "condo",
  house: "house",
  "house and lot": "house",
  bungalow: "house",
  townhouse: "townhouse",
  townhome: "townhouse",
  lot: "lot",
  land: "lot",
};

function parseType(text: string): ListingType | undefined {
  // Check multi-word aliases first for specificity.
  for (const key of ["house and lot", "condominium", "townhouse", "townhome", "condo", "house", "lot", "land", "unit", "bungalow"]) {
    if (text.includes(key)) return TYPE_ALIASES[key];
  }
  return undefined;
}

function parseCities(text: string): string[] {
  const found = new Set<string>();
  for (const [alias, city] of Object.entries(CITY_ALIASES)) {
    if (text.includes(alias)) found.add(city);
  }
  return [...found];
}

function parseBedrooms(text: string): number | undefined {
  if (/\bstudio\b/.test(text)) return 0;
  const m = text.match(/(\d+)\s*(?:br|beds?|bedrooms?|-?\s*bedroom)/);
  if (m) return parseInt(m[1], 10);
  return undefined;
}

function parseBudget(text: string): number | undefined {
  const re = /(?:(php|₱|peso[s]?)\s*)?([\d][\d,]*(?:\.\d+)?)\s*(million|mil|m|thousand|k)?\b/gi;
  let best: number | undefined;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    const currency = match[1];
    const num = parseFloat(match[2].replace(/,/g, ""));
    if (Number.isNaN(num)) continue;
    const suffix = (match[3] || "").toLowerCase();
    let multiplier = 1;
    if (suffix === "m" || suffix === "mil" || suffix === "million") multiplier = 1_000_000;
    else if (suffix === "k" || suffix === "thousand") multiplier = 1_000;
    const value = num * multiplier;
    // Only treat as money if there's a real cue: currency, a suffix, or a big plain number.
    const isMoney = Boolean(currency) || Boolean(suffix) || value >= 100_000;
    if (!isMoney) continue;
    if (best === undefined || value > best) best = value;
  }
  return best;
}

export function parseSignals(text: string): ParsedSignals {
  const t = text.toLowerCase();
  return {
    type: parseType(t),
    cities: parseCities(t),
    budget: parseBudget(t),
    bedrooms: parseBedrooms(t),
  };
}

/** Build a human-readable summary of what we detected, for the agent panel. */
export function describeSignals(s: ParsedSignals): string {
  const parts: string[] = [];
  if (s.type) parts.push(s.type);
  if (s.bedrooms !== undefined) parts.push(s.bedrooms === 0 ? "studio" : `${s.bedrooms}BR`);
  if (s.cities.length) parts.push(`in ${s.cities.join(" / ")}`);
  if (s.budget) parts.push(`up to ${formatPHPCompact(s.budget)}`);
  return parts.join(" · ");
}

export function hasSignals(s: ParsedSignals): boolean {
  return Boolean(s.type || s.cities.length || s.budget || s.bedrooms !== undefined);
}

export function recommendListings(text: string, listings: Listing[]): Recommendation[] {
  const signals = parseSignals(text);
  if (!hasSignals(signals)) return [];

  const live = listings.filter((l) => l.status === "available" && !l.deleted_at);
  const budgetCeiling = signals.budget ? signals.budget * (1 + BUDGET_TOLERANCE) : undefined;

  const scored: Recommendation[] = [];
  for (const listing of live) {
    const reasons: string[] = [];
    let score = 0;

    if (signals.type && listing.type === signals.type) {
      score++;
      reasons.push(cap(listing.type));
    }
    if (signals.cities.length && signals.cities.includes(listing.city)) {
      score++;
      reasons.push(`in ${listing.city}`);
    }
    if (budgetCeiling !== undefined && listing.price <= budgetCeiling) {
      score++;
      reasons.push(`within ${formatPHPCompact(signals.budget!)} budget`);
    }
    if (signals.bedrooms !== undefined && listing.bedrooms === signals.bedrooms) {
      score++;
      reasons.push(signals.bedrooms === 0 ? "studio" : `${signals.bedrooms}BR`);
    }

    if (score > 0) scored.push({ listing, score, reasons });
  }

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (signals.budget !== undefined) {
      const da = Math.abs(a.listing.price - signals.budget);
      const db = Math.abs(b.listing.price - signals.budget);
      if (da !== db) return da - db; // closest to budget first
    }
    return a.listing.price - b.listing.price; // fallback: cheapest first
  });

  return scored.slice(0, MAX_RECOMMENDATIONS);
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
