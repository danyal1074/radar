import type { CarBrand, DailyCarPrice } from "./types";

function decodeHtmlEntities(str: string): string {
  return str.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) =>
    String.fromCharCode(parseInt(hex, 16)),
  );
}

function mapBrandNameToCategory(brandName: string): CarBrand {
  const saipaBrands = [
    "پراید",
    "تیبا",
    "ساینا",
    "کوییک",
    "شاهین",
    "سهند",
    "اطلس",
    "سایپا",
    "زامیاد",
    "پادرا",
    "کارون",
    "آریو",
  ];
  const ikcoBrands = [
    "پژو",
    "سمند",
    "دنا",
    "تارا",
    "رانا",
    "پیکان",
    "آریسان",
    "هایما",
    "ری را",
    "ایران خودرو",
    "پارس",
    "لونا",
  ];
  const parsKhodroBrands = ["پارس خودرو", "ریچ", "برلیانس", "زوتی"];
  const modiranBrands = ["ام وی ام", "چری", "فونیکس", "اکستریم", "لوکانو"];
  const kermanBrands = ["جک", "کی ام سی", "لیفان", "بی ای سی"];
  const bahmanBrands = [
    "گروه بهمن",
    "فیدلیتی",
    "دیگنیتی",
    "ریسپکت",
    "کارا",
    "اینرودز",
    "کاپرا",
    "هاوال",
    "بسترن",
    "مزدا",
  ];

  if (saipaBrands.some((b) => brandName.includes(b))) return "سایپا";
  if (ikcoBrands.some((b) => brandName.includes(b))) return "ایران خودرو";
  if (parsKhodroBrands.some((b) => brandName.includes(b))) return "پارس خودرو";
  if (modiranBrands.some((b) => brandName.includes(b))) return "مدیران خودرو";
  if (kermanBrands.some((b) => brandName.includes(b))) return "کرمان موتور";
  if (bahmanBrands.some((b) => brandName.includes(b))) return "گروه بهمن";

  return "سایر";
}

function toEnglishDigits(str: string): string {
  return str
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
}

function parseCardTitle(rawTitle: string): {
  name: string;
  startYear: number;
  endYear: number;
  minPrice: number;
  maxPrice: number;
} | null {
  let decoded = toEnglishDigits(decodeHtmlEntities(rawTitle).trim());
  decoded = decoded.replace(/^.*?خرید و فروش\s+/i, "");

  const m = decoded.match(
    /^(.*?)\s+با بازه تولید\s+(\d{4})\s+تا\s+(?:سال\s+)?(\d{4})\s+از قیمت\s+([\d.]+)\s+تا\s+([\d.]+)\s+(میلیون|میلیارد)/i,
  );
  if (!m) return null;

  const name = m[1].trim();
  const startYear = parseInt(m[2], 10);
  const endYear = parseInt(m[3], 10);
  const rawMin = parseFloat(m[4]);
  const rawMax = parseFloat(m[5]);
  const unit = m[6];

  let minPrice = 0;
  let maxPrice = 0;

  if (unit === "میلیارد") {
    // If lower bound is written as e.g. "685" or "980" (>= 50), it is in millions!
    minPrice = rawMin >= 50 ? Math.round(rawMin * 1_000_000) : Math.round(rawMin * 1_000_000_000);
    maxPrice = rawMax >= 50 ? Math.round(rawMax * 1_000_000) : Math.round(rawMax * 1_000_000_000);
  } else {
    minPrice = Math.round(rawMin * 1_000_000);
    maxPrice = Math.round(rawMax * 1_000_000);
  }

  // Safety check: minPrice must always be <= maxPrice
  if (minPrice > maxPrice) {
    if (minPrice >= 1_000_000_000 && minPrice / 1000 <= maxPrice) {
      minPrice = Math.round(minPrice / 1000);
    } else {
      const temp = minPrice;
      minPrice = maxPrice;
      maxPrice = temp;
    }
  }

  return { name, startYear, endYear, minPrice, maxPrice };
}

async function fetchWithRetry(url: string, retries = 2): Promise<string | null> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        },
        signal: AbortSignal.timeout(12000),
      });
      if (res.ok) return await res.text();
    } catch {
      if (attempt === retries) return null;
      await new Promise((r) => setTimeout(r, 600));
    }
  }
  return null;
}

