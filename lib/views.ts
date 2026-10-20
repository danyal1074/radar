import type { Store } from "./db/store";
import { ruleMatchesListing } from "./alerts/engine";
import { compare, opportunityScore } from "./pricing";
import { fuzzyIncludes, normalizeFa } from "./text";
import type { Listing, ListingView, WatchRule } from "./types";
import type { ListingFilters, SortKey } from "./validation";

export interface BuildOptions {
  userId: string;
  withScore: boolean;
  now?: Date;
}

/** Joins listings with the shared estimate and the user's private state. */
export async function buildListingViews(store: Store, opts: BuildOptions): Promise<ListingView[]> {
  const now = opts.now ?? new Date();
  const [listings, savedIds, followups, rules] = await Promise.all([
    store.listListings(),
    store.listSavedIds(opts.userId),
    store.listFollowups(opts.userId),
    store.listRules(opts.userId),
  ]);
  const estimates = await store.latestEstimates(listings.map((l) => l.id));
  const saved = new Set(savedIds);
  const fu = new Map(followups.map((f) => [f.listing_id, f]));
  const activeRules = rules.filter((r) => r.is_active);

  return listings.map((listing) => {
    const estimate = estimates.get(listing.id) ?? null;
    const comparison = compare(listing.price_toman, estimate, now);
    return {
      listing,
      estimate,
      comparison,
      saved: saved.has(listing.id),
      followup: fu.get(listing.id) ?? null,
      matchedRuleIds: activeRules.filter((r) => ruleMatchesListing(r, listing)).map((r) => r.id),
      score: opts.withScore ? opportunityScore(comparison, estimate?.confidence ?? null) : null,
    };
  });
}

export function applyFilters(views: ListingView[], f: ListingFilters): ListingView[] {
  return views.filter(({ listing: l, comparison }) => {
    if (f.q) {
      const hay = `${l.title} ${l.make} ${l.model} ${l.trim ?? ""} ${l.city ?? ""} ${l.color ?? ""}`;
      if (!fuzzyIncludes(hay, f.q)) return false;
    }
    if (f.make && normalizeFa(l.make) !== normalizeFa(f.make)) return false;
    if (f.model && normalizeFa(l.model) !== normalizeFa(f.model)) return false;
    if (f.city && normalizeFa(l.city) !== normalizeFa(f.city)) return false;
    if (f.source && l.source !== f.source) return false;
    if (f.yearMin !== undefined && (l.year === null || l.year < f.yearMin)) return false;
    if (f.yearMax !== undefined && (l.year === null || l.year > f.yearMax)) return false;
    if (f.priceMin !== undefined && l.price_toman < f.priceMin) return false;
    if (f.priceMax !== undefined && l.price_toman > f.priceMax) return false;
    if (f.mileageMin !== undefined && (l.mileage_km === null || l.mileage_km < f.mileageMin)) return false;
    if (f.mileageMax !== undefined && (l.mileage_km === null || l.mileage_km > f.mileageMax)) return false;
    if (f.onlyOpportunities && comparison.label !== "opportunity") return false;
    if (f.onlyUrgent) {
      const isUrgent = /پول\s*لازم|فروش\s*فوری|چک\s*دارم|تخفیف\s*خوب|زیر\s*قیمت|مهاجرت|نیاز\s*مالی/.test(
        `${l.title} ${l.description || ""}`,
      );
      if (!isUrgent) return false;
    }
    if (f.onlyPaintless) {
      const isPaintless = /بدون\s*رنگ|بی\s*رنگ|بی‌رنگ|شاسی\s*(سالم|پلمپ|پلمب)/.test(
        `${l.title} ${l.description || ""}`,
      );
      if (!isPaintless) return false;
    }
    return true;
  });
}

const when = (l: Listing) => l.published_at ?? l.first_seen_at;

export function applySort(views: ListingView[], sort: SortKey): ListingView[] {
  const out = [...views];
  const nullsLast = (a: number | null, b: number | null, desc: boolean) => {
    if (a === null && b === null) return 0;
    if (a === null) return 1;
    if (b === null) return -1;
    return desc ? b - a : a - b;
  };
  switch (sort) {
    case "price_asc":
      out.sort((a, b) => a.listing.price_toman - b.listing.price_toman);
      break;
    case "discount":
      out.sort((a, b) => {
        const aDiff = a.comparison.label === "missing_zero" ? null : a.comparison.diffToman;
        const bDiff = b.comparison.label === "missing_zero" ? null : b.comparison.diffToman;
        return nullsLast(aDiff, bDiff, true);
      });
      break;
    case "score":
      out.sort((a, b) => nullsLast(a.score, b.score, true));
      break;
    default:
      out.sort((a, b) => when(b.listing).localeCompare(when(a.listing)));
  }
  return out;
}

export function paginate<T>(items: T[], page: number, pageSize: number) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const current = Math.min(Math.max(1, page), totalPages);
  return {
    items: items.slice((current - 1) * pageSize, current * pageSize),
    page: current,
    totalPages,
    total: items.length,
  };
}

/** Distinct values for filter dropdowns. */
export function facets(views: ListingView[]) {
  const uniq = (xs: (string | null)[]) => [...new Set(xs.filter((x): x is string => !!x))].sort((a, b) => a.localeCompare(b, "fa"));
  return {
    makes: uniq(views.map((v) => v.listing.make)),
    models: uniq(views.map((v) => v.listing.model)),
    cities: uniq(views.map((v) => v.listing.city)),
    sources: uniq(views.map((v) => v.listing.source)),
  };
}

/** Listings the user's active rules actually flag right now. */
export function opportunitiesFor(views: ListingView[], rules: WatchRule[]): { view: ListingView; ruleNames: string[] }[] {
  const byId = new Map(rules.map((r) => [r.id, r]));
  const out: { view: ListingView; ruleNames: string[] }[] = [];
  for (const v of views) {
    if (v.comparison.label === "missing_zero") continue; // آگهی‌های اشتباه تایپی صفر به عنوان فرصت نمایش داده نمی‌شوند
    const names: string[] = [];
    for (const id of v.matchedRuleIds) {
      const r = byId.get(id);
      if (!r) continue;
      const hasThreshold =
        (r.min_discount_percent !== null && r.min_discount_percent > 0) ||
        (r.min_discount_toman !== null && r.min_discount_toman > 0);
      if (hasThreshold) {
        if (!v.comparison.fresh || v.comparison.diffPercent === null || v.comparison.diffToman === null) continue;
        const pctOk = r.min_discount_percent === null || v.comparison.diffPercent >= r.min_discount_percent;
        const tomOk = r.min_discount_toman === null || v.comparison.diffToman >= r.min_discount_toman;
        if (pctOk && tomOk) names.push(r.name);
      } else {
        // اگر کاربر شرط درصد تخفیف نگذاشته، هر خودرویی که با مشخصات فیلتر (برند، مدل، بودجه) همخوانی دارد فرصت است
        names.push(r.name);
      }
    }
    if (names.length) out.push({ view: v, ruleNames: names });
  }
  return out.sort((a, b) => {
    const diffB = b.view.comparison.diffPercent ?? 0;
    const diffA = a.view.comparison.diffPercent ?? 0;
    if (diffB !== diffA) return diffB - diffA;
    const whenB = b.view.listing.published_at ?? b.view.listing.first_seen_at;
    const whenA = a.view.listing.published_at ?? a.view.listing.first_seen_at;
    return whenB.localeCompare(whenA);
  });
}
