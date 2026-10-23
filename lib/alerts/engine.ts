import { makeMatchesListing } from "../brands";
import { computeDiff, detectPriceTypo, isEstimateFresh } from "../pricing";
import { fuzzyIncludes } from "../text";
import type { Listing, PriceEstimate, WatchRule } from "../types";

/**
 * Alert engine: pure functions, no I/O, no UI imports.
 * Delivery channels (in-app today; SMS / messenger later) consume `AlertHit`.
 */

function effectiveYear(l: Listing): number | null {
  if (l.year && l.year > 1300 && l.year < 1500) return l.year;
  const m4 = l.title.match(/\b(13[789]\d|140\d)\b/);
  if (m4) return Number(m4[1]);
  const m2 = l.title.match(/مدل\s*(\d{2})\b/);
  if (m2) {
    const y2 = Number(m2[1]);
    return y2 < 30 ? 1400 + y2 : 1300 + y2;
  }
  return null;
}

export function ruleMatchesListing(rule: WatchRule, l: Listing): boolean {
  if (rule.make && !makeMatchesListing(rule.make, l)) return false;
  if (rule.model && !fuzzyIncludes(`${l.model} ${l.trim ?? ""} ${l.title}`, rule.model)) return false;
  if (rule.source && l.source !== rule.source) return false;
  if (rule.city && !fuzzyIncludes(l.city, rule.city)) return false;

  const y = effectiveYear(l);
  if (rule.year_min !== null || rule.year_max !== null) {
    if (y === null) return false; // unknown year can't satisfy a year constraint
    if (rule.year_min !== null && y < rule.year_min) return false;
    if (rule.year_max !== null && y > rule.year_max) return false;
  }
  if (rule.mileage_min_km !== null || rule.mileage_max_km !== null) {
    if (l.mileage_km === null) return false;
    if (rule.mileage_min_km !== null && l.mileage_km < rule.mileage_min_km) return false;
    if (rule.mileage_max_km !== null && l.mileage_km > rule.mileage_max_km) return false;
  }
  if (rule.price_min_toman !== null && l.price_toman < rule.price_min_toman) return false;
  if (rule.price_max_toman !== null && l.price_toman > rule.price_max_toman) return false;

  // فیلتر فروش فوری و پول لازم
  if (rule.urgent_only) {
    const fullText = `${l.title} ${l.description ?? ""}`.toLowerCase();
    const isUrgent = /فوری|پول لازم|پوللازم|عجله|مهاجرت|زیر قیمت|پول نیاز|فروش سریع/i.test(fullText);
    if (!isUrgent) return false;
  }

  // فیلتر شاسی پلمپ و کاملاً بی‌رنگ
  if (rule.paint_free_only) {
    const fullText = `${l.title} ${l.description ?? ""}`.toLowerCase();
    const hasDamage = /دور رنگ|تمام رنگ|چند لکه|رنگ شدگی|رنگ دارد|شاسی ضربه|شاسی خوردگی|شاسی جوش|سرشاسی|تعویض اتاق|تصادفی|چپ شده/i.test(fullText);
    if (hasDamage) return false;
    const isClean = /بی رنگ|بی‌رنگ|بدون رنگ|پلمپ|بدون نقطه|سالم|صفر|خشک/i.test(fullText);
    if (!isClean) return false;
  }

  // فیلتر وضعیت بدنه و خودروهای تصادفی / تعمیری
  if (rule.damage_filter === "clean_only") {
    const fullText = `${l.title} ${l.description ?? ""}`.toLowerCase();
    const isDamaged = Boolean(l.is_damaged) || /دور\s*رنگ|تمام\s*رنگ|چند\s*لکه|شاسی\s*(ضربه|خوردگی|جوش|ترک)|سرشاسی|تعویض\s*اتاق|تصادفی|چپ\s*شده|چپی|سوخته|اسقاط|اوراق/i.test(fullText);
    if (isDamaged) return false;
  } else if (rule.damage_filter === "damaged_only") {
    const fullText = `${l.title} ${l.description ?? ""}`.toLowerCase();
    const isDamaged = Boolean(l.is_damaged) || /دور\s*رنگ|تمام\s*رنگ|چند\s*لکه|شاسی\s*(ضربه|خوردگی|جوش|ترک)|سرشاسی|تعویض\s*اتاق|تصادفی|چپ\s*شده|چپی|سوخته|اسقاط|اوراق/i.test(fullText);
    if (!isDamaged) return false;
  }

  return true;
}

export type AlertSkipReason =
  | "inactive_rule"
  | "listing_removed"
  | "spec_mismatch"
  | "no_fresh_estimate"
  | "below_threshold";

export interface AlertHit {
  ruleId: string;
  userId: string;
  listingId: string;
  diffToman: number;
  diffPercent: number;
  dedupeKey: string;
}

export type AlertEvaluation =
  | { hit: true; value: AlertHit }
  | { hit: false; reason: AlertSkipReason };

export function dedupeKey(userId: string, ruleId: string, listingId: string): string {
  return `opportunity:${userId}:${ruleId}:${listingId}`;
}

export function evaluateRule(
  rule: WatchRule,
  listing: Listing,
  estimate: PriceEstimate | null,
  now: Date = new Date(),
): AlertEvaluation {
  if (!rule.is_active) return { hit: false, reason: "inactive_rule" };
  if (listing.source_status === "removed") return { hit: false, reason: "listing_removed" };
  if (!ruleMatchesListing(rule, listing)) return { hit: false, reason: "spec_mismatch" };

  // If rule does not enforce a specific discount threshold (> 0), match purely on criteria
  const hasDiscountThreshold =
    (rule.min_discount_percent !== null && rule.min_discount_percent > 0) ||
    (rule.min_discount_toman !== null && rule.min_discount_toman > 0);
  const d = estimate && isEstimateFresh(estimate, now) ? computeDiff(listing.price_toman, estimate.estimated_price_toman) : null;

  // اگر آگهی دارای اشتباه کم گذاشتن صفر یا قیمت نامتعارف و غیرواقعی باشد، هرگز هشدار شکار ارسال نمی‌شود
  if (estimate && estimate.estimated_price_toman) {
    const typo = detectPriceTypo(listing.price_toman, estimate.estimated_price_toman);
    if (typo) {
      return { hit: false, reason: "below_threshold" };
    }
  }

  if (hasDiscountThreshold) {
    if (!d) return { hit: false, reason: "no_fresh_estimate" };
    if (rule.min_discount_percent !== null && d.diffPercent < rule.min_discount_percent) {
      return { hit: false, reason: "below_threshold" };
    }
    if (rule.min_discount_toman !== null && d.diffToman < rule.min_discount_toman) {
      return { hit: false, reason: "below_threshold" };
    }
  }

  return {
    hit: true,
    value: {
      ruleId: rule.id,
      userId: rule.user_id,
      listingId: listing.id,
      diffToman: d?.diffToman ?? 0,
      diffPercent: d?.diffPercent ?? 0,
      dedupeKey: dedupeKey(rule.user_id, rule.id, listing.id),
    },
  };
}

/** Evaluate every rule against one listing. Pure. */
export function evaluateRules(
  rules: WatchRule[],
  listing: Listing,
  estimate: PriceEstimate | null,
  now: Date = new Date(),
): AlertHit[] {
  const hits: AlertHit[] = [];
  for (const r of rules) {
    const res = evaluateRule(r, listing, estimate, now);
    if (res.hit) hits.push(res.value);
  }
  return hits;
}
