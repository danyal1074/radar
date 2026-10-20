import type { EstimateInput, EstimateResult, PriceEstimationProvider } from "./provider";
import { getDailyCarPrices, lookupDailyPrice } from "../daily-prices/service";

/**
 * ماتریس جامع قیمت کارشناسی روز خودروهای بازار ایران (بر حسب تومان)
 * بر اساس آخرین داده‌های میدانی و کارشناسی بازار خودرو پاییز ۱۴۰۴ / بهار ۱۴۰۵
 */
const BENCHMARK_MAP: Record<string, Record<number, number>> = {
  // پراید سواری (صبا، ۱۳۱، ۱۳۲، ۱۱۱، نسیم، هاچبک)
  pride: {
    1380: 150_000_000,
    1382: 165_000_000,
    1384: 180_000_000,
    1386: 200_000_000,
    1387: 215_000_000,
    1388: 225_000_000,
    1389: 240_000_000,
    1390: 255_000_000,
    1392: 275_000_000,
    1394: 295_000_000,
    1396: 325_000_000,
    1397: 345_000_000,
    1398: 365_000_000,
    1399: 385_000_000,
  },
  // پراید وانت ۱۵۱
  pride_pickup: {
    1393: 270_000_000,
    1395: 295_000_000,
    1397: 325_000_000,
    1399: 355_000_000,
    1401: 395_000_000,
    1402: 425_000_000,
    1403: 450_000_000,
  },
  // تیبا ۱ و تیبا ۲
  tiba: {
    1393: 295_000_000,
    1395: 325_000_000,
    1397: 360_000_000,
    1398: 385_000_000,
    1399: 415_000_000,
    1400: 445_000_000,
    1401: 485_000_000,
  },
  // ساینا (معمولی، S، DA، اتوماتیک)
  saina: {
    1396: 350_000_000,
    1397: 375_000_000,
    1398: 400_000_000,
    1399: 430_000_000,
    1400: 465_000_000,
    1401: 495_000_000,
    1402: 540_000_000,
    1403: 585_000_000,
  },
  // کوییک (معمولی، R، S، GXR، اتوماتیک)
  quick: {
    1397: 375_000_000,
    1398: 400_000_000,
    1399: 430_000_000,
    1400: 460_000_000,
    1401: 495_000_000,
    1402: 535_000_000,
    1403: 580_000_000,
  },
  // اطلس و سهند
  atlas: {
    1402: 560_000_000,
    1403: 610_000_000,
  },
  // پژو ۴۰۵ (GLX و SLX)
  peugeot_405: {
    1382: 190_000_000,
    1385: 230_000_000,
    1388: 270_000_000,
    1390: 310_000_000,
    1393: 360_000_000,
    1395: 410_000_000,
    1397: 460_000_000,
    1398: 490_000_000,
    1399: 530_000_000,
  },
  // پژو پارس (سال، LX، TU5، ELX)
  peugeot_pars: {
    1386: 280_000_000,
    1389: 340_000_000,
    1392: 410_000_000,
    1395: 490_000_000,
    1397: 580_000_000,
    1398: 630_000_000,
    1399: 690_000_000,
    1400: 750_000_000,
    1401: 820_000_000,
    1402: 890_000_000,
  },
  // پژو ۲۰۶ (تیپ ۲، ۵ و SD صندوقدار)
  peugeot_206: {
    1384: 230_000_000,
    1386: 260_000_000,
    1388: 300_000_000,
    1390: 340_000_000,
    1393: 390_000_000,
    1396: 450_000_000,
    1398: 510_000_000,
    1399: 560_000_000,
    1400: 610_000_000,
    1401: 670_000_000,
  },
  // پژو ۲۰۷ (دنده‌ای، اتوماتیک، پانوراما، TU3)
  peugeot_207: {
    1396: 580_000_000,
    1398: 650_000_000,
    1399: 710_000_000,
    1400: 770_000_000,
    1401: 840_000_000,
    1402: 920_000_000,
    1403: 990_000_000,
  },
  // سمند و سورن (LX، EF7، سورن پلاس)
  samand: {
    1386: 240_000_000,
    1389: 290_000_000,
    1392: 345_000_000,
    1395: 410_000_000,
    1397: 480_000_000,
    1399: 560_000_000,
    1400: 620_000_000,
    1401: 690_000_000,
    1402: 770_000_000,
    1403: 840_000_000,
  },
  // دنا و دنا پلاس (معمولی، توربو، اتوماتیک)
  dena: {
    1395: 540_000_000,
    1397: 640_000_000,
    1398: 710_000_000,
    1399: 780_000_000,
    1400: 860_000_000,
    1401: 950_000_000,
    1402: 1_060_000_000,
    1403: 1_180_000_000,
  },
  // تارا (دنده‌ای و اتوماتیک V1 تا V4)
  tara: {
    1400: 750_000_000,
    1401: 830_000_000,
    1402: 930_000_000,
    1403: 1_050_000_000,
  },
  // شاهین (G و اتوماتیک)
  shahin: {
    1400: 660_000_000,
    1401: 720_000_000,
    1402: 800_000_000,
    1403: 880_000_000,
  },
  // رانا و رانا پلاس
  runna: {
    1393: 360_000_000,
    1396: 420_000_000,
    1398: 480_000_000,
    1400: 550_000_000,
    1401: 610_000_000,
    1402: 680_000_000,
    1403: 740_000_000,
  },
  // پیکان و پیکان وانت
  paykan: {
    1382: 120_000_000,
    1385: 145_000_000,
    1388: 180_000_000,
    1390: 210_000_000,
    1391: 235_000_000,
    1392: 255_000_000,
    1393: 280_000_000,
  },
  // وانت آریسان
  arisan: {
    1395: 310_000_000,
    1397: 350_000_000,
    1399: 410_000_000,
    1401: 490_000_000,
    1402: 560_000_000,
    1403: 630_000_000,
  },
  // وانت نیسان زامیاد (بنزینی و دوگانه)
  zamyad: {
    1388: 340_000_000,
    1391: 395_000_000,
    1394: 460_000_000,
    1397: 540_000_000,
    1399: 610_000_000,
    1401: 690_000_000,
    1402: 760_000_000,
    1403: 830_000_000,
  },
  // وانت مزدا (تک کابین و دوکابین)
  mazda_pickup: {
    1385: 360_000_000,
    1388: 430_000_000,
    1390: 490_000_000,
    1393: 580_000_000,
    1395: 660_000_000,
    1397: 760_000_000,
    1398: 840_000_000,
  },
  // کیا ریو مونتاژ سایپا
  rio: {
    1385: 270_000_000,
    1387: 320_000_000,
    1389: 370_000_000,
    1390: 410_000_000,
  },
  // زانتیا
  xantia: {
    1383: 310_000_000,
    1385: 370_000_000,
    1387: 440_000_000,
    1389: 530_000_000,
  },
  // دوو ماتیز و سیلو
  daewoo: {
    1380: 160_000_000,
    1381: 175_000_000,
    1382: 195_000_000,
  },
  // لیفان (520، 620، X50، X60)
  lifan: {
    1391: 370_000_000,
    1393: 440_000_000,
    1395: 530_000_000,
    1397: 640_000_000,
  },
  // ام وی ام (110، 315، 530، X22، X33)
  mvm: {
    1392: 360_000_000,
    1394: 430_000_000,
    1396: 520_000_000,
    1398: 640_000_000,
    1400: 780_000_000,
    1402: 950_000_000,
  },
  // جک (J4، J5، S3، S5)
  jac: {
    1394: 580_000_000,
    1396: 720_000_000,
    1398: 910_000_000,
    1400: 1_150_000_000,
    1402: 1_450_000_000,
  },
  // هایما (S5 و S7)
  haima: {
    1397: 950_000_000,
    1399: 1_150_000_000,
    1401: 1_380_000_000,
    1402: 1_550_000_000,
    1403: 1_720_000_000,
  },
};