export async function fetchBaravardPrices(): Promise<DailyCarPrice[]> {
  const mainHtml = await fetchWithRetry("https://baravard.com/pricing");
  if (!mainHtml) {
    console.warn("[baravard] Could not load main pricing page");
    return [];
  }

  // Extract all brands
  const jsonLds = [
    ...mainHtml.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi),
  ];
  let brands: { name: string; url: string }[] = [];
  for (const m of jsonLds) {
    if (m[1].includes("لیست قیمت برندهای خودرو") || m[1].includes("ItemList")) {
      try {
        const data = JSON.parse(m[1]);
        if (data.itemListElement && data.itemListElement.length > 0) {
          brands = data.itemListElement.map((x: any) => ({
            name: x.item?.name,
            url: x.item?.url,
          }));
        }
      } catch {
        // ignore parse errors
      }
    }
  }

  if (brands.length === 0) {
    console.warn("[baravard] No brands found in JSON-LD");
    return [];
  }

  const allCars: DailyCarPrice[] = [];
  const seenIds = new Set<string>();
  const nowStr = new Date().toISOString();

  // Process brands in chunks of 6 concurrent requests
  const concurrency = 6;
  for (let i = 0; i < brands.length; i += concurrency) {
    const chunk = brands.slice(i, i + concurrency);

    await Promise.all(
      chunk.map(async (brand) => {
        try {
          const brandHtml = await fetchWithRetry(brand.url);
          if (!brandHtml) return;

          const brandCategory = mapBrandNameToCategory(brand.name);

          // Extract title matches
          const titleMatches = [
            ...brandHtml.matchAll(/title="محدوده قیمت خرید و فروش ([^"]+)"/gi),
          ];

          // Also extract JSON-LD products for exact Rials if available
          const productMap = new Map<string, { low: number; high: number }>();
          const brandJsonLds = [
            ...brandHtml.matchAll(
              /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
            ),
          ];
          for (const bm of brandJsonLds) {
            if (bm[1].includes('"AggregateOffer"') || bm[1].includes('"Product"')) {
              try {
                const bdata = JSON.parse(bm[1]);
                if (bdata.itemListElement) {
                  for (const el of bdata.itemListElement) {
                    const prod = el.item;
                    if (prod && prod.name && prod.offers) {
                      const low = parseInt(prod.offers.lowPrice, 10) / 10;
                      const high = parseInt(prod.offers.highPrice, 10) / 10;
                      if (!isNaN(low) && !isNaN(high) && low > 0) {
                        productMap.set(prod.name.trim(), { low, high });
                      }
                    }
                  }
                }
              } catch {
                // ignore
              }
            }
          }

          for (const tm of titleMatches) {
            const parsed = parseCardTitle("خرید و فروش " + tm[1]);
            if (!parsed) continue;

            const { name, startYear, endYear } = parsed;
            let minPrice = parsed.minPrice;
            let maxPrice = parsed.maxPrice;

            if (productMap.has(name)) {
              const exact = productMap.get(name)!;
              minPrice = exact.low;
              maxPrice = exact.high;
            }

            if (minPrice <= 0 || maxPrice <= 0) continue;

            const isDiscontinued = startYear > 1500 ? endYear <= 2023 : endYear <= 1402;

            for (let y = startYear; y <= endYear; y++) {
              const progress =
                endYear === startYear ? 1 : (y - startYear) / (endYear - startYear);
              const calculatedPrice = Math.round(minPrice + progress * (maxPrice - minPrice));

              const yearLabel = `مدل ${y}${y === endYear && isDiscontinued ? " (آخرین تولید)" : ""}`;
              const baseId = `baravard-${name}-${y}`
                .replace(/\s+/g, "-")
                .replace(/[^\w\u0600-\u06FF-]/g, "")
                .toLowerCase();

              let id = baseId;
              let c = 1;
              while (seenIds.has(id)) {
                id = `${baseId}-${c++}`;
              }
              seenIds.add(id);

              allCars.push({
                id,
                brand: brandCategory,
                name,
                year: yearLabel,
                priceToman: calculatedPrice,
                isDiscontinued,
                source: "baravard.com",
                updatedAt: nowStr,
              });
            }
          }
        } catch (err: any) {
          console.warn(`[baravard] Error fetching ${brand.name}:`, err.message);
        }
      }),
    );
  }

  return allCars;
}
