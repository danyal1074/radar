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
    [/ال\s*نود|ال-نود|ال\s*۹۰|l90|logan/g, "تندر 90"],
    [/دویست\s*و\s*شش/g, "206"],
    [/دویست\s*و\s*هفت/g, "207"],
    [/چهارصد\s*و\s*پنج/g, "405"],
    [/ایکس\s*22|ایکس\s*۲۲|x\s*22/g, "x22"],
    [/ایکس\s*33|ایکس\s*۳۳|x\s*33/g, "x33"],
    [/ایکس\s*55|ایکس\s*۵۵|x\s*55/g, "x55"],
    [/اف\s*ایکس/g, "fx"],
    [/تیگو\s*5|تیگو\s*۵/g, "tiggo 5"],
    [/تیگو\s*7|تیگو\s*۷/g, "tiggo 7"],
    [/تیگو\s*8|تیگو\s*۸/g, "tiggo 8"],
    [/آریزو\s*5|آریزو\s*۵/g, "arrizo 5"],
    [/آریزو\s*6|آریزو\s*۶/g, "arrizo 6"],
    [/وانت\s*مزدا|مزدا\s*2000|مزدا\s*۲۰۰۰|مزدا\s*1600|مزدا\s*۱۶۰۰|مزدا\s*کارا/g, "وانت مزدا"],
    [/کمری/g, "camry"],
    [/اسپورتیج/g, "sportage"],
    [/سانتافه/g, "santafe"],
    [/سوناتا/g, "sonata"],
    [/توسان/g, "tucson"],
    [/سراتو/g, "cerato"],
    [/اپتیما/g, "optima"],
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
    [/tondar/g, "تندر"],
    [/sandero/g, "ساندرو"],
    [/megane/g, "مگان"],
    [/xantia/g, "زانتیا"],
    [/rio/g, "ریو"],
    [/h30\s*cross|h30|اچ\s*سی\s*کراس/g, "h30 کراس"],
    [/maxima/g, "ماکسیما"],
    [/vitara/g, "ویتارا"],
    [/changan/g, "چانگان"],
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

  // در صورتی که سال در مشخصات خالی باشد، از عنوان استخراج می‌کنیم
  let effectiveYear = year;
  if (!effectiveYear) {
    const yMatch4 = fullText.match(/\b(13[789]\d|140\d)\b/);
    if (yMatch4) {
      effectiveYear = parseInt(yMatch4[1], 10);
    } else {
      const yMatch2 = fullText.match(/(?:مدل|اخر|سال|\b)\s*([789]\d)\b/);
      if (yMatch2) {
        const y2 = parseInt(yMatch2[1], 10);
        effectiveYear = y2 < 30 ? 1400 + y2 : 1300 + y2;
      }
    }
  }

  // تشخیص دقیق خانواده خودرو
  const isMazdaPickup = /وانت\s*مزدا|مزدا\s*2000|مزدا\s*1600|کارا|تک\s*کابین|دو\s*کابین/.test(fullText);
  const isMazda3 = !isMazdaPickup && /مزدا\s*3\b|مزدا\s*۳\b/.test(fullText);
  const isMazda323 = !isMazdaPickup && /323|۳۲۳/.test(fullText);

  const isX22 = /x22/.test(fullText);
  const isX33 = /x33/.test(fullText);
  const isX55 = /x55/.test(fullText);
  const isMvm315 = /315/.test(fullText);
  const isMvm110 = /110/.test(fullText);
  const isMvm = !isX22 && !isX33 && !isX55 && !isMvm315 && !isMvm110 && /ام\s*وی\s*ام|mvm/.test(fullText);

  const isTondar = /تندر|ال\s*90|l90|نود/.test(fullText);
  const isSandero = /ساندرو|استپ\s*وی/.test(fullText);
  const isMegane = /مگان/.test(fullText);

  const isSorenPlus = /سورن\s*پلاس/.test(fullText);
  const isSoren = !isSorenPlus && /سورن/.test(fullText);
  const isSamand = !isSorenPlus && !isSoren && /سمند/.test(fullText);
  const is206 = /206/.test(fullText);
  const is207 = /207/.test(fullText);
  const isPars = /پارس|پرشیا/.test(fullText);
  const isDena = /دنا/.test(fullText);
  const isTara = /تارا/.test(fullText);
  const isPride = /پراید|صبا|نسیم|111|131|132|141|151/.test(fullText);
  const isQuick = /کوییک|کوئیک/.test(fullText);
  const isSaina = /ساینا/.test(fullText);
  const isShahin = /شاهین/.test(fullText);
  const isTiba = /تیبا/.test(fullText);
  const isRana = /رانا/.test(fullText);
  const is405 = /405/.test(fullText);
  const isZamyad = /زامیاد|نیسان\s*وانت|وانت\s*نیسان/.test(fullText);
  const isPaykan = /پیکان|وانت\s*پیکان/.test(fullText);
  const isArisan = /آریسان/.test(fullText);
  const isXantia = /زانتیا/.test(fullText);
  const isRio = /ریو/.test(fullText);
  const isAtlas = /اطلس/.test(fullText);
  const isSahand = /سهند/.test(fullText);
  const isDignity = /دیگنیتی/.test(fullText);
  const isFidelity = /فیدلیتی/.test(fullText);
  const isRooa = /روآ|روا|rooa/.test(fullText);
  const isRich = /ریچ/.test(fullText);
  const isCapra = /کاپرا/.test(fullText);
  const isAccent = /اکسنت/.test(fullText);
  const isC3 = /c3|سی\s*3|سی\s*۳/.test(fullText);

  const isCamry = /camry|کمری/.test(fullText);
  const isCorolla = /corolla|کرولا/.test(fullText);
  const isSportage = /sportage|اسپورتیج/.test(fullText);
  const isCerato = /cerato|سراتو/.test(fullText);
  const isOptima = /optima|اپتیما/.test(fullText);
  const isSantafe = /santafe|سانتافه/.test(fullText);
  const isSonata = /sonata|سوناتا/.test(fullText);
  const isTucson = /tucson|توسان/.test(fullText);

  const isChery = /چری|فونیکس|تیگو|آریزو|fx/.test(fullText);
  const isJac = /جک|jac|کی\s*ام\s*سی|kmc/.test(fullText);
  const isHaima = /هایما/.test(fullText);
  const isBrilliance = /برلیانس/.test(fullText);
  const isLifan = /لیفان/.test(fullText);
  const isH30 = /h30|اچ\s*سی/.test(fullText);
  const isMaxima = /ماکسیما|maxima/.test(fullText);
  const isVitara = /ویتارا|vitara/.test(fullText);
  const isChangan = /چانگان|cs35/.test(fullText);

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

    // جلوگیری از نسبت دادن خودروهای فوق لوکس چند ده میلیاردی به خودروهای داخلی یا کارکرده
    if (p.priceToman > 6_000_000_000 && !/cx|ez|لندکروز|پرادو|بی\s*ام\s*و|بنز|پورشه|فونیکس\s*fx|تیگو\s*8|اسپورتیج|سانتافه|کمری|سوناتا/.test(fullText)) {
      continue;
    }

    let score = 0;

    // تطابق خانواده
    if (isMazdaPickup) {
      if (!/وانت\s*مزدا|کارا/.test(pNorm) || /cx|ez|پریمیوم|3\b/.test(pNorm)) continue;
      score += 70;
      if (/دو\s*کابین/.test(fullText) && /دو\s*کابین/.test(pNorm)) score += 30;
      if (/تک\s*کابین/.test(fullText) && /تک\s*کابین/.test(pNorm)) score += 30;
    } else if (isMazda3) {
      if (!/مزدا\s*3\b/.test(pNorm) || /وانت|cx|ez/.test(pNorm)) continue;
      score += 70;
    } else if (isMazda323) {
      if (!/323/.test(pNorm)) continue;
      score += 70;
    } else if (isX22) {
      if (!/x22/.test(pNorm)) continue;
      score += 70;
      if (/پرو/.test(fullText) && /پرو/.test(pNorm)) score += 25;
    } else if (isX33) {
      if (!/x33/.test(pNorm)) continue;
      score += 70;
    } else if (isX55) {
      if (!/x55/.test(pNorm)) continue;
      score += 70;
    } else if (isMvm315) {
      if (!/315/.test(pNorm)) continue;
      score += 70;
    } else if (isMvm110) {
      if (!/110/.test(pNorm)) continue;
      score += 70;
    } else if (isTondar) {
      if (!/تندر|l90|لوگان/.test(pNorm)) continue;
      score += 70;
      if (/پارس\s*تندر/.test(fullText) && /پارس\s*تندر/.test(pNorm)) score += 25;
      if (/e2/.test(fullText) && /e2/.test(pNorm)) score += 20;
    } else if (isSandero) {
      if (!/ساندرو/.test(pNorm)) continue;
      score += 70;
      if (/استپ\s*وی/.test(fullText) && /استپ\s*وی/.test(pNorm)) score += 25;
    } else if (isMegane) {
      if (!/مگان/.test(pNorm)) continue;
      score += 70;
    } else if (isSorenPlus) {
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
    } else if (isZamyad) {
      if (!/زامیاد|نیسان/.test(pNorm)) continue;
      score += 60;
    } else if (isPaykan) {
      if (!/پیکان/.test(pNorm)) continue;
      score += 60;
    } else if (isArisan) {
      if (!/آریسان/.test(pNorm)) continue;
      score += 60;
    } else if (isXantia) {
      if (!/زانتیا/.test(pNorm)) continue;
      score += 60;
    } else if (isRio) {
      if (!/ریو/.test(pNorm)) continue;
      score += 60;
    } else if (isCamry) {
      if (!/camry|کمری/.test(pNorm)) continue;
      score += 70;
    } else if (isCorolla) {
      if (!/corolla|کرولا/.test(pNorm)) continue;
      score += 70;
    } else if (isSportage) {
      if (!/sportage|اسپورتیج/.test(pNorm)) continue;
      score += 70;
    } else if (isCerato) {
      if (!/cerato|سراتو/.test(pNorm)) continue;
      score += 70;
    } else if (isOptima) {
      if (!/optima|اپتیما/.test(pNorm)) continue;
      score += 70;
    } else if (isSantafe) {
      if (!/santafe|سانتافه/.test(pNorm)) continue;
      score += 70;
    } else if (isSonata) {
      if (!/sonata|سوناتا/.test(pNorm)) continue;
      score += 70;
    } else if (isTucson) {
      if (!/tucson|توسان/.test(pNorm)) continue;
      score += 70;
    } else if (isMvm) {
      if (!/ام\s*وی\s*ام|mvm/.test(pNorm)) continue;
      score += 60;
    } else if (isChery) {
      if (!/چری|فونیکس|تیگو|آریزو|fx/.test(pNorm)) continue;
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
    } else if (isAtlas) {
      if (!/اطلس/.test(pNorm)) continue;
      score += 65;
    } else if (isSahand) {
      if (!/سهند/.test(pNorm)) continue;
      score += 65;
    } else if (isDignity) {
      if (!/دیگنیتی/.test(pNorm)) continue;
      score += 70;
    } else if (isFidelity) {
      if (!/فیدلیتی/.test(pNorm)) continue;
      score += 70;
    } else if (isRooa) {
      if (!/روآ|روا/.test(pNorm)) continue;
      score += 60;
    } else if (isRich) {
      if (!/ریچ/.test(pNorm)) continue;
      score += 65;
    } else if (isCapra) {
      if (!/کاپرا/.test(pNorm)) continue;
      score += 65;
    } else if (isAccent) {
      if (!/اکسنت/.test(pNorm)) continue;
      score += 70;
    } else if (isC3) {
      if (!/c3|سی\s*3|سی\s*۳/.test(pNorm)) continue;
      score += 70;
    } else if (isH30) {
      if (!/h30|اچ\s*سی/.test(pNorm)) continue;
      score += 65;
    } else if (isMaxima) {
      if (!/ماکسیما|maxima/.test(pNorm)) continue;
      score += 70;
    } else if (isVitara) {
      if (!/ویتارا|vitara/.test(pNorm)) continue;
      score += 70;
    } else if (isChangan) {
      if (!/چانگان|cs35/.test(pNorm)) continue;
      score += 65;
    } else {
      const cleanMake = normalizeCarText(make);
      if (!cleanMake || cleanMake === "سایر") continue;
      if (!pNorm.includes(cleanMake)) continue;
      const tokens = fullText.split(/\s+/).filter((t) => t.length > 2 && t !== cleanMake);
      const hasTokenMatch = tokens.some((t) => pNorm.includes(t));
      if (!hasTokenMatch) continue;
      score += 25;
    }

    // اولویت مدل‌های متوقف تولید و قیمت‌های واقعی باما برای سال‌های پایین
    if (effectiveYear && effectiveYear <= 1401 && p.source === "bama.ir") {
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
      if (/فرمان برقی|فرمون برقی/.test(fullText) && /فرمان برقی/.test(pNorm)) score += 30;
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
    if (effectiveYear) {
      const pYearMatch = p.year.match(/\d{4}/);
      if (pYearMatch) {
        const pYear = parseInt(pYearMatch[0], 10);
        const diff = Math.abs(pYear - effectiveYear);
        if (diff === 0) {
          score += 50;
        } else {
          score += Math.max(0, 35 - diff * 4);
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
  if (effectiveYear) {
    const numMatch = bestCandidate.year.match(/\d{4}/);
    if (numMatch) {
      const baseYear = parseInt(numMatch[0], 10);
      const ageDiff = baseYear - effectiveYear;
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
  let floor = 300_000_000;
  if (isPride) floor = 350_000_000;
  else if (is206 || is405 || isSamand || isTiba) floor = 500_000_000;
  else if (isPars || isTondar || isSandero || isMazdaPickup) floor = 750_000_000;
  else if (isDena || isTara) floor = 1_500_000_000;
  else if (isX22 || isX33 || isJac || isChery || isBrilliance) floor = 1_200_000_000;
  else if (isCamry || isSportage || isSantafe || isSonata) floor = 2_200_000_000;

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
