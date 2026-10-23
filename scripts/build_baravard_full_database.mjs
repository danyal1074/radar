import fs from 'node:fs';

function toEnglishDigits(str) {
  return str
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
}

function decodeHtmlEntities(str) {
  return str.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) =>
    String.fromCharCode(parseInt(hex, 16)),
  );
}

function parseCardTitle(rawTitle) {
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
    minPrice = rawMin >= 50 ? Math.round(rawMin * 1_000_000) : Math.round(rawMin * 1_000_000_000);
    maxPrice = rawMax >= 50 ? Math.round(rawMax * 1_000_000) : Math.round(rawMax * 1_000_000_000);
  } else {
    minPrice = Math.round(rawMin * 1_000_000);
    maxPrice = Math.round(rawMax * 1_000_000);
  }

  return { name, startYear, endYear, minPrice, maxPrice };
}

async function scrapeAll() {
  console.log('Fetching https://baravard.com/pricing ...');
  const res = await fetch('https://baravard.com/pricing', {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });
  const html = await res.text();
  const slugs = [...new Set([...html.matchAll(/href=["'](\/pricing\/[a-zA-Z0-9_-]+)["']/g)].map(m => m[1]))];
  console.log(`Found ${slugs.length} brand links.`);

  // Filter to car brands (exclude root or non-car)
  const validSlugs = slugs.filter(s => s !== '/pricing' && !s.includes('faq') && !s.includes('terms'));

  const results = [];
  const seenIds = new Set();

  for (const slug of validSlugs) {
    try {
      const bRes = await fetch(`https://baravard.com${slug}`, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (!bRes.ok) continue;
      const bHtml = await bRes.text();
      const titleMatches = [...bHtml.matchAll(/title="محدوده قیمت خرید و فروش ([^"]+)"/gi)];
      
      for (const tm of titleMatches) {
        const parsed = parseCardTitle(tm[1]);
        if (!parsed) continue;
        const { name, startYear, endYear, minPrice, maxPrice } = parsed;
        if (minPrice <= 0 || maxPrice <= 0) continue;

        for (let y = startYear; y <= endYear; y++) {
          const progress = endYear === startYear ? 1 : (y - startYear) / (endYear - startYear);
          const priceToman = Math.round(minPrice + progress * (maxPrice - minPrice));
          const yearLabel = `مدل ${y}`;
          const id = `baravard-${name}-${y}`.replace(/\s+/g, '-').replace(/[^\w\u0600-\u06FF-]/g, '').toLowerCase();

          if (!seenIds.has(id)) {
            seenIds.add(id);
            results.push({
              id,
              brand: slug.replace('/pricing/', ''),
              name,
              year: yearLabel,
              priceToman,
              isDiscontinued: endYear < 1403,
              source: 'baravard.com',
              updatedAt: new Date().toISOString()
            });
          }
        }
      }
      console.log(`Scraped ${slug}: ${titleMatches.length} models (total so far: ${results.length})`);
    } catch(e) {
      console.warn(`Error on ${slug}:`, e.message);
    }
  }

  console.log(`\nSuccessfully scraped ${results.length} total cars from Baravard!`);
  fs.writeFileSync('.data/baravard_live_prices.json', JSON.stringify(results, null, 2), 'utf8');
}

scrapeAll();
