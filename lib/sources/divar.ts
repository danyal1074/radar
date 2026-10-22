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
      signal: AbortSignal.timeout(2000),
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
      next: { revalidate: 60 },
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

    // Process top 10 newest cars with fast parallel details extraction
    const carsToProcess = rawCars.slice(0, 10);
    const detailsList = await Promise.all(
      carsToProcess.map(async (car, idx) => {
        // Fast path: if schema already has core attributes, skip extra API call after top 2
        const hasCoreInfo = Boolean(car.productionDate && car.mileageFromOdometer?.value);
        if (hasCoreInfo && idx >= 2) return null;

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

        // اولویت ۱: مشخصات رسمی جدول دیوار
        let model = details?.brandModel?.trim() || "";
        let year = details?.year || null;
        let mileageKm = details?.mileageKm ?? null;
        let color = details?.color || (car.color ? String(car.color) : null);
        let isDamaged = details?.isDamaged ?? false;

        // اولویت ۲: استخراج از Schema.org داخلی صفحه آگهی
        if (!year && car.productionDate) {
          const yNum = Number(normalizeFaDigits(String(car.productionDate)));
          if (!isNaN(yNum) && yNum > 1300 && yNum < 1500) year = yNum;
        }
        if (mileageKm === null && car.mileageFromOdometer?.value) {
          const kmNum = Number(normalizeFaDigits(String(car.mileageFromOdometer.value)));
          if (!isNaN(kmNum)) mileageKm = kmNum;
        }
        if (!isDamaged && car.knownVehicleDamages) {
          const dmgRaw = String(car.knownVehicleDamages).toLowerCase();
          if (dmgRaw.includes("paint") || dmgRaw.includes("accident") || dmgRaw.includes("crash") || dmgRaw.includes("damage")) {
            isDamaged = true;
          }
        }

        // اولویت ۳: استخراج از توضیحات آگهی در صورت ناقص بودن
        const descText = details?.description || "";
        if (!model && descText) {
          const modelMatch = descText.match(/(پژو\s*پارس|پراید\s*\d+|پژو\s*206|پژو\s*207|کوییک|ساینا|تیبا|تارا|دنا|شاهین|سمند|سورن)/);
          if (modelMatch) model = modelMatch[1];
        }
        if (!year && descText) {
          const yMatch = normalizeFaDigits(descText).match(/مدل\s*(13[789]\d|140\d|\d{2})/);
          if (yMatch) {
            const y = parseInt(yMatch[1], 10);
            year = y < 100 ? (y < 30 ? 1400 + y : 1300 + y) : y;
          }
        }
        if (mileageKm === null && descText) {
          const kmMatch = normalizeFaDigits(descText).match(/(\d+)\s*(هزار|کیلومتر|تا کار)/);
          if (kmMatch) {
            const val = parseInt(kmMatch[1], 10);
            mileageKm = kmMatch[2] === "هزار" ? val * 1000 : val;
          }
        }
        if (!isDamaged && descText) {
          const dmgCheck = /تصادفی|چپی|سوخته|اسقاط|اوراق|شاسی\s*(ضربه|خورده|جوش|ترک)|تمام\s*رنگ|دور\s*رنگ|اتاق\s*تعویض/.test(descText);
          if (dmgCheck) isDamaged = true;
        }

        // اولویت ۴: استخراج از عنوان آگهی در صورت خالی بودن
        if (!model) {
          model = title;
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
        if (mileageKm === null) {
          const kmRaw = car.mileageFromOdometer?.value ? String(car.mileageFromOdometer.value) : null;
          mileageKm = kmRaw ? Number(normalizeFaDigits(kmRaw)) || 0 : null;
        }
        if (!isDamaged) {
          const dmgTitle = /تصادفی|چپی|سوخته|اسقاط|اوراق|شاسی\s*(ضربه|خورده|جوش|ترک)|تمام\s*رنگ|دور\s*رنگ/.test(title);
          if (dmgTitle) isDamaged = true;
        }

        const make = detectMake(`${model} ${title}`);

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