function normalizeKey(make: string, model: string): string | null {
  const s = `${make} ${model}`.toLowerCase();
  if (/۱۵۱|151|وانت پراید/i.test(s)) return "pride_pickup";
  if (/پراید|pride|131|132|111|صبا|نسیم|هاچبک|هاشبک/i.test(s)) return "pride";
  if (/تیبا|tiba/i.test(s)) return "tiba";
  if (/ساینا|saina/i.test(s)) return "saina";
  if (/کوییک|کوئیک|quick|quik/i.test(s)) return "quick";
  if (/اطلس|سهند/i.test(s)) return "atlas";
  if (/۲۰۷|207/i.test(s)) return "peugeot_207";
  if (/۲۰۶|206/i.test(s)) return "peugeot_206";
  if (/پارس|pars|پرشیا/i.test(s)) return "peugeot_pars";
  if (/۴۰۵|405/i.test(s)) return "peugeot_405";
  if (/دنا|dena/i.test(s)) return "dena";
  if (/تارا|tara/i.test(s)) return "tara";
  if (/شاهین|shahin/i.test(s)) return "shahin";
  if (/رانا|runna/i.test(s)) return "runna";
  if (/سمند|سورن|samand|soren/i.test(s)) return "samand";
  if (/پیکان|paykan/i.test(s)) return "paykan";
  if (/آریسان|اریسان/i.test(s)) return "arisan";
  if (/زامیاد|نیسان وانت|وانت نیسان/i.test(s)) return "zamyad";
  if (/مزدا/i.test(s)) return "mazda_pickup";
  if (/ریو|rio/i.test(s)) return "rio";
  if (/زانتیا|xantia/i.test(s)) return "xantia";
  if (/ماتیز|سیلو|daewoo/i.test(s)) return "daewoo";
  if (/لیفان|lifan/i.test(s)) return "lifan";
  if (/ام وی ام|ام‌وی‌ام|mvm/i.test(s)) return "mvm";
  if (/جک|jac/i.test(s)) return "jac";
  if (/هایما|haima/i.test(s)) return "haima";

  return null;
}

