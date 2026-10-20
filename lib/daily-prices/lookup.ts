import type { DailyCarPrice } from "./types";

/**
 * Searches the live daily prices to find the baseline price for estimation.
 * Pure function: safe to call from both Client and Server components.
 */
export function lookupDailyPrice(
  prices: DailyCarPrice[],
  make: string,
  model: string,
  year?: number,
): number | null {
  if (!prices || prices.length === 0) return null;
  const q = `${make} ${model}`.toLowerCase();

  // Filter candidates matching the vehicle
  const candidates = prices.filter((p) => {
    const pName = p.name.toLowerCase();
    if (/پراید/i.test(q) && /پراید/i.test(pName)) {
      if (/۱۵۱|151|وانت/i.test(q)) return /151/i.test(pName);
      if (/۱۱۱|111|هاچبک/i.test(q)) return /111/i.test(pName);
      if (/۱۳۲|132/i.test(q)) return /132/i.test(pName);
      return /131|صبا/i.test(pName);
    }
    if (/پارس|پرشیا/i.test(q) && /پارس/i.test(pName)) {
      if (/tu5|lx/i.test(q)) return /tu5|lx/i.test(pName);
      if (/elx/i.test(q)) return /elx/i.test(pName);
      return true;
    }
    if (/۲۰۶|206/i.test(q) && /206/i.test(pName)) {
      if (/تیپ 5|تیپ ۵|v8/i.test(q)) return /تیپ 5|صندوقدار/i.test(pName);
      return /تیپ 2|تیپ 3/i.test(pName);
    }
    if (/۲۰۷|207/i.test(q) && /207/i.test(pName)) return true;
    if (/تیبا/i.test(q) && /تیبا/i.test(pName)) {
      if (/تیبا ۲|تیبا 2|هاچبک/i.test(q)) return /تیبا 2/i.test(pName);
      return /تیبا 1|تیبا sx/i.test(pName);
    }
    if (/ساینا/i.test(q) && /ساینا/i.test(pName)) return true;
    if (/کوییک|کوئیک/i.test(q) && /کوییک|کوئیک/i.test(pName)) return true;
    if (/دنا/i.test(q) && /دنا/i.test(pName)) return true;
    if (/تارا/i.test(q) && /تارا/i.test(pName)) return true;
    if (/شاهین/i.test(q) && /شاهین/i.test(pName)) return true;
    if (/سورن|سمند/i.test(q) && /سورن|سمند/i.test(pName)) return true;
    if (/۴۰۵|405/i.test(q) && /405/i.test(pName)) return true;
    if (/رانا/i.test(q) && /رانا/i.test(pName)) return true;
    if (/زامیاد|نیسان وانت/i.test(q) && /زامیاد|نیسان/i.test(pName)) return true;
    return false;
  });

  if (candidates.length === 0) return null;

  // If a specific year is provided, look for exact or closest year
  if (year) {
    const yearMatches = candidates.filter((c) => c.year.includes(String(year)));
    if (yearMatches.length > 0) return yearMatches[0].priceToman;

    // Pick closest
    let best = candidates[0];
    let bestDiff = 999;
    for (const c of candidates) {
      const numMatch = c.year.match(/\d{4}/);
      if (numMatch) {
        const cYear = parseInt(numMatch[0], 10);
        const diff = Math.abs(cYear - year);
        if (diff < bestDiff) {
          bestDiff = diff;
          best = c;
        }
      }
    }
    const numMatch = best.year.match(/\d{4}/);
    if (numMatch) {
      const baseYear = parseInt(numMatch[0], 10);
      const diffYears = baseYear - year;
      if (diffYears > 0) {
        return Math.max(
          Math.round(best.priceToman * (1 - 0.045 * diffYears)),
          120_000_000,
        );
      }
    }
    return best.priceToman;
  }

  return candidates[0].priceToman;
}
