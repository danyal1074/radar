import { getCityBySlug, normalizeCityNameFa } from "../cities";
import { isJunkOrUnrealisticListing } from "../junk-filter";
import type { ListingImportItem } from "../validation";
import type { FetchResult, ListingSourceProvider } from "./provider";

function normalizeFaDigits(str: string): string {
  if (!str) return "";
  return str
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660));
}

interface DivarPostDetails {
  brandModel?: string | null;
  year?: number | null;
  mileageKm?: number | null;
  color?: string | null;
  gearbox?: string | null;
  fuel?: string | null;
  motor?: string | null;
  chassis?: string | null;
  body?: string | null;
  description?: string | null;
  isDamaged?: boolean;
}

// In-memory cache for post details (10 minutes TTL)
const postDetailsCache = new Map<string, { data: DivarPostDetails; expiresAt: number }>();

async function fetchDivarPostDetails(token: string): Promise<DivarPostDetails | null> {
  const cached = postDetailsCache.get(token);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  try {
    const res = await fetch(`https://api.divar.ir/v8/posts-v2/web/${token}`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
      signal: AbortSignal.timeout(4500),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const details = parseDivarPostJson(json);
    postDetailsCache.set(token, { data: details, expiresAt: Date.now() + 10 * 60 * 1000 });
    return details;
  } catch {
    return null;
  }
}

function parseDivarPostJson(data: any): DivarPostDetails {
  const result: DivarPostDetails = {
    brandModel: null,
    year: null,
    mileageKm: null,
    color: null,
    gearbox: null,
    fuel: null,
    motor: null,
    chassis: null,
    body: null,
    description: null,
    isDamaged: false,
  };

  for (const s of data.sections || []) {
    for (const w of s.widgets || []) {
      const title = w.data?.title?.trim();
      const val = w.data?.value ? String(w.data.value).trim() : null;

      if (title === "برند و مدل" && val) result.brandModel = val;
      if (title === "گیربکس" && val) result.gearbox = val;
      if (title === "نوع سوخت" && val) result.fuel = val;

      if (w.widget_type === "GROUP_INFO_ROW") {
        for (const item of w.data?.items || []) {
          const it = item.title?.trim();
          const iv = item.value ? String(item.value).trim() : "";
          if (it === "کارکرد") {
            const cleanDigits = normalizeFaDigits(iv).replace(/[^\d]/g, "");
            const num = parseInt(cleanDigits, 10);
            if (!isNaN(num)) result.mileageKm = num;
          }
          if (it?.includes("مدل") || it?.includes("سال")) {
            const cleanDigits = normalizeFaDigits(iv);
            const match = cleanDigits.match(/(13[789]\d|140\d|20\d{2})/);
            if (match) {
              let y = parseInt(match[1], 10);
              if (y > 1900 && y < 2050) y = y - 621;
              result.year = y;
            }
          }
          if (it === "رنگ") result.color = iv;
        }
      }

      if (w.widget_type === "SCORE_ROW") {
        const desc = w.data?.descriptive_score?.trim();
        if (title === "موتور" && desc) result.motor = desc;
        if ((title?.includes("شاسی") || title === "وضعیت شاسی‌ها") && desc) result.chassis = desc;
        if (title === "بدنه" && desc) result.body = desc;
        if (title === "گیربکس" && desc && !result.gearbox) result.gearbox = desc;
      }

      if (w.widget_type === "DESCRIPTION_ROW" && w.data?.text) {
        result.description = w.data.text.trim();
      }
    }
  }

  // بررسی آسیب‌دیدگی بدنه یا تصادفی بودن
  const bodyText = `${result.body || ""} ${result.chassis || ""}`.toLowerCase();
  if (
    bodyText.includes("ضربه‌خورده") ||
    bodyText.includes("ضربه خورده") ||
    bodyText.includes("رنگ‌شدگی در ۳") ||
    bodyText.includes("دوررنگ") ||
    bodyText.includes("دور رنگ") ||
    bodyText.includes("تمام‌رنگ") ||
    bodyText.includes("تمام رنگ") ||
    bodyText.includes("تصادفی") ||
    bodyText.includes("چپی")
  ) {
    result.isDamaged = true;
  }

  return result;
}

const BRAND_PATTERNS: { make: string; re: RegExp }[] = [
  { make: "پراید", re: /پراید|pride|111|131|132|141|151|۱۱۱|۱۳۱|۱۳۲|۱۴۱|۱۵۱|صبا|نسیم/i },
  { make: "پژو", re: /پژو|peugeot|206|207|405|۲۰۶|۲۰۷|۴۰۵|پارس|پرشیا|2008|۲۰۰۸|slx|glx/i },
  { make: "سمند", re: /سمند|samand/i },
  { make: "سورن", re: /سورن|soren/i },
  { make: "دنا", re: /دنا|dena/i },
  { make: "تارا", re: /تارا|tara/i },
  { make: "کوییک", re: /کوییک|کوئیک|quick|quik/i },
  { make: "ساینا", re: /ساینا|saina/i },
  { make: "شاهین", re: /شاهین|shahin/i },
  { make: "تیبا", re: /تیبا|tiba/i },
  { make: "رانا", re: /رانا|runna|rana/i },
  { make: "رنو", re: /رنو|renault|تندر|ال\s*90|ال۹۰|ال\s*نود|ساندرو|مگان|استپ\s*وی|l90|logan/i },
  { make: "هایما", re: /هایما|haima|s7|s5|8s|7x/i },
  { make: "جک", re: /جک|jac|کی\s*ام\s*سی|kmc|j4|j5|s3|s5|t8|t9|k7/i },
  { make: "ام‌وی‌ام", re: /ام\s*وی\s*ام|mvm|x22|x33|x55|ایکس\s*22|ایکس\s*33|ایکس\s*55|ایکس\s*۲۲|ایکس\s*۳۳|ایکس\s*۵۵|110|315|530|550|۱۱۰|۳۱۵|۵۳۰|۵۵۰/i },
  { make: "چری", re: /چری|chery|تیگو|آریزو|tiggo|arrizo/i },
  { make: "فونیکس", re: /فونیکس|fownix|fx|اف\s*ایکس/i },
  { make: "تویوتا", re: /تویوتا|toyota|کمری|camry|کرولا|corolla|پرادو|prado|لندکروز|land\s*cruiser|یاریس|yaris|هایلوکس|hilux/i },
  { make: "هیوندای", re: /هیوندای|hyundai|سوناتا|sonata|النترا|elantra|سانتافه|santafe|توسان|tucson|اکسنت|accent|آوانته|avante|ورنا|verna|i20|i30/i },
  { make: "کیا", re: /کیا|kia|ریو|rio|سراتو|cerato|اسپورتیج|sportage|اپتیما|optima|سورنتو|sorento|پیکانتو/i },
  { make: "مزدا", re: /مزدا|mazda|کارا|cara|323/i },
  { make: "چانگان", re: /چانگان|changan|cs35|cs55/i },
  { make: "بسترن", re: /بسترن|besturn|b30|b50/i },
  { make: "برلیانس", re: /برلیانس|brilliance|h220|h230|h320|h330/i },
  { make: "لیفان", re: /لیفان|lifan|x50|x60|620|520/i },
  { make: "زامیاد", re: /زامیاد|نیسان\s*وانت|وانت\s*نیسان|نیسان|zamyad/i },
  { make: "پیکان", re: /پیکان|وانت\s*پیکان|paykan/i },
  { make: "آریسان", re: /آریسان|arisan/i },
  { make: "سیتروئن", re: /زانتیا|xantia|سیتروئن|citroen/i },
];

function detectMake(text: string): string {
  for (const b of BRAND_PATTERNS) {
    if (b.re.test(text)) return b.make;
  }
  return "سایر";
}

function cleanCarTokens(raw: { brandModel?: string | null; title: string; description?: string | null }): { make: string; model: string } {
  const normTitle = normalizeFaDigits(raw.title || "");
  const normDesc = normalizeFaDigits(raw.description || "");
  const combined = `${normTitle} ${normDesc}`;

  let make = "سایر";
  let model = "";

  // اولویت ۱: مشخصات رسمی جدول مشخصات فنی دیوار
  if (raw.brandModel && raw.brandModel.length >= 3 && !/فروش|معاوضه|اقساط|سالم|تمیز|عروسک/i.test(raw.brandModel)) {
    model = raw.brandModel.trim();
  }

  // اولویت ۲ و ۳: استخراج مدل استاندارد از توضیحات یا عنوان
  if (!model) {
    if (/پژو\s*206|206|۲۰۶/i.test(combined)) {
      make = "پژو";
      if (/تیپ\s*5|تیپ\s*۵|v8|وی\s*8/i.test(combined)) model = "پژو 206 تیپ 5";
      else if (/تیپ\s*2|تیپ\s*۲/i.test(combined)) model = "پژو 206 تیپ 2";
      else if (/تیپ\s*3|تیپ\s*۳/i.test(combined)) model = "پژو 206 تیپ 3";
      else if (/sd|صندوقدار/i.test(combined)) model = "پژو 206 صندوقدار V8";
      else model = "پژو 206";
    } else if (/پژو\s*207|207|۲۰۷/i.test(combined)) {
      make = "پژو";
      if (/اتومات/i.test(combined)) model = "پژو 207 اتوماتیک";
      else if (/پانا|پانوراما|سقف\s*شیشه/i.test(combined)) model = "پژو 207 پانوراما";
      else if (/tu3|تی\s*یو\s*3/i.test(combined)) model = "پژو 207 TU3";
      else model = "پژو 207 دنده‌ای";
    } else if (/پارس|pars|پرشیا/i.test(combined)) {
      make = "پژو";
      if (/tu5|تی\s*یو\s*فایو/i.test(combined)) model = "پژو پارس TU5";
      else if (/elx|ای\s*ال\s*ایکس/i.test(combined)) model = "پژو پارس ELX";
      else if (/xu7p|پلاس|موتور\s*جدید/i.test(combined)) model = "پژو پارس XU7P";
      else model = "پژو پارس سال";
    } else if (/405|۴۰۵/i.test(combined)) {
      make = "پژو";
      if (/slx|tu5/i.test(combined)) model = "پژو 405 SLX";
      else model = "پژو 405 GLX";
    } else if (/سورن|soren/i.test(combined)) {
      make = "سورن";
      if (/پلاس|plus/i.test(combined)) model = "سورن پلاس";
      else if (/توربو/i.test(combined)) model = "سورن توربو";
      else model = "سمند سورن ELX";
    } else if (/سمند|samand/i.test(combined)) {
      make = "سمند";
      if (/ef7|ای\s*اف\s*سون/i.test(combined)) model = "سمند EF7";
      else model = "سمند LX";
    } else if (/دنا|dena/i.test(combined)) {
      make = "دنا";
      if (/توربو\s*اتومات|اتومات/i.test(combined)) model = "دنا پلاس توربو اتوماتیک";
      else if (/توربو/i.test(combined)) model = "دنا پلاس توربو";
      else if (/پلاس/i.test(combined)) model = "دنا پلاس";
      else model = "دنا معمولی";
    } else if (/تارا|tara/i.test(combined)) {
      make = "تارا";
      if (/اتومات|v4|v2/i.test(combined)) model = "تارا اتوماتیک";
      else model = "تارا دنده‌ای V1";
    } else if (/شاهین|shahin/i.test(combined)) {
      make = "شاهین";
      if (/اتومات|پلاس/i.test(combined)) model = "شاهین اتوماتیک";
      else model = "شاهین G";
    } else if (/کوییک|کوئیک|کویک|quick|quik/i.test(combined)) {
      make = "کوییک";
      if (/r\b|آر\b/i.test(combined)) model = "کوییک R";
      else if (/s\b|اس\b/i.test(combined)) model = "کوییک S";
      else if (/gxr|gx\b/i.test(combined)) model = "کوییک GX";
      else if (/اتومات/i.test(combined)) model = "کوییک اتوماتیک";
      else model = "کوییک دنده‌ای";
    } else if (/ساینا|saina/i.test(combined)) {
      make = "ساینا";
      if (/s\b|اس\b/i.test(combined)) model = "ساینا S";
      else if (/da\b/i.test(combined)) model = "ساینا DA";
      else if (/اتومات/i.test(combined)) model = "ساینا اتوماتیک";
      else model = "ساینا دنده‌ای";
    } else if (/تیبا|tiba/i.test(combined)) {
      make = "تیبا";
      if (/2|۲|دو|هاچبک/i.test(combined)) model = "تیبا 2";
      else model = "تیبا 1";
    } else if (/پراید|pride/i.test(combined)) {
      make = "پراید";
      if (/131|۱۳۱/i.test(combined)) model = "پراید 131 SE";
      else if (/111|۱۱۱/i.test(combined)) model = "پراید 111 SE";
      else if (/132|۱۳۲/i.test(combined)) model = "پراید 132";
      else if (/141|۱۴۱/i.test(combined)) model = "پراید 141";
      else if (/151|۱۵۱|وانت/i.test(combined)) model = "پراید 151 وانت";
      else if (/صبا|saba/i.test(combined)) model = "پراید صبا";
      else model = "پراید 131 SE";
    } else if (/وانت\s*مزدا|مزدا\s*2000|مزدا\s*دوکابین|مزدا\s*تک\s*کابین/i.test(combined)) {
      make = "مزدا";
      if (/دوکابین|دو\s*کابین/i.test(combined)) model = "وانت مزدا 2000 دو کابین";
      else model = "وانت مزدا 2000 تک کابین";
    } else if (/مزدا\s*323/i.test(combined)) {
      make = "مزدا";
      model = "مزدا 323";
    } else if (/x22|ایکس\s*22/i.test(combined)) {
      make = "ام‌وی‌ام";
      if (/پرو|pro/i.test(combined)) model = "ام وی ام X22 پرو اتوماتیک";
      else model = "ام وی ام X22 دنده‌ای";
    } else if (/x33|ایکس\s*33/i.test(combined)) {
      make = "ام‌وی‌ام";
      model = "ام وی ام X33 دنده‌ای";
    } else if (/x55|ایکس\s*55/i.test(combined)) {
      make = "ام‌وی‌ام";
      model = "ام وی ام X55 پرو";
    } else if (/آریزو|اریزو|arrizo/i.test(combined)) {
      make = "چری";
      model = "چری آریزو 5";
    } else if (/تیگو|tiggo/i.test(combined)) {
      make = "چری";
      model = "چری تیگو 7";
    } else if (/دیگنیتی|dignity/i.test(combined)) {
      make = "بهمن موتور";
      model = "دیگنیتی پرایم";
    } else if (/فیدلیتی|fidelity/i.test(combined)) {
      make = "بهمن موتور";
      model = "فیدلیتی پرایم";
    } else if (/هایما|haima/i.test(combined)) {
      make = "هایما";
      if (/s5|اس\s*5/i.test(combined)) model = "هایما S5";
      else model = "هایما S7 توربو";
    } else if (/برلیانس|brilliance/i.test(combined)) {
      make = "برلیانس";
      if (/کراس|cross/i.test(combined)) model = "برلیانس کراس";
      else if (/330|۳۳۰/i.test(combined)) model = "برلیانس H330";
      else model = "برلیانس H320";
    } else if (/ریچ|rich/i.test(combined)) {
      make = "پارس خودرو";
      model = "پیکاپ ریچ";
    } else if (/کاپرا|capra/i.test(combined)) {
      make = "گروه بهمن";
      model = "کاپرا دوکابین";
    } else if (/اطلس|atlas/i.test(combined)) {
      make = "سایپا";
      model = "سایپا اطلس G";
    } else if (/سهند|sahand/i.test(combined)) {
      make = "پارس خودرو";
      model = "پارس خودرو سهند S";
    } else if (/اکسنت|accent/i.test(combined)) {
      make = "هیوندای";
      model = "هیوندای اکسنت";
    } else if (/سراتو|cerato/i.test(combined)) {
      make = "کیا";
      model = "کیا سراتو مونتاژ سایپا 2.0";
    } else if (/تندر|ال\s*90|ال\s*نود|l90/i.test(combined)) {
      make = "رنو";
      model = "رنو تندر 90 E2";
    } else if (/ساندرو|sandero/i.test(combined)) {
      make = "رنو";
      model = "رنو ساندرو اتوماتیک";
    } else if (/مگان|megane/i.test(combined)) {
      make = "رنو";
      model = "رنو مگان 2000";
    } else if (/h30|اچ\s*سی/i.test(combined)) {
      make = "ایران خودرو";
      model = "دانگ فنگ H30 کراس اتوماتیک";
    } else if (/ماکسیما|maxima/i.test(combined)) {
      make = "پارس خودرو";
      model = "نیسان ماکسیما اتوماتیک و دنده‌ای";
    } else if (/ویتارا|vitara/i.test(combined)) {
      make = "ایران خودرو";
      model = "سوزوکی گرند ویتارا 2.4 اتوماتیک";
    } else if (/زانتیا|xantia/i.test(combined)) {
      make = "سایپا";
      model = "سیتروئن زانتیا 2.0 SX";
    } else if (/وانت\s*پیکان|پیکان\s*وانت/i.test(combined)) {
      make = "ایران خودرو";
      model = "وانت پیکان بنزینی";
    } else if (/پیکان/i.test(combined)) {
      make = "ایران خودرو";
      model = "پیکان کارلوکس";
    } else if (/نیسان|زامیاد/i.test(combined)) {
      make = "زامیاد";
      model = "وانت نیسان زامیاد Z24";
    }
  }

  if (!model) {
    // پاکسازی نویزهای عنوانی مانند فروش فوری، عروسک، بدون رنگ
    model = normTitle
      .replace(/فروش\s*فوری|فوری|نقد\s*و\s*اقساط|اقساطی|اقساط|عروسک|بدون\s*رنگ|بیرنگ|تمیز|در\s*حد\s*صفر|سالم|کارمندی|استثنایی|معاوضه/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  if (make === "سایر") {
    make = detectMake(`${model} ${raw.title}`);
  }

  return { make, model };
}

export class DivarListingSourceProvider implements ListingSourceProvider {
  get id(): string {
    return this.defaultCity === "torbat-heydariyeh" ? "divar" : `divar-${this.defaultCity}`;
  }
  get displayName(): string {
    if (this.defaultCity === "torbat-heydariyeh") return "دیوار تربت‌حیدریه";
    const cityName = getCityBySlug(this.defaultCity)?.nameFa || normalizeCityNameFa(this.defaultCity);
    return `دیوار ${cityName}`;
  }

  private readonly defaultCity: string;

  constructor(defaultCity: string = "mashhad") {
    this.defaultCity = defaultCity;
  }

  async fetchLatest(citySlug?: string, query?: string): Promise<FetchResult> {
    const city = citySlug || this.defaultCity;
    let url = `https://divar.ir/s/${city}/car`;
    if (query) {
      url += `?q=${encodeURIComponent(query)}`;
    }

    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "fa,en;q=0.9",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      throw new Error(`خطای دیوار (${res.status}): عدم امکان بارگذاری آگهی‌ها`);
    }

    const html = await res.text();
    const items = await this.parseSchemaLd(html, city);
    return { items, isSample: false };
  }

  private async parseSchemaLd(html: string, defaultCity: string): Promise<ListingImportItem[]> {
    const matches = html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g);
    const items: ListingImportItem[] = [];
    const targetFaCity = getCityBySlug(defaultCity)?.nameFa || normalizeCityNameFa(defaultCity);

    const rawCars: any[] = [];
    for (const match of matches) {
      try {
        const parsed = JSON.parse(match[1]);
        const list = Array.isArray(parsed) ? parsed : [parsed];
        for (const car of list) {
          if (car && car["@type"] === "Car") {
            rawCars.push(car);
          }
        }
      } catch {
        // Skip invalid JSON-LD blocks
      }
    }

    // Process top 20 newest cars with fast parallel details extraction
    const carsToProcess = rawCars.slice(0, 20);
    const detailsList = await Promise.all(
      carsToProcess.map(async (car) => {
        const sourceUrl = car.url || null;
        const tokenMatch = sourceUrl?.match(/\/([a-zA-Z0-9_-]+)(?:\/)?$/);
        const token = tokenMatch ? tokenMatch[1] : null;
        if (!token) return null;
        return fetchDivarPostDetails(token);
      }),
    );

    for (let i = 0; i < carsToProcess.length; i++) {
      const car = carsToProcess[i];
      const details = detailsList[i];
      try {
        const title = String(car.name || car.web_info?.title || "").trim();
        const sourceUrl = car.url || null;
        const tokenMatch = sourceUrl?.match(/\/([a-zA-Z0-9_-]+)(?:\/)?$/);
        const token = tokenMatch ? tokenMatch[1] : null;
        const sourcePostId = token || `divar-${Date.now()}-${Math.random()}`;

        // Price extraction
        const priceRaw = car.offers?.price ? String(car.offers.price) : "0";
        const priceRial = Number(normalizeFaDigits(priceRaw)) || 0;
        const priceToman = Math.floor(priceRial / 10);
        if (priceToman < 10_000_000) {
          continue;
        }

        // استخراج مدل و سال خودرو بر اساس اولویت‌بندی درخواستی کاربر:
        // ۱. مشخصات رسمی جدول مشخصات فنی دیوار (brandModel)
        // ۲. توضیحات تکمیلی آگهی (description)
        // ۳. عنوان آگهی (title) پس از پاکسازی کلمات نامربوط
        const descText = details?.description || "";
        const cleanInfo = cleanCarTokens({
          brandModel: details?.brandModel,
          title,
          description: descText,
        });

        const model = cleanInfo.model;
        const make = cleanInfo.make;

        let year = details?.year || null;
        let mileageKm = details?.mileageKm ?? null;
        let color = details?.color || (car.color ? String(car.color) : null);
        let isDamaged = details?.isDamaged ?? false;

        // استخراج سال تولید از Schema.org داخلی یا عنوان در صورت خالی بودن
        if (!year && car.productionDate) {
          const yNum = Number(normalizeFaDigits(String(car.productionDate)));
          if (!isNaN(yNum) && yNum > 1300 && yNum < 1500) year = yNum;
        }
        if (!year && descText) {
          const yMatch = normalizeFaDigits(descText).match(/مدل\s*(13[789]\d|140\d|\d{2})/);
          if (yMatch) {
            const y = parseInt(yMatch[1], 10);
            year = y < 100 ? (y < 30 ? 1400 + y : 1300 + y) : y;
          }
        }
        if (!year) {
          const normTitle = normalizeFaDigits(title);
          const tMatch4 = normTitle.match(/\b(13[789]\d|140\d)\b/);
          if (tMatch4) {
            year = parseInt(tMatch4[1], 10);
          } else {
            const tMatch2 = normTitle.match(/(?:مدل|اخر|سال|\b)\s*([789]\d)\b/);
            if (tMatch2) {
              const y2 = parseInt(tMatch2[1], 10);
              year = y2 < 30 ? 1400 + y2 : 1300 + y2;
            }
          }
        }

        // کارکرد
        if (mileageKm === null && car.mileageFromOdometer?.value) {
          const kmNum = Number(normalizeFaDigits(String(car.mileageFromOdometer.value)));
          if (!isNaN(kmNum)) mileageKm = kmNum;
        }
        if (mileageKm === null && descText) {
          const kmMatch = normalizeFaDigits(descText).match(/(\d+)\s*(هزار|کیلومتر|تا کار)/);
          if (kmMatch) {
            const val = parseInt(kmMatch[1], 10);
            mileageKm = kmMatch[2] === "هزار" ? val * 1000 : val;
          }
        }
        if (mileageKm === null) {
          const kmRaw = car.mileageFromOdometer?.value ? String(car.mileageFromOdometer.value) : null;
          mileageKm = kmRaw ? Number(normalizeFaDigits(kmRaw)) || 0 : null;
        }

        // وضعیت بدنه و آسیب‌دیدگی
        if (!isDamaged && car.knownVehicleDamages) {
          const dmgRaw = String(car.knownVehicleDamages).toLowerCase();
          if (dmgRaw.includes("paint") || dmgRaw.includes("accident") || dmgRaw.includes("crash") || dmgRaw.includes("damage")) {
            isDamaged = true;
          }
        }
        if (!isDamaged && descText) {
          const dmgCheck = /تصادفی|چپی|سوخته|اسقاط|اوراق|شاسی\s*(ضربه|خورده|جوش|ترک)|تمام\s*رنگ|دور\s*رنگ|اتاق\s*تعویض/.test(descText);
          if (dmgCheck) isDamaged = true;
        }
        if (!isDamaged) {
          const dmgTitle = /تصادفی|چپی|سوخته|اسقاط|اوراق|شاسی\s*(ضربه|خورده|جوش|ترک)|تمام\s*رنگ|دور\s*رنگ/.test(title);
          if (dmgTitle) isDamaged = true;
        }

        // ساخت توضیحات کامل شامل ارزیابی بدنه و شاسی
        const descParts: string[] = [];
        if (details?.body) descParts.push(`بدنه: ${details.body}`);
        if (details?.chassis) descParts.push(`شاسی: ${details.chassis}`);
        if (details?.motor) descParts.push(`موتور: ${details.motor}`);
        if (details?.gearbox) descParts.push(`گیربکس: ${details.gearbox}`);
        if (details?.fuel) descParts.push(`سوخت: ${details.fuel}`);
        if (descText) descParts.push(descText);
        const fullDescription = descParts.join(" | ") || `آگهی واقعی از سایت دیوار ${targetFaCity}`;

        const imageUrl = car.image ? String(car.image) : null;

        // فیلتر آگهی‌های اسپم و نامعتبر
        const junkCheck = isJunkOrUnrealisticListing({
          title,
          price_toman: priceToman,
          make,
          model,
          year: year && year > 1300 && year < 1500 ? year : null,
        });
        if (junkCheck.isJunk) {
          continue;
        }

        items.push({
          source: "divar",
          source_post_id: sourcePostId,
          source_url: sourceUrl,
          title,
          make: make || "سایر",
          model: model || "نامشخص",
          trim: null,
          year: year && year > 1300 && year < 1500 ? year : null,
          mileage_km: mileageKm,
          color,
          city: car.web_info?.city_persian?.trim() || targetFaCity,
          price_toman: priceToman,
          description: fullDescription,
          image_url: imageUrl,
          is_damaged: isDamaged,
          published_at: new Date().toISOString(),
        });
      } catch {
        // Skip individual failing cars
      }
    }

    return items;
  }
}
