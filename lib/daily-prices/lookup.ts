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
    [/chery/g, "چری"],
    [/fownix/g, "فونیکس"],
    [/mvm/g, "ام وی ام"],
    [/brilliance/g, "برلیانس"],
    [/lifan/g, "لیفان"],
    [/tondar|l90/g, "تندر"],
    [/sandero/g, "ساندرو"],
    [/megane/g, "مگان"],
    [/xantia/g, "زانتیا"],
    [/rio/g, "ریو"],
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
 * با تفکیک دقیق تیپ‌ها، نوع سوخت، گیربکس، مدل سال تولید و کسر کارشناسی وضعیت بدنه و شاسی.
 */
export function lookupDailyPrice(
  prices: DailyCarPrice[],
  make: string,
  model: string,
  year?: number,
  title?: string,
  bodyStatus?: string,
  chassisStatus?: string,
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
  const isPride = /پراید|صبا|نسیم/.test(fullText);
  const isQuick = /کوییک|کوئیک/.test(fullText);
  const isSaina = /ساینا/.test(fullText);
  const isShahin = /شاهین/.test(fullText);
  const isTiba = /تیبا/.test(fullText);
  const isRana = /رانا/.test(fullText);
  const is405 = /405/.test(fullText);
  const isZamyad = /زامیاد|نیسان/.test(fullText);
  const isTondar = /تندر|ال\s*90|ال۹۰|l90/.test(fullText);
  const isSandero = /ساندرو|استپ\s*وی/.test(fullText);
  const isMegane = /مگان/.test(fullText);
  const isMvm = /ام\s*وی\s*ام|mvm/.test(fullText);
  const isChery = /چری|فونیکس|تیگو|آریزو/.test(fullText);
  const isJac = /جک|jac|کی\s*ام\s*سی|kmc/.test(fullText);
  const isHaima = /هایما/.test(fullText);
  const isBrilliance = /برلیانس/.test(fullText);
  const isLifan = /لیفان/.test(fullText);
  const isPaykan = /پیکان/.test(fullText);
  const isArisan = /آریسان/.test(fullText);
  const isXantia = /زانتیا/.test(fullText);
  const isRio = /ریو/.test(fullText);

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
      if (!/پراید|صبا/.test(pNorm)) continue;
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
    } else if (isTondar) {
      if (!/تندر|ال\s*90/.test(pNorm)) continue;
      score += 60;
    } else if (isSandero) {
      if (!/ساندرو/.test(pNorm)) continue;
      score += 60;
    } else if (isMegane) {
      if (!/مگان/.test(pNorm)) continue;
      score += 60;
    } else if (isXantia) {
      if (!/زانتیا/.test(pNorm)) continue;
      score += 60;
    } else if (isRio) {
      if (!/ریو/.test(pNorm)) continue;
      score += 60;
    } else if (isMvm) {
      if (!/ام\s*وی\s*ام|mvm/.test(pNorm)) continue;
      score += 60;
    } else if (isChery) {
      if (!/چری|فونیکس|تیگو|آریزو/.test(pNorm)) continue;
      score += 60;
    } else if (isJac) {
      if (!/جک|jac|کی\s*ام\s*سی|kmc/.test(pNorm)) continue;
      score += 60;
    } else if (isHaima) {
      if (!/هایما/.test(pNorm)) continue;
      score += 60;
    } else if (isBrilliance) {
      if (!/برلیانس/.test(pNorm)) continue;
      score += 60;
    } else if (isLifan) {
      if (!/لیفان/.test(pNorm)) continue;
      score += 60;
    } else if (isZamyad) {
      if (!/زامیاد|نیسان/.test(pNorm)) continue;
      score += 60;
    } else if (isPaykan) {
      if (!/پیکان/.test(pNorm)) continue;
      score += 60;
    } else if (isArisan) {
      if (!/آریسان/.test(pNorm)) continue;
      score += 60;
    } else {
      const cleanMake = normalizeCarText(make);
      if (!cleanMake || !pNorm.includes(cleanMake)) continue;
      score += 25;
    }

    // اولویت مدل‌های متوقف تولید و قیمت‌های واقعی باما برای سال‌های پایین
    if (year && year <= 1401 && p.source === "bama.ir") {
      score += 55;
    }

    // تطابق جزئیات تیپ
    if (isPride) {
      const is141 = /141/.test(fullText);
      if (is141 && /141/.test(pNorm)) score += 60;
      if (is141 && !/141/.test(pNorm)) score -= 40;
      if (/132/.test(fullText) && /132/.test(pNorm)) score += 40;
      if (/111|هاچبک/.test(fullText) && /111/.test(pNorm)) score += 40;
      if (/151|وانت/.test(fullText) && /151/.test(pNorm)) score += 40;
      if (/131|صبا/.test(fullText) && /131|صبا/.test(pNorm)) score += 40;
    }
    if (is206) {
      if (/تیپ 5|تیپ ۵/.test(fullText) && /تیپ 5/.test(pNorm)) score += 35;
      if (/تیپ 2|تیپ ۲/.test(fullText) && /تیپ 2/.test(pNorm)) score += 35;
      const isSdInInput = /صندوقدار|v8|v9|v20|sd/.test(fullText);
      const isSdInCandidate = /صندوقدار|v8|sd/.test(pNorm);
      if (isSdInInput && isSdInCandidate) score += 55;
      if (isSdInInput && !isSdInCandidate) score -= 40;
      if (!isSdInInput && isSdInCandidate) score -= 40;
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
    if (isMvm) {
      if (/x22/.test(fullText) && /x22/.test(pNorm)) score += 40;
      if (/x33/.test(fullText) && /x33/.test(pNorm)) score += 40;
      if (/315/.test(fullText) && /315/.test(pNorm)) score += 40;
      if (/530/.test(fullText) && /530/.test(pNorm)) score += 40;
    }
    if (isJac) {
      if (/s5/.test(fullText) && /s5/.test(pNorm)) score += 40;
      if (/j5/.test(fullText) && /j5/.test(pNorm)) score += 40;
      if (/s3/.test(fullText) && /s3/.test(pNorm)) score += 40;
      if (/j4/.test(fullText) && /j4/.test(pNorm)) score += 40;
      if (/t8/.test(fullText) && /t8/.test(pNorm)) score += 40;
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
          score += Math.max(0, 30 - diff * 3);
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

  // ۱. فرمول لگاریتمی واقع‌گرایانه افت سال
  if (year) {
    const numMatch = bestCandidate.year.match(/\d{4}/);
    if (numMatch) {
      const baseYear = parseInt(numMatch[0], 10);
      const ageDiff = baseYear - year;
      if (ageDiff > 0) {
        let factor = 1.0;
        for (let y = 1; y <= ageDiff; y++) {
          if (y <= 2) factor *= 0.93;       // ۲ سال اول: ۷٪ افت سالانه
          else if (y <= 7) factor *= 0.95;  // سال‌های ۳ تا ۷: ۵٪ افت سالانه
          else factor *= 0.975;             // سال‌های ۸ به بعد: ۲.۵٪ افت سالانه
        }
        finalPrice = Math.round(bestCandidate.priceToman * factor);
      }
    }
  }

  // ۲. تضمین کف قیمت واقعی بازار بر اساس اتاق خودرو
  let floor = 130_000_000;
  if (isPride) floor = 170_000_000;
  else if (is206 || is405 || isSamand || isTiba) floor = 240_000_000;
  else if (isPars || isTondar || isSandero) floor = 320_000_000;
  else if (isDena || isTara) floor = 500_000_000;
  else if (isMvm || isJac || isChery || isBrilliance) floor = 350_000_000;

  if (finalPrice < floor) {
    finalPrice = floor;
  }

  // ۳. اعمال وضعیت بدنه و رنگ بر اساس گزارش کارشناسی دیوار
  if (bodyStatus) {
    const b = bodyStatus.toLowerCase();
    if (b.includes("خط و خش") || b.includes("بدون رنگ") || b.includes("بی رنگ")) {
      // بدون کسر
    } else if (b.includes("۱ ناحیه") || b.includes("یک لکه") || b.includes("یک ناحیه")) {
      finalPrice *= 0.96;
    } else if (b.includes("۲ ناحیه") || b.includes("دو لکه") || b.includes("دو ناحیه")) {
      finalPrice *= 0.92;
    } else if (b.includes("۳ ناحیه") || b.includes("سه لکه") || b.includes("سه ناحیه") || b.includes("چند لکه")) {
      finalPrice *= 0.88;
    } else if (b.includes("دوررنگ") || b.includes("دور رنگ")) {
      finalPrice *= 0.84;
    } else if (b.includes("تمام‌رنگ") || b.includes("تمام رنگ") || b.includes("اتاق تعویض")) {
      finalPrice *= 0.75;
    } else if (b.includes("تصادفی") || b.includes("چپی")) {
      finalPrice *= 0.55;
    }
  }

  // ۴. اعمال وضعیت شاسی بر اساس ارزیابی فروشنده دیوار
  if (chassisStatus) {
    const c = chassisStatus.toLowerCase();
    if (c.includes("ضربه‌خورده") || c.includes("ضربه خورده") || c.includes("جوش") || c.includes("ترک")) {
      finalPrice *= 0.90;
    }
  }

  return Math.round(finalPrice);
}
