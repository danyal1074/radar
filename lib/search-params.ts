import { SORT_KEYS, toInt, toStr, type ListingFilters, type SortKey } from "./validation";

type SP = Record<string, string | string[] | undefined>;

function toPriceToman(v: string | string[] | undefined): number | undefined {
  const n = toInt(v);
  if (n === undefined) return undefined;
  // If user typed in millions (e.g. 450 instead of 450,000,000), automatically convert
  if (n > 0 && n <= 50_000) return n * 1_000_000;
  return n;
}

export function parseListingQuery(sp: SP, canScoreSort: boolean) {
  const filters: ListingFilters = {
    q: toStr(sp.q),
    make: toStr(sp.make),
    model: toStr(sp.model),
    city: toStr(sp.city),
    source: toStr(sp.source),
    yearMin: toInt(sp.yearMin),
    yearMax: toInt(sp.yearMax),
    priceMin: toPriceToman(sp.priceMin),
    priceMax: toPriceToman(sp.priceMax),
    mileageMin: toInt(sp.mileageMin),
    mileageMax: toInt(sp.mileageMax),
    onlyOpportunities: toStr(sp.opp) === "1" || toStr(sp.onlyOpportunities) === "1" || undefined,
    onlyUrgent: toStr(sp.urgent) === "1" || undefined,
    onlyPaintless: toStr(sp.paintless) === "1" || undefined,
    damageFilter: (toStr(sp.damage) as "all" | "clean_only" | "damaged_only") || undefined,
  };
  const rawSort = toStr(sp.sort) as SortKey | undefined;
  let sort: SortKey = rawSort && (SORT_KEYS as readonly string[]).includes(rawSort) ? rawSort : "newest";
  if (sort === "score" && !canScoreSort) sort = "discount";
  const page = Math.max(1, toInt(sp.page) ?? 1);
  return { filters, sort, page };
}

export function buildQuery(sp: SP, overrides: Record<string, string | number | undefined>): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    const s = Array.isArray(v) ? v[0] : v;
    if (s) params.set(k, s);
  }
  for (const [k, v] of Object.entries(overrides)) {
    if (v === undefined || v === "") params.delete(k);
    else params.set(k, String(v));
  }
  const q = params.toString();
  return q ? `?${q}` : "";
}
