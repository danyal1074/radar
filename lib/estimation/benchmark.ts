import type { EstimateInput, EstimateResult, PriceEstimationProvider } from "./provider";
import { getDailyCarPrices, lookupDailyPrice } from "../daily-prices/service";

/**
 * ماتریس جامع قیمت کارشناسی روز خودروهای بازار ایران (بر حسب تومان)
 * بر اساس آخرین داده‌های میدانی و کارشناسی بازار خودرو پاییز ۱۴۰۴ / بهار ۱۴۰۵
 */
const BENCHMARK_MAP: Record<string, Record<number, number>> = {
  // پراید سواری (صبا، ۱۳۱، ۱۳۲، ۱۱۱، نسیم، هاچبک)
  pride: {
    1380: 380_000_000,
    1382: 410_000_000,
    1384: 440_000_000,
    1385: 470_000_000,
    1387: 520_000_000,
    1388: 550_000_000,
    1389: 580_000_000,
    1390: 620_000_000,
    1392: 670_000_000,
    1394: 730_000_000,
    1396: 790_000_000,
    1397: 830_000_000,
    1398: 860_000_000,
    1399: 890_000_000,
  },
  // پراید وانت ۱۵۱
  pride_pickup: {
    1393: 650_000_000,
    1395: 750_000_000,
    1397: 880_000_000,
    1399: 1_020_000_000,
    1401: 1_180_000_000,
    1402: 1_240_000_000,
    1403: 1_280_000_000,
  },
  // تیبا ۱ و تیبا ۲
  tiba: {
    1393: 720_000_000,
    1395: 820_000_000,
    1397: 920_000_000,
    1398: 980_000_000,
    1399: 1_050_000_000,
    1400: 1_120_000_000,
    1401: 1_210_000_000,
  },
  // ساینا (معمولی، S، DA، اتوماتیک)
  saina: {
    1396: 880_000_000,
    1397: 950_000_000,
    1398: 1_020_000_000,
    1399: 1_120_000_000,
    1400: 1_250_000_000,
    1401: 1_400_000_000,
    1402: 1_580_000_000,
    1403: 1_720_000_000,
  },
  // کوییک (معمولی، R، S، GXR، اتوماتیک)
  quick: {
    1397: 1_050_000_000,
    1398: 1_140_000_000,
    1399: 1_235_000_000,
    1400: 1_290_000_000,
    1401: 1_345_000_000,
    1402: 1_400_000_000,
    1403: 1_550_000_000,
  },
  // اطلس و سهند
  atlas: {
    1402: 1_650_000_000,
    1403: 1_850_000_000,
  },
  // پژو ۴۰۵ (GLX و SLX)
  peugeot_405: {
    1382: 520_000_000,
    1385: 620_000_000,
    1388: 740_000_000,
    1390: 840_000_000,
    1393: 980_000_000,
    1395: 1_120_000_000,
    1397: 1_220_000_000,
    1398: 1_310_000_000,
    1399: 1_420_000_000,
  },
  // پژو پارس (سال، LX، TU5، ELX)
  peugeot_pars: {
    1386: 780_000_000,
    1389: 920_000_000,
    1392: 1_120_000_000,
    1395: 1_380_000_000,
    1397: 1_620_000_000,
    1398: 1_780_000_000,
    1399: 1_950_000_000,
    1400: 2_150_000_000,
    1401: 2_350_000_000,
    1402: 2_580_000_000,
  },
  // پژو ۲۰۶ (تیپ ۲، ۵ و SD صندوقدار)
  peugeot_206: {
    1384: 620_000_000,
    1386: 720_000_000,
    1388: 840_000_000,
    1390: 960_000_000,
    1393: 1_120_000_000,
    1396: 1_320_000_000,
    1398: 1_480_000_000,
    1399: 1_620_000_000,
    1400: 1_750_000_000,
    1401: 1_890_000_000,
  },
  // پژو ۲۰۷ (دنده‌ای، اتوماتیک، پانوراما، TU3)
  peugeot_207: {
    1396: 1_750_000_000,
    1398: 1_950_000_000,
    1399: 2_150_000_000,
    1400: 2_380_000_000,
    1401: 2_650_000_000,
    1402: 2_920_000_000,
    1403: 3_200_000_000,
  },
  // سمند و سورن (LX، EF7، سورن پلاس)
  samand: {
    1386: 650_000_000,
    1389: 820_000_000,
    1392: 1_020_000_000,
    1395: 1_220_000_000,
    1397: 1_420_000_000,
    1399: 1_650_000_000,
    1400: 1_820_000_000,
    1401: 2_050_000_000,
    1402: 2_280_000_000,
    1403: 2_490_000_000,
  },
  // دنا و دنا پلاس (معمولی، توربو، اتوماتیک)
  dena: {
    1395: 1_550_000_000,
    1397: 1_850_000_000,
    1398: 2_050_000_000,
    1399: 2_250_000_000,
    1400: 2_500_000_000,
    1401: 2_800_000_000,
    1402: 3_150_000_000,
    1403: 3_500_000_000,
  },
  // تارا (دنده‌ای و اتوماتیک V1 تا V4)
  tara: {
    1400: 2_180_000_000,
    1401: 2_350_000_000,
    1402: 2_580_000_000,
    1403: 2_780_000_000,
    1404: 2_950_000_000,
  },
  // شاهین (G و اتوماتیک)
  shahin: {
    1400: 1_850_000_000,
    1401: 2_150_000_000,
    1402: 2_450_000_000,
    1403: 2_750_000_000,
  },
  // رانا و رانا پلاس
  runna: {
    1393: 1_150_000_000,
    1396: 1_350_000_000,
    1398: 1_550_000_000,
    1400: 1_800_000_000,
    1401: 1_980_000_000,
    1402: 2_150_000_000,
    1403: 2_350_000_000,
  },
  // پیکان و پیکان وانت
  paykan: {
    1382: 280_000_000,
    1385: 340_000_000,
    1388: 420_000_000,
    1390: 480_000_000,
    1391: 520_000_000,
    1392: 560_000_000,
    1393: 620_000_000,
  },
  // وانت آریسان
  arisan: {
    1395: 780_000_000,
    1397: 920_000_000,
    1399: 1_120_000_000,
    1401: 1_350_000_000,
    1402: 1_520_000_000,
    1403: 1_680_000_000,
  },
  // وانت نیسان زامیاد (بنزینی و دوگانه)
  zamyad: {
    1388: 720_000_000,
    1391: 850_000_000,
    1394: 1_020_000_000,
    1397: 1_280_000_000,
    1399: 1_450_000_000,
    1401: 1_750_000_000,
    1402: 1_920_000_000,
    1403: 2_080_000_000,
  },
  // وانت مزدا (تک کابین و دوکابین)
  mazda_pickup: {
    1385: 780_000_000,
    1388: 950_000_000,
    1390: 1_120_000_000,
    1393: 1_380_000_000,
    1395: 1_580_000_000,
    1397: 1_780_000_000,
    1398: 1_950_000_000,
  },
  // کیا ریو مونتاژ سایپا
  rio: {
    1385: 580_000_000,
    1387: 680_000_000,
    1389: 780_000_000,
    1390: 860_000_000,
  },
  // زانتیا
  xantia: {
    1383: 650_000_000,
    1385: 780_000_000,
    1387: 920_000_000,
    1389: 1_120_000_000,
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
  // دانگ فنگ H30 کراس
  h30: {
    1395: 580_000_000,
    1396: 630_000_000,
    1397: 680_000_000,
    1398: 740_000_000,
  },
  // نیسان ماکسیما
  maxima: {
    1382: 760_000_000,
    1385: 920_000_000,
    1387: 1_120_000_000,
    1389: 1_280_000_000,
    1390: 1_450_000_000,
  },
  // سوزوکی گرند ویتارا
  vitara: {
    1389: 1_200_000_000,
    1391: 1_450_000_000,
    1394: 1_780_000_000,
    1397: 2_350_000_000,
  },
  // رنو مگان
  megan: {
    1388: 640_000_000,
    1390: 780_000_000,
    1392: 920_000_000,
  },
  // چانگان CS35
  changan: {
    1396: 760_000_000,
    1397: 820_000_000,
    1398: 890_000_000,
  },
  // کیا سراتو
  cerato: {
    1394: 1_380_000_000,
    1396: 1_650_000_000,
    1397: 1_850_000_000,
    1398: 2_050_000_000,
  },
  // چری و فونیکس (تیگو و آریزو)
  chery: {
    1396: 720_000_000,
    1398: 910_000_000,
    1400: 1_150_000_000,
    1402: 1_480_000_000,
  },
  // دیگنیتی و فیدلیتی
  dignity: {
    1400: 1_420_000_000,
    1401: 1_580_000_000,
    1402: 1_780_000_000,
    1403: 1_950_000_000,
  },
  // برلیانس (H330, H320, Cross)
  brilliance: {
    1396: 590_000_000,
    1397: 660_000_000,
    1398: 720_000_000,
    1399: 780_000_000,
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
  if (/جک|jac|kmc/i.test(s)) return "jac";
  if (/هایما|haima/i.test(s)) return "haima";
  if (/h30|اچ\s*سی/i.test(s)) return "h30";
  if (/ماکسیما|maxima/i.test(s)) return "maxima";
  if (/ویتارا|vitara/i.test(s)) return "vitara";
  if (/مگان|megane/i.test(s)) return "megan";
  if (/چانگان|cs35/i.test(s)) return "changan";
  if (/سراتو|cerato/i.test(s)) return "cerato";
  if (/دیگنیتی|فیدلیتی|dignity|fidelity/i.test(s)) return "dignity";
  if (/تیگو|آریزو|chery|tiggo|arrizo/i.test(s)) return "chery";
  if (/برلیانس|brilliance/i.test(s)) return "brilliance";

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
