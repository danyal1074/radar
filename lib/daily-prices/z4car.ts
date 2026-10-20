import type { DailyCarPrice, CarBrand } from "./types";

export const PRODUCTION_YEARS: Record<string, Record<string, [number, number]>> = {
  // سایپا
  "پراید ۱۳۲": {
    SE: [1389, 1398],
    SX: [1388, 1392],
    SL: [1388, 1391],
    EX: [1387, 1391],
    ساده: [1386, 1389],
    "دوگانه سوز": [1387, 1395],
  },
  "پراید ۱۳۱": {
    SE: [1392, 1399],
    SX: [1389, 1392],
    SL: [1389, 1391],
    LE: [1390, 1392],
    EX: [1389, 1392],
    "دوگانه سوز": [1390, 1396],
  },
  "پراید ۱۱۱": {
    SE: [1392, 1399],
    SX: [1389, 1392],
    SL: [1389, 1391],
    EX: [1389, 1392],
  },
  "پراید صبا": {
    صبا: [1382, 1389],
  },
  "پراید ۱۴۱": {
    "۱۴۱": [1382, 1391],
  },
  "پراید وانت": {
    SE: [1393, 1403],
    لاینر: [1396, 1403],
    GX: [1402, 1404],
  },
  "پراید ۱۵۱ GX": {
    معمولی: [1402, 1404],
    لاینر: [1402, 1404],
  },
  "تیبا صندوقدار بنزینی": {
    SX: [1389, 1401],
    EX: [1392, 1396],
    پلاس: [1398, 1400],
  },
  "تیبا هاچبک": {
    EX: [1393, 1401],
    SX: [1393, 1396],
    پلاس: [1398, 1400],
  },
  "ساینا S دنده ای": {
    استاندارد: [1399, 1403],
    "دنده ای": [1395, 1401],
  },
  "ساینا S دوگانه سوز": {
    دوگانه: [1401, 1403],
  },
  "کوییک S": {
    معمولی: [1400, 1403],
    استاندارد: [1401, 1404],
    "R استاندارد": [1401, 1404],
  },
  "کوییک r": {
    معمولی: [1398, 1402],
    "پلاس اتوماتیک": [1400, 1402],
  },
  "نیسان وانت زامیاد": {
    بنزینی: [1388, 1403],
    "دوگانه سوز": [1390, 1403],
    دیزلی: [1390, 1401],
  },
  "سیتروئن زانتیا ۲ لیتری": {
    SX: [1381, 1389],
    "۲ لیتری": [1381, 1389],
  },
  "سیتروئن زانتیا ۱.۸ لیتری": {
    "۱.۸ لیتری": [1381, 1385],
  },
  "کیا ریو مونتاژ": {
    "دنده ای": [1384, 1390],
  },
  // ایران خودرو
  "پژو ۴۰۵": {
    GLX: [1382, 1399],
    SLX: [1388, 1399],
    "دوگانه سوز": [1387, 1398],
  },
  "پژو ۴۰۵ GLX بنزینی": {
    GLX: [1382, 1399],
  },
  "پژو ۴۰۵ SLX موتور TU5": {
    SLX: [1388, 1399],
  },
  "پژو پارس": {
    سال: [1385, 1402],
    LX: [1392, 1402],
    ELX: [1390, 1402],
    اتوماتیک: [1389, 1399],
  },
  "پژو ۲۰۶": {
    "تیپ ۲": [1385, 1401],
    "تیپ ۳": [1385, 1402],
    "تیپ ۵": [1385, 1399],
    صندوقدار: [1386, 1399],
  },
  "پژو ۲۰۶ صندوقدار": {
    V8: [1386, 1399],
    V9: [1387, 1390],
  },
  "پژو ۲۰۷ دنده‌ای": {
    "دنده‌ای": [1389, 1403],
    پانوراما: [1399, 1403],
  },
  سمند: {
    LX: [1385, 1400],
    EF7: [1388, 1401],
    SE: [1389, 1397],
  },
  "سمند LX XU7": {
    LX: [1385, 1400],
    XU7: [1385, 1400],
  },
  "سمند LX EF7 بنزینی": {
    بنزینی: [1388, 1401],
    ef7: [1388, 1401],
  },
  "سمند LX EF7 پایه گازسوز": {
    "دوگانه سوز": [1388, 1401],
    معمولی: [1388, 1401],
  },
  سورن: {
    معمولی: [1386, 1392],
    ELX: [1390, 1399],
    "ELX توربو": [1395, 1397],
  },
  دنا: {
    "تیپ 1": [1393, 1401],
    "تیپ 2": [1395, 1401],
  },
  "دنا پلاس": {
    "4 ایربگ فول": [1396, 1400],
    "2 ایربگ نیمه فول": [1397, 1401],
    "6 دنده": [1401, 1403],
  },
  رانا: {
    LX: [1392, 1399],
    EL: [1391, 1393],
  },
  "رانا معمولی": {
    LX: [1392, 1399],
    EL: [1391, 1393],
  },
  آریسان: {
    "دوگانه سوز": [1394, 1400],
  },
  "پیکان وانت": {
    بنزینی: [1382, 1393],
    "دوگانه سوز": [1385, 1393],
  },
  پیکان: {
    "دنده ای": [1378, 1383],
  },
  // پارس خودرو
  "رنو تندر ۹۰ پارس خودرو": {
    E2: [1386, 1398],
    E1: [1386, 1392],
    E0: [1386, 1390],
  },
  "رنو پارس تندر": {
    "دنده ای": [1391, 1398],
    "گیربکس JHQ": [1396, 1398],
  },
  "نیسان ماکسیما": {
    اتوماتیک: [1382, 1391],
    "دنده ای": [1382, 1390],
  },
};

