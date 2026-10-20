import fs from "fs";
import path from "path";

function decodeHtmlEntities(str) {
  return str.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) =>
    String.fromCharCode(parseInt(hex, 16))
  );
}

function mapBrandNameToCategory(brandName) {
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

function toEnglishDigits(str) {
  return str
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
}

function parseCardTitle(rawTitle) {
  let decoded = toEnglishDigits(decodeHtmlEntities(rawTitle).trim());
  decoded = decoded.replace(/^.*?خرید و فروش\s+/i, "");

  const m = decoded.match(
    /^(.*?)\s+با بازه تولید\s+(\d{4})\s+تا\s+(?:سال\s+)?(\d{4})\s+از قیمت\s+([\d.]+)\s+تا\s+([\d.]+)\s+(میلیون|میلیارد)/i
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

async function fetchWithRetry(url, retries = 2) {
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

const DATA_DIR = path.resolve(process.cwd(), ".data");
const PRICES_FILE = path.join(DATA_DIR, "daily_car_prices.json");

async function main() {
  console.log("1. Fetching main pricing directory https://baravard.com/pricing ...");
  const mainHtml = await fetchWithRetry("https://baravard.com/pricing");
  if (!mainHtml) {
    console.error("Could not load baravard pricing directory");
    return;
  }

  const jsonLds = [
    ...mainHtml.matchAll(
      /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
    ),
  ];
  let brands = [];
  for (const m of jsonLds) {
    if (m[1].includes("لیست قیمت برندهای خودرو") || m[1].includes("ItemList")) {
      try {
        const data = JSON.parse(m[1]);
        if (data.itemListElement && data.itemListElement.length > 0) {
          brands = data.itemListElement.map((x) => ({
            name: x.item?.name,
            url: x.item?.url,
          }));
        }
      } catch {}
    }
  }

  console.log(`Found ${brands.length} car brands on Baravard.`);

  const allCars = [];
  const seenIds = new Set();
  const nowStr = new Date().toISOString();

  const concurrency = 6;
  for (let i = 0; i < brands.length; i += concurrency) {
    const chunk = brands.slice(i, i + concurrency);

    await Promise.all(
      chunk.map(async (brand) => {
        try {
          const brandHtml = await fetchWithRetry(brand.url);
          if (!brandHtml) return;

          const brandCategory = mapBrandNameToCategory(brand.name);
          const titleMatches = [
            ...brandHtml.matchAll(/title="محدوده قیمت خرید و فروش ([^"]+)"/gi),
          ];

          const productMap = new Map();
          const brandJsonLds = [
            ...brandHtml.matchAll(
              /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
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
              } catch {}
            }
          }

          for (const tm of titleMatches) {
            const parsed = parseCardTitle("خرید و فروش " + tm[1]);
            if (!parsed) continue;

            const { name, startYear, endYear } = parsed;
            let minPrice = parsed.minPrice;
            let maxPrice = parsed.maxPrice;

            if (productMap.has(name)) {
              const exact = productMap.get(name);
              minPrice = exact.low;
              maxPrice = exact.high;
            }

            if (minPrice <= 0 || maxPrice <= 0) continue;

            const isDiscontinued =
              startYear > 1500 ? endYear <= 2023 : endYear <= 1402;

            for (let y = startYear; y <= endYear; y++) {
              const progress =
                endYear === startYear ? 1 : (y - startYear) / (endYear - startYear);
              const calculatedPrice = Math.round(
                minPrice + progress * (maxPrice - minPrice)
              );

              const yearLabel = `مدل ${y}${
                y === endYear && isDiscontinued ? " (آخرین تولید)" : ""
              }`;
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
        } catch (err) {
          console.warn(`[baravard] Error fetching ${brand.name}:`, err.message);
        }
      })
    );
  }

  console.log(`Fetched ${allCars.length} car entries from baravard.com`);

  // Load existing data to preserve any manual edits by admin
  let existing = [];
  try {
    if (fs.existsSync(PRICES_FILE)) {
      existing = JSON.parse(fs.readFileSync(PRICES_FILE, "utf8"));
    }
  } catch {}

  const existingMap = new Map();
  for (const item of existing) {
    if (item.isEditedByAdmin) {
      existingMap.set(item.id, item);
    }
  }

  const merged = [];
  const finalSeenIds = new Set();

  for (const car of allCars) {
    if (finalSeenIds.has(car.id)) continue;
    finalSeenIds.add(car.id);

    if (existingMap.has(car.id)) {
      merged.push(existingMap.get(car.id));
    } else {
      merged.push(car);
    }
  }

  // Preserve any manual edits not already added
  for (const [id, item] of existingMap.entries()) {
    if (!finalSeenIds.has(id)) {
      finalSeenIds.add(id);
      merged.push(item);
    }
  }

  fs.writeFileSync(PRICES_FILE, JSON.stringify(merged, null, 2), "utf8");
  console.log(
    `✅ Successfully saved ${merged.length} cars from Baravard into ${PRICES_FILE}!`
  );

  // Verification checks
  const pride132 = merged.filter(
    (c) => c.name.includes("132") || c.name.includes("۱۳۲")
  );
  console.log("Pride 132 count:", pride132.length);
  console.log("Sample Pride 132:", pride132.slice(0, 5));

  const pars = merged.filter((c) => c.name.includes("پارس"));
  console.log("Pars count:", pars.length);
  console.log("Sample Pars:", pars.slice(0, 5));
}

main().catch(console.error);