export class BenchmarkPriceEstimationProvider implements PriceEstimationProvider {
  readonly id = "baravard_market";
  readonly isSample = false;

  async estimate(input: EstimateInput): Promise<EstimateResult> {
    const key = normalizeKey(input.make, input.model);
    const year = input.year ?? 1398;

    let basePrice: number | null = null;

    // 1) First check live daily market prices (updated daily from car.ir & admin overrides)
    try {
      const dailyPrices = await getDailyCarPrices();
      basePrice = lookupDailyPrice(dailyPrices, input.make, input.model, input.year ?? undefined);
    } catch (e) {
      console.warn("[benchmark] daily prices lookup failed, using static matrix:", e);
    }

    // 2) Fallback to comprehensive benchmark matrix if not found
    if (!basePrice) {
      if (!key || !BENCHMARK_MAP[key]) {
        return {
          ok: false,
          error: "مدل خودرو خارج از پوشش ماتریس کارشناسی روز است",
          retryable: false,
        };
      }

      const table = BENCHMARK_MAP[key];
      const years = Object.keys(table).map(Number).sort((a, b) => a - b);

      if (table[year]) {
        basePrice = table[year];
      } else if (year < years[0]) {
        const diffYears = years[0] - year;
        basePrice = Math.max(Math.round(table[years[0]] * (1 - 0.04 * diffYears)), 100_000_000);
      } else if (year > years[years.length - 1]) {
        const diffYears = year - years[years.length - 1];
        basePrice = Math.round(table[years[years.length - 1]] * (1 + 0.06 * diffYears));
      } else {
        const closest = years.reduce((prev, curr) => (Math.abs(curr - year) < Math.abs(prev - year) ? curr : prev));
        basePrice = table[closest];
      }
    }

    // Mileage adjustment (standard usage is ~20,000 km per year)
    if (input.mileage_km && input.mileage_km > 0) {
      const age = Math.max(1, 1403 - year);
      const expectedKm = age * 20_000;
      const diffKm = input.mileage_km - expectedKm;
      const ratio = Math.max(-0.06, Math.min(0.08, (diffKm / 10_000) * 0.007));
      basePrice = Math.round(basePrice * (1 - ratio));
    }

    return {
      ok: true,
      priceToman: Math.round(basePrice),
      confidence: 0.92,
      responseId: `bench-${Date.now()}`,
      raw: { benchmark_key: key, year, basePrice },
    };
  }
}
