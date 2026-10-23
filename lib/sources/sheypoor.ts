import { isJunkOrUnrealisticListing } from "../junk-filter";
import type { ListingImportItem } from "../validation";
import type { FetchResult, ListingSourceProvider } from "./provider";

function normalizeFaDigits(str: string): string {
  if (!str) return "";
  return str.replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
}

function parseCarInfo(title: string): { make: string; model: string; year: number | null } {
  const t = title.trim();
  let make = "سایر";
  const model = t;
  let year: number | null = null;

  const year4Match = t.match(/\b(13[789]\d|140\d)\b/);
  if (year4Match) {
    year = Number(year4Match[1]);
  } else {
    const year2Match = t.match(/مدل\s*(\d{2})\b/);
    if (year2Match) {
      const y2 = Number(year2Match[1]);
      year = y2 < 30 ? 1400 + y2 : 1300 + y2;
    }
  }

  const makes = [
    "پژو", "پراید", "تیبا", "ساینا", "کوییک", "شاهین", "تارا", "دنا", "رانا", "سمند",
    "بسترن", "جک", "ام وی ام", "چری", "فونیکس", "فیدلیتی", "دیگنیتی", "لاماری", "هایما",
    "کیاموتورز", "کیا", "هیوندای", "تویوتا", "نیسان", "رنو", "مزدا", "چانگان", "لیفان", "برلیانس",
  ];

  for (const m of makes) {
    if (t.includes(m)) {
      make = m;
      break;
    }
  }

  return { make, model, year };
}

export class SheypoorListingSourceProvider implements ListingSourceProvider {
  get id(): string {
    return this.defaultCity === "mashhad" ? "sheypoor-mashhad" : "sheypoor";
  }
  get displayName(): string {
    return this.defaultCity === "mashhad" ? "شیپور مشهد" : "شیپور تربت‌حیدریه";
  }

  constructor(private readonly defaultCity: "torbat-heydariyeh" | "mashhad" | string = "torbat-heydariyeh") {}

  async fetchLatest(citySlug?: string, query?: string): Promise<FetchResult> {
    const city = citySlug || this.defaultCity;
    let url = `https://www.sheypoor.com/s/${city}/car`;
    if (query) {
      url += `?q=${encodeURIComponent(query)}`;
    }

    try {
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
        return { items: [], isSample: false };
      }

      const html = await res.text();
      const items = this.parseSheypoorHtml(html, city);
      return { items, isSample: false };
    } catch {
      return { items: [], isSample: false };
    }
  }

  private parseSheypoorHtml(html: string, fallbackCity: string): ListingImportItem[] {
    const pushMatches = [...html.matchAll(/self\.__next_f\.push\(\[1,"([\s\S]*?)"\]\)/g)];
    let fullPayload = "";
    for (const m of pushMatches) {
      try {
        fullPayload += JSON.parse(`"${m[1]}"`);
      } catch {
        fullPayload += m[1];
      }
    }

    const itemRegex =
      /"id":"(\d+)"[\s\S]*?"title":"([^"]+)"[\s\S]*?"url":"([^"]+)"[\s\S]*?"amount":"([^"]+)"[\s\S]*?"currency":"([^"]+)"[\s\S]*?"location":"([^"]+)"/g;
    const items: ListingImportItem[] = [];
    let match;

    while ((match = itemRegex.exec(fullPayload)) !== null) {
      const title = match[2].trim();
      const rawUrl = match[3];
      const amountStr = match[4].replace(/,/g, "");
      const currency = match[5];
      const location = match[6];

      const targetFaCity = fallbackCity === "mashhad" ? "مشهد" : "تربت‌حیدریه";

      // Strict city filtering
      if (fallbackCity === "torbat-heydariyeh" && !location.includes("تربت")) {
        continue;
      }
      if (fallbackCity === "mashhad" && !location.includes("مشهد")) {
        continue;
      }

      // Extract listing ID from URL if possible
      const idMatch = rawUrl.match(/-(\d+)\.html/);
      const postId = idMatch ? idMatch[1] : match[1];

      let priceToman = Number(normalizeFaDigits(amountStr)) || 0;
      if (currency.includes("ریال")) {
        priceToman = Math.floor(priceToman / 10);
      }

      if (priceToman < 10_000_000) {
        continue;
      }

      const { make, model, year } = parseCarInfo(title);

      // Filter out junk listings (حواله، اقساط، قیمت‌های غیرواقعی، خریدار، و...)
      const junkCheck = isJunkOrUnrealisticListing({
        title,
        price_toman: priceToman,
        make,
        model,
        year,
      });
      if (junkCheck.isJunk) {
        continue;
      }

      items.push({
        source: "sheypoor",
        source_post_id: postId,
        source_url: rawUrl,
        title,
        make,
        model,
        trim: null,
        year,
        mileage_km: null,
        color: null,
        city: targetFaCity,
        price_toman: priceToman,
        description: `آگهی واقعی از سایت شیپور ${targetFaCity} (${location})`,
        image_url: null,
        published_at: new Date().toISOString(),
      });
    }

    return items;
  }
}
