import type { PriceComparison, PriceEstimate, TypoInfo } from "./types";

/**
 * diff        = estimated - listing
 * diffPercent = (estimated - listing) / estimated * 100
 *
 * Returns null when the estimate is zero / invalid / missing: we never guess.
 * A positive value means the listing is CHEAPER than the estimate.
 */
export function computeDiff(
  listingPriceToman: number,
  estimatedToman: number | null | undefined,
): { diffToman: number; diffPercent: number } | null {
  if (
    estimatedToman === null ||
    estimatedToman === undefined ||
    !Number.isFinite(estimatedToman) ||
    estimatedToman <= 0 ||
    !Number.isFinite(listingPriceToman) ||
    listingPriceToman <= 0
  ) {
    return null;
  }
  const diffToman = estimatedToman - listingPriceToman;
  const diffPercent = (diffToman / estimatedToman) * 100;
  return { diffToman, diffPercent: Math.round(diffPercent * 10) / 10 };
}

/**
 * تشخیص هوشمند خطای تایپی کم گذاشتن صفر توسط فروشنده
 * مثال: قیمت ماشین ۱ میلیارد و ۳۸۰ میلیون است، ولی فروشنده ۱۳ میلیون و ۸۰۰ یا ۱۳۸ میلیون زده است.
 */
export function detectPriceTypo(
  listingPriceToman: number,
  estimatedToman: number | null | undefined,
): TypoInfo | null {
  if (
    !estimatedToman ||
    estimatedToman <= 0 ||
    !listingPriceToman ||
    listingPriceToman <= 0
  ) {
    return null;
  }

  const ratio = listingPriceToman / estimatedToman;
  const diffPercent = (1 - ratio) * 100;

  // در بازار خودرو ایران تخفیف واقعی بالای ۶۰ درصد وجود ندارد و نشانه خطای صفر یا ودیعه است
  if (diffPercent >= 60 || ratio <= 0.35) {
    // ۱. بررسی یک صفر کم (ضربدر ۱۰ نزدیک به قیمت کارشناسی)
    const times10 = listingPriceToman * 10;
    if (times10 >= estimatedToman * 0.5 && times10 <= estimatedToman * 1.6) {
      return {
        isTypo: true,
        type: "missing_zero",
        suggestedPriceToman: times10,
        message: "احتمال اشتباه تایپی: یک صفر کم گذاشته شده است",
      };
    }

    // ۲. بررسی دو صفر کم یا درج به هزار تومان به جای میلیون (ضربدر ۱۰۰ نزدیک به قیمت کارشناسی)
    const times100 = listingPriceToman * 100;
    if (times100 >= estimatedToman * 0.5 && times100 <= estimatedToman * 1.6) {
      return {
        isTypo: true,
        type: "missing_two_zeros",
        suggestedPriceToman: times100,
        message: "احتمال اشتباه تایپی: دو صفر کم گذاشته شده است",
      };
    }

    // ۳. تخفیف نامتعارف و غیرواقعی (بیش از ۶۵٪ زیر عرف بازار)
    return {
      isTypo: true,
      type: "unrealistic",
      suggestedPriceToman: times10,
      message: "قیمت غیرواقعی (احتمال اشتباه در تعداد صفر یا ثبت مبلغ پیش‌پرداخت)",
    };
  }

  return null;
}

export function isEstimateFresh(
  estimate: Pick<PriceEstimate, "status" | "expires_at" | "estimated_price_toman"> | null,
  now: Date = new Date(),
): boolean {
  if (!estimate) return false;
  if (estimate.status !== "success") return false;
  if (!estimate.estimated_price_toman || estimate.estimated_price_toman <= 0) return false;
  return new Date(estimate.expires_at).getTime() > now.getTime();
}

/** Default dashboard threshold for the "opportunity" badge when no rule applies. */
export const DEFAULT_OPPORTUNITY_PERCENT = 8;
export const NEEDS_REVIEW_PERCENT = 3;

export function compare(
  listingPriceToman: number,
  estimate: PriceEstimate | null,
  now: Date = new Date(),
): PriceComparison {
  const fresh = isEstimateFresh(estimate, now);
  if (!estimate || !fresh) {
    return {
      estimatedToman: estimate?.status === "success" ? estimate.estimated_price_toman : null,
      diffToman: null,
      diffPercent: null,
      fresh: false,
      label: "normal",
      typoInfo: null,
    };
  }
  const d = computeDiff(listingPriceToman, estimate.estimated_price_toman);
  if (!d) {
    return { estimatedToman: null, diffToman: null, diffPercent: null, fresh: false, label: "normal", typoInfo: null };
  }

  // بررسی اشتباه ثبت قیمت / کم گذاشتن صفر
  const typoInfo = detectPriceTypo(listingPriceToman, estimate.estimated_price_toman);
  if (typoInfo) {
    return {
      estimatedToman: estimate.estimated_price_toman,
      diffToman: d.diffToman,
      diffPercent: d.diffPercent,
      fresh: true,
      label: "missing_zero",
      typoInfo,
    };
  }

  let label: PriceComparison["label"] = "normal";
  if (d.diffPercent >= DEFAULT_OPPORTUNITY_PERCENT) label = "opportunity";
  else if (d.diffPercent >= NEEDS_REVIEW_PERCENT) label = "needs_review";
  return {
    estimatedToman: estimate.estimated_price_toman,
    diffToman: d.diffToman,
    diffPercent: d.diffPercent,
    fresh: true,
    label,
    typoInfo: null,
  };
}

/**
 * Opportunity score 0..100. Only defined when a fresh estimate exists.
 * Combines discount depth (dominant) and estimate confidence (if provided).
 * This is an explainable heuristic, not a statistical model.
 */
export function opportunityScore(
  cmp: PriceComparison,
  confidence: number | null,
): number | null {
  if (!cmp.fresh || cmp.diffPercent === null) return null;
  if (cmp.label === "missing_zero") return null; // Never give opportunity score to typos
  if (cmp.diffPercent <= 0) return 0;
  const depth = Math.min(cmp.diffPercent, 30) / 30; // 30% discount saturates
  const conf = confidence === null ? 0.7 : Math.max(0, Math.min(1, confidence));
  return Math.round(depth * (0.6 + 0.4 * conf) * 100);
}