export async function fetchZ4CarPrices(): Promise<DailyCarPrice[]> {
  const brandUrls: { url: string; brand: CarBrand }[] = [
    { url: "https://z4car.com/price/saipa", brand: "سایپا" },
    { url: "https://z4car.com/price/ikco", brand: "ایران خودرو" },
    { url: "https://z4car.com/price/parskhodro", brand: "پارس خودرو" },
  ];

  const results: DailyCarPrice[] = [];
  const seenIds = new Set<string>();
  const nowStr = new Date().toISOString();

  for (const item of brandUrls) {
    try {
      const res = await fetch(item.url, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
        signal: AbortSignal.timeout(10000),
      });

      if (!res.ok) continue;
      const html = await res.text();
      const blocks = html.split('<article id="post-');

      for (let i = 1; i < blocks.length; i++) {
        const block = blocks[i];
        const titleMatch = block.match(/<h2[^>]*>([^<]+)<\/h2>/i);
        const trimsMatch = block.match(/<li class='divtable details-4'[^>]*>([\s\S]*?)<\/li>/i);
        const pricesMatch = block.match(/<li class='divtable details-5'[^>]*>([\s\S]*?)<\/li>/i);

        if (!titleMatch || !trimsMatch || !pricesMatch) continue;

        const modelTitle = titleMatch[1].replace("قیمت ", "").trim();
        const trims = [...trimsMatch[1].matchAll(/<div>([^<]*)<\/div>/g)].map((x) => x[1].trim());
        const priceRanges = [...pricesMatch[1].matchAll(/<div>([^<]*)<\/div>/g)].map((x) =>
          x[1].trim(),
        );

        // Find year config for this model
        let matchedKey: string | null = null;
        for (const k of Object.keys(PRODUCTION_YEARS)) {
          if (modelTitle.includes(k) || k.includes(modelTitle)) {
            matchedKey = k;
            break;
          }
        }

        const modelConfig = matchedKey ? PRODUCTION_YEARS[matchedKey] : null;

        for (let j = 0; j < Math.min(trims.length, priceRanges.length); j++) {
          const trimName = trims[j];
          const rangeText = priceRanges[j];

          const parts = rangeText.split("الی").map((p) => parseInt(p.replace(/[,\s]/g, ""), 10));
          let minPrice = 0;
          let maxPrice = 0;
          if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
            minPrice = parts[0];
            maxPrice = parts[1];
          } else if (parts.length === 1 && !isNaN(parts[0])) {
            minPrice = parts[0];
            maxPrice = parts[0];
          }

          if (minPrice <= 0 || maxPrice <= 0) continue;

          // Determine years for this trim
          let trimYears: [number, number] | null = null;
          if (modelConfig) {
            for (const tk of Object.keys(modelConfig)) {
              if (trimName.includes(tk) || tk.includes(trimName)) {
                trimYears = modelConfig[tk];
                break;
              }
            }
          }

          if (!trimYears) {
            trimYears = [1390, 1399];
          }

          const [startYear, endYear] = trimYears;

          // Sample representative years: start, end, model 90, and intermediate years
          const sampleYears: number[] = [];
          for (let y = startYear; y <= endYear; y++) {
            if (
              endYear - startYear <= 6 ||
              y === startYear ||
              y === endYear ||
              y % 2 === 0 ||
              y === 1390
            ) {
              sampleYears.push(y);
            }
          }

          for (const y of [...new Set(sampleYears)].sort((a, b) => b - a)) {
            const progress = endYear === startYear ? 1 : (y - startYear) / (endYear - startYear);
            const calculatedPrice = Math.round(minPrice + progress * (maxPrice - minPrice));

            const fullName = `${modelTitle} ${trimName}`.replace(/\s+/g, " ").trim();
            const yearStr = `مدل ${y}${y === endYear && endYear <= 1401 ? " (آخرین تولید)" : ""}`;
            const baseId = `z4car-${fullName}-${y}`
              .replace(/\s+/g, "-")
              .replace(/[^\w\u0600-\u06FF-]/g, "")
              .toLowerCase();

            let id = baseId;
            let counter = 1;
            while (seenIds.has(id)) {
              id = `${baseId}-${counter++}`;
            }
            seenIds.add(id);

            results.push({
              id,
              brand: item.brand,
              name: fullName,
              year: yearStr,
              priceToman: calculatedPrice,
              isDiscontinued: endYear <= 1402,
              source: "z4car.com",
              updatedAt: nowStr,
            });
          }
        }
      }
    } catch (err) {
      console.warn(`[z4car] Failed fetching from ${item.url}:`, err);
    }
  }

  return results;
}
