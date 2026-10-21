import { isJunkOrUnrealisticListing } from "../junk-filter";
import type { ListingImportItem } from "../validation";
import type { FetchResult, ListingSourceProvider } from "./provider";

function normalizeFaDigits(str: string): string {
  if (!str) return "";
  return str.replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
}

export class DivarListingSourceProvider implements ListingSourceProvider {
  readonly id = "divar";
  readonly displayName = "سایت دیوار";

  constructor(private readonly defaultCity: string = "torbat-heydariyeh") {}

  async fetchLatest(citySlug?: string, query?: string): Promise<FetchResult> {
    const city = citySlug || this.defaultCity;
    let url = `https://divar.ir/s/${city}/auto`;
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
    const items = this.parseSchemaLd(html, city);
    return { items, isSample: false };
  }

  private parseSchemaLd(html: string, defaultCity: string): ListingImportItem[] {
    const matches = html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g);
    const items: ListingImportItem[] = [];

    for (const match of matches) {
      try {
        const parsed = JSON.parse(match[1]);
        const list = Array.isArray(parsed) ? parsed : [parsed];

        for (const car of list) {
          if (!car || car["@type"] !== "Car") continue;

          const title = String(car.name || car.web_info?.title || "").trim();
          const sourceUrl = car.url || null;
          const tokenMatch = sourceUrl?.match(/\/([a-zA-Z0-9_-]+)(?:\/)?$/);
          const sourcePostId = tokenMatch ? tokenMatch[1] : `divar-${Date.now()}-${Math.random()}`;

          // Price extraction: Divar offers.price is in IRR (Rials) -> convert to Toman
          const priceRaw = car.offers?.price ? String(car.offers.price) : "0";
          const priceRial = Number(normalizeFaDigits(priceRaw)) || 0;
          const priceToman = Math.floor(priceRial / 10);

          if (priceToman < 10_000_000) {
            // Ignore token prices below 10M Toman
            continue;
          }

          const yearRaw = car.productionDate ? String(car.productionDate) : null;
          const year = yearRaw ? Number(normalizeFaDigits(yearRaw)) || null : null;

          const kmRaw = car.mileageFromOdometer?.value ? String(car.mileageFromOdometer.value) : null;
          const mileageKm = kmRaw ? Number(normalizeFaDigits(kmRaw)) || 0 : null;

          const brandObj = car.brand;
          let make = String(typeof brandObj === "object" ? brandObj?.name || "" : brandObj || "").trim();
          const cleanMakeLower = make.toLowerCase();
          const brandMap: Record<string, string> = {
            pride: "پراید",
            peugeot: "پژو",
            samand: "سمند",
            soren: "سورن",
            dena: "دنا",
            tara: "تارا",
            quick: "کوییک",
            quik: "کوییک",
            saina: "ساینا",
            shahin: "شاهین",
            tiba: "تیبا",
            rana: "رانا",
            paykan: "پیکان",
            zamyad: "زامیاد",
            nissan: "نیسان",
            arisan: "آریسان",
            haima: "هایما",
            jac: "جک",
            kmc: "کی ام سی",
            mvm: "ام وی ام",
            chery: "چری",
            fownix: "فونیکس",
            brilliance: "برلیانس",
            lifan: "لیفان",
            renault: "رنو",
            kia: "کیا",
            hyundai: "هیوندای",
            toyota: "تویوتا",
          };
          if (brandMap[cleanMakeLower]) {
            make = brandMap[cleanMakeLower];
          }

          if (!make || make === "light" || make === "سایر") {
            const makes = [
              "پژو", "پراید", "تیبا", "ساینا", "کوییک", "کوئیک", "شاهین", "تارا", "دنا", "رانا", "سمند", "سورن",
              "پیکان", "ریو", "زانتیا", "ماتیز", "مزدا", "نیسان", "زامیاد", "آریسان", "هایما", "جک", "ام وی ام",
              "چری", "فونیکس", "فیدلیتی", "دیگنیتی", "لاماری", "کیا", "هیوندای", "تویوتا", "رنو", "برلیانس", "لیفان"
            ];
            for (const m of makes) {
              if (title.includes(m)) {
                make = m;
                break;
              }
            }
          }

          // مدل دقیق خودرو: ترجیحاً از نام آگهی و مشخصات اگر شامل تیپ باشد
          let model = String(car.model || "").trim() || title;
          if (title && (title.includes("پلاس") || title.includes("دوگانه") || title.includes("TU5") || title.includes("تیپ") || title.includes("اتوماتیک"))) {
            model = title;
          }

          const color = car.color ? String(car.color) : null;
          const city = car.web_info?.city_persian || defaultCity;
          const imageUrl = car.image ? String(car.image) : null;

          // Strict Torbat Heydariyeh filtering
          if (defaultCity === "torbat-heydariyeh" && !city.includes("تربت") && !title.includes("تربت")) {
            continue;
          }

          // Filter out junk listings (حواله، اقساط، قیمت‌های غیرواقعی، خریدار، و...)
          const junkCheck = isJunkOrUnrealisticListing({
            title,
            price_toman: priceToman,
            make: make || "سایر",
            model: model || "نامشخص",
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
            city: "تربت‌حیدریه",
            price_toman: priceToman,
            description: `آگهی واقعی از سایت دیوار تربت‌حیدریه`,
            image_url: imageUrl,
            published_at: new Date().toISOString(),
          });
        }
      } catch {
        // Skip invalid JSON-LD blocks
      }
    }

    return items;
  }
}
