import type { DailyCarPrice } from "./types";

function normalizeCarText(text: string): string {
  if (!text) return "";
  let s = text
    .toLowerCase()
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/‌/g, " ");

  const enFaMap: [RegExp, string][] = [
    [/pride/g, "پراید"],
    [/peugeot/g, "پژو"],
    [/pars|persia/g, "پارس"],
    [/samand/g, "سمند"],
    [/soren/g, "سورن"],
    [/dena/g, "دنا"],
    [/tara/g, "تارا"],
    [/quick|quik/g, "کوییک"],
    [/saina/g, "ساینا"],
    [/shahin/g, "شاهین"],
    [/tiba/g, "تیبا"],
    [/runna|rana/g, "رانا"],
    [/arisan/g, "آریسان"],
    [/zamyad|nissan/g, "زامیاد"],
    [/paykan/g, "پیکان"],
    [/haima/g, "هایما"],
    [/jac/g, "جک"],
    [/kmc/g, "کی ام سی"],
    [/chery|fownix/g, "چری"],
    [/mvm/g, "ام وی ام"],
    [/brilliance/g, "برلیانس"],
    [/lifan/g, "لیفان"],
    [/plus/g, "پلاس"],
    [/turbo/g, "توربو"],
    [/automatic|auto/g, "اتوماتیک"],
    [/manual/g, "دنده ای"],
    [/cng|dual/g, "دوگانه"],
  ];
  for (const [re, rep] of enFaMap) {
    s = s.replace(re, rep);
  }
  return s;
}

/**
 * جستجوی فوق‌دقیق و هوشمند در میان لیست قیمت‌های روز خودرو (Baravard + Bama)
 * با تفکیک دقیق تیپ‌ها، نوع سوخت، گیربکس و مدل سال تولید.
 */
