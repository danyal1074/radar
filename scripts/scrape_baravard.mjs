import fs from "fs";

function decodeHtmlEntities(str) {
  return str.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) =>
    String.fromCharCode(parseInt(hex, 16))
  );
}

function parseCardTitle(rawTitle) {
  let decoded = decodeHtmlEntities(rawTitle).trim();
  decoded = decoded.replace(/^.*?خرید و فروش\s+/i, "");

  const m = decoded.match(/^(.*?)\s+با بازه تولید\s+(\d{4})\s+تا\s+(?:سال\s+)?(\d{4})\s+از قیمت\s+([\d.]+)\s+تا\s+([\d.]+)\s+(میلیون|میلیارد)/i);
  if (!m) return null;

  const name = m[1].trim();
  const startYear = parseInt(m[2], 10);
  const endYear = parseInt(m[3], 10);
  const unit = m[6];
  const mult = unit === "میلیارد" ? 1_000_000_000 : 1_000_000;
  const minPrice = Math.round(parseFloat(m[4]) * mult);
  const maxPrice = Math.round(parseFloat(m[5]) * mult);

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
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  return null;
}

async function run() {
  console.log("1. Fetching main pricing page https://baravard.com/pricing ...");
  const mainHtml = await fetchWithRetry("https://baravard.com/pricing");
  if (!mainHtml) {
    console.error("Failed to load main page");
    return;
  }

  // Extract all brands
  const jsonLds = [...mainHtml.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
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
      } catch (e) {}
    }
  }

  console.log(`Found ${brands.length} brands on Baravard.`);

  const allCars = [];
  const seenIds = new Set();
  const nowStr = new Date().toISOString();

  // Process brands in chunks of 6 concurrent requests
  const concurrency = 6;
  for (let i = 0; i < brands.length; i += concurrency) {
    const chunk = brands.slice(i, i + concurrency);
    console.log(`Fetching brands ${i + 1} to ${Math.min(i + concurrency, brands.length)}: ${chunk.map(b => b.name).join(", ")}`);

    await Promise.all(
      chunk.map(async (brand) => {
        try {
          const brandHtml = await fetchWithRetry(brand.url);
          if (!brandHtml) return;

          // Extract title matches
          const titleMatches = [...brandHtml.matchAll(/title="محدوده قیمت خرید و فروش ([^"]+)"/gi)];
          
          // Also extract JSON-LD products for exact Rials if available
          const productMap = new Map();
          const brandJsonLds = [...brandHtml.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
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
              } catch (e) {}
            }
          }

          for (const tm of titleMatches) {
            const parsed = parseCardTitle("خرید و فروش " + tm[1]);
            if (!parsed) continue;

            const { name, startYear, endYear } = parsed;
            let minPrice = parsed.minPrice;
            let maxPrice = parsed.maxPrice;

            // If JSON-LD has more exact numbers, use them
            if (productMap.has(name)) {
              const exact = productMap.get(name);
              minPrice = exact.low;
              maxPrice = exact.high;
            }

            // Determine if discontinued (endYear is not current or upcoming year)
            // Iranian calendar current year is ~1403-1405
            const isDiscontinued = startYear > 1500 ? endYear <= 2023 : endYear <= 1402;

            // Generate items for each year
            const years = [];
            for (let y = startYear; y <= endYear; y++) {
              years.push(y);
            }

            for (const y of years) {
              const progress = endYear === startYear ? 1 : (y - startYear) / (endYear - startYear);
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
                brand: brand.name,
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
          console.warn(`Error fetching ${brand.name} (${brand.url}):`, err.message);
        }
      })
    );
  }

  console.log(`\n===========================================`);
  console.log(`Total cars generated from Baravard: ${allCars.length}`);
  fs.writeFileSync(".data/baravard_cars.json", JSON.stringify(allCars, null, 2), "utf8");
  console.log("Saved to .data/baravard_cars.json");

  // Show sample
  const samplePride = allCars.filter((c) => c.name.includes("132") || c.name.includes("۱۳۲"));
  console.log("Sample Pride 132 count:", samplePride.length);
  console.log(samplePride.slice(0, 8));
}

run().catch(console.error);