export function lookupDailyPrice(
  prices: DailyCarPrice[],
  make: string,
  model: string,
  year?: number,
  title?: string,
): number | null {
  if (!prices || prices.length === 0) return null;

  const fullText = normalizeCarText(`${make} ${model} ${title || ""}`);

  // تشخیص دقیق خانواده خودرو
  const isSorenPlus = /سورن\s*پلاس/.test(fullText);
  const isSoren = !isSorenPlus && /سورن/.test(fullText);
  const isSamand = !isSorenPlus && !isSoren && /سمند/.test(fullText);
  const is206 = /206/.test(fullText);
  const is207 = /207/.test(fullText);
  const isPars = /پارس|پرشیا/.test(fullText);
  const isDena = /دنا/.test(fullText);
  const isTara = /تارا/.test(fullText);
  const isPride = /پراید/.test(fullText);
  const isQuick = /کوییک|کوئیک/.test(fullText);
  const isSaina = /ساینا/.test(fullText);
  const isShahin = /شاهین/.test(fullText);
  const isTiba = /تیبا/.test(fullText);
  const isRana = /رانا/.test(fullText);
  const is405 = /405/.test(fullText);
  const isZamyad = /زامیاد|نیسان/.test(fullText);

  // زیرویژگی‌ها
  const isDual = /دوگانه|گاز|cng|پایه گازسوز/.test(fullText);
  const isTu5 = /tu5|تی یو ۵|تی یو 5/.test(fullText);
  const isXu7p = /xu7p|ایکس یو ۷|موتور جدید/.test(fullText);
  const isAutomatic = /اتومات|اتوماتیک|cvt/.test(fullText);
  const isPanorama = /پانوراما|سقف شیشه/.test(fullText);
  const isTurbo = /توربو/.test(fullText);

  let bestScore = -1;
  let bestCandidate: DailyCarPrice | null = null;

  for (const p of prices) {
    const pNorm = normalizeCarText(`${p.name} ${p.year}`);
    let score = 0;

    // تطابق خانواده
    if (isSorenPlus) {
      if (!/سورن\s*پلاس/.test(pNorm)) continue;
      score += 60;
    } else if (isSoren) {
      if (!/سورن/.test(pNorm) || /سورن\s*پلاس/.test(pNorm)) continue;
      score += 60;
    } else if (isSamand) {
      if (!/سمند/.test(pNorm) || /سورن/.test(pNorm)) continue;
      score += 60;
    } else if (is206) {
      if (!/206/.test(pNorm)) continue;
      score += 60;
    } else if (is207) {
      if (!/207/.test(pNorm)) continue;
      score += 60;
    } else if (isPars) {
      if (!/پارس/.test(pNorm)) continue;
      score += 60;
    } else if (isDena) {
      if (!/دنا/.test(pNorm)) continue;
      score += 60;
    } else if (isTara) {
      if (!/تارا/.test(pNorm)) continue;
      score += 60;
    } else if (isPride) {
      if (!/پراید/.test(pNorm)) continue;
      score += 60;
    } else if (isQuick) {
      if (!/کوییک|کوئیک/.test(pNorm)) continue;
      score += 60;
    } else if (isSaina) {
      if (!/ساینا/.test(pNorm)) continue;
      score += 60;
    } else if (isShahin) {
      if (!/شاهین/.test(pNorm)) continue;
      score += 60;
    } else if (isTiba) {
      if (!/تیبا/.test(pNorm)) continue;
      score += 60;
    } else if (isRana) {
      if (!/رانا/.test(pNorm)) continue;
      score += 60;
    } else if (is405) {
      if (!/405/.test(pNorm)) continue;
      score += 60;
    } else if (isZamyad) {
      if (!/زامیاد|نیسان/.test(pNorm)) continue;
      score += 60;
    } else {
      const cleanMake = normalizeCarText(make);
      if (!cleanMake || !pNorm.includes(cleanMake)) continue;
      score += 25;
    }

    // اولویت مدل‌های متوقف تولید از باما برای سال‌های پایین
    if (year && year <= 1400 && p.source === "bama.ir") {
      score += 35;
    }

    // تطابق جزئیات تیپ
    if (isPride) {
      if (/132/.test(fullText) && /132/.test(pNorm)) score += 40;
      if (/111|هاچبک/.test(fullText) && /111/.test(pNorm)) score += 40;
      if (/151|وانت/.test(fullText) && /151/.test(pNorm)) score += 40;
      if (/131|صبا/.test(fullText) && /131|صبا/.test(pNorm)) score += 40;
    }
    if (is206) {
      if (/تیپ 5|تیپ ۵/.test(fullText) && /تیپ 5/.test(pNorm)) score += 35;
      if (/تیپ 2|تیپ ۲/.test(fullText) && /تیپ 2/.test(pNorm)) score += 35;
      if (/صندوقدار|v8/.test(fullText) && /صندوقدار|v8/.test(pNorm)) score += 35;
    }
    if (is207) {
      if (isPanorama && /پانوراما/.test(pNorm)) score += 30;
      if (isAutomatic && /اتومات/.test(pNorm)) score += 30;
    }
    if (isPars) {
      if (isTu5 && /tu5|lx/.test(pNorm)) score += 35;
      if (isXu7p && /xu7p|سال/.test(pNorm)) score += 35;
      if (/elx/.test(fullText) && /elx/.test(pNorm)) score += 35;
    }

    if (isDual && /دوگانه|گاز/.test(pNorm)) score += 30;
    if (!isDual && /دوگانه|گاز/.test(pNorm)) score -= 20;

    if (isAutomatic && /اتومات/.test(pNorm)) score += 30;
    if (!isAutomatic && /اتومات/.test(pNorm)) score -= 25;

    if (isTurbo && /توربو/.test(pNorm)) score += 25;

    // تطابق سال
    if (year) {
      const pYearMatch = p.year.match(/\d{4}/);
      if (pYearMatch) {
        const pYear = parseInt(pYearMatch[0], 10);
        const diff = Math.abs(pYear - year);
        if (diff === 0) {
          score += 45;
        } else {
          score += Math.max(0, 30 - diff * 4);
        }
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestCandidate = p;
    }
  }

  if (!bestCandidate) return null;

  let finalPrice = bestCandidate.priceToman;
  if (year) {
    const numMatch = bestCandidate.year.match(/\d{4}/);
    if (numMatch) {
      const baseYear = parseInt(numMatch[0], 10);
      const diffYears = baseYear - year;
      if (diffYears > 0) {
        finalPrice = Math.max(
          Math.round(bestCandidate.priceToman * (1 - 0.045 * diffYears)),
          120_000_000,
        );
      }
    }
  }

  return finalPrice;
}
