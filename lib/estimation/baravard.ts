import type { EstimateInput, EstimateResult, PriceEstimationProvider } from "./provider";
import { getDailyCarPrices } from "../daily-prices/service";
import { lookupDailyPrice } from "../daily-prices/lookup";
import { BenchmarkPriceEstimationProvider } from "./benchmark";

/**
 * Baravard & Internal System Price Estimation Provider:
 * طبق دستور صریح کاربر: منابع قیمت فقط برآورد رسمی (baravard.com) و لیست داخل سامانه هستند.
 * در صورت اختلاف قیمت فاحش بین دو منبع، منبعی که قیمت خیلی پایینی دارد به عنوان نرخ منسوخ/معیوب
 * تشخیص داده شده و رد می‌شود تا نرخ واقعی روز اعمال گردد.
 */
export class BaravardPriceEstimationProvider implements PriceEstimationProvider {
  readonly id = "baravard";
  readonly isSample = false;
  private readonly fallback = new BenchmarkPriceEstimationProvider();

  constructor(private readonly apiKey?: string) {
    void this.apiKey;
  }

  async estimate(input: EstimateInput): Promise<EstimateResult> {
    const year = input.year ?? 1398;
    let basePrice: number | null = null;
    let estimationSource = "baravard.com";

    let baravardSystemPrice: number | null = null;
    let fallbackMatrixPrice: number | null = null;

    // ۱. استعلام از پایگاه مرجع قیمت‌های برآورد رسمی و سامانه
    try {
      const dailyPrices = await getDailyCarPrices();
      baravardSystemPrice = lookupDailyPrice(
        dailyPrices,
        input.make,
        `${input.model} ${input.trim ?? ""}`.trim(),
        input.year ?? undefined,
        input.title ?? undefined,
        input.body_status ?? undefined,
        input.chassis_status ?? undefined,
      );
    } catch (err) {
      console.warn("[baravard-estimator] Failed querying daily prices:", err);
    }

    // ۲. استعلام از ماتریس ثانویه سامانه برای اعتبارسنجی
    try {
      const fbRes = await this.fallback.estimate(input);
      if (fbRes.ok && fbRes.priceToman && fbRes.priceToman > 0) {
        fallbackMatrixPrice = fbRes.priceToman;
      }
    } catch {
      // ignore
    }

    // ۳. مقایسه و تشخیص هوشمند منبع مشکل‌دار بر اساس دستور کاربر:
    // «وقتی هم که اختلاف قیمت دوتا منبع خیلی زیاده بدون اون منبعی که خیلی قیمتش پایین مشکل داره اینو تشخیص بده»
    if (baravardSystemPrice && fallbackMatrixPrice) {
      const maxPrice = Math.max(baravardSystemPrice, fallbackMatrixPrice);
      const minPrice = Math.min(baravardSystemPrice, fallbackMatrixPrice);

      if (minPrice < maxPrice * 0.70) {
        // اختلاف فاحش بیش از ۳۰٪: منبع با قیمت بسیار پایین منسوخ و معیوب تشخیص داده شده و کنار گذاشته می‌شود
        basePrice = maxPrice;
        estimationSource = baravardSystemPrice === maxPrice ? "برآورد رسمی (رد نرخ پایین)" : "ماتریس سامانه (رد نرخ پایین)";
      } else {
        // قیمت‌ها در یک دامنه معقول و معتبر قرار دارند: میانگین موزون با اولویت برآورد
        basePrice = Math.round(baravardSystemPrice * 0.75 + fallbackMatrixPrice * 0.25);
        estimationSource = "تلفیق برآورد و سامانه";
      }
    } else if (baravardSystemPrice && baravardSystemPrice > 0) {
      basePrice = baravardSystemPrice;
      estimationSource = "baravard.com";
    } else if (fallbackMatrixPrice && fallbackMatrixPrice > 0) {
      basePrice = fallbackMatrixPrice;
      estimationSource = "ماتریس داخلی سامانه";
    }

    if (!basePrice || basePrice <= 0) {
      return this.fallback.estimate(input);
    }

    // Apply mileage adjustment (standard 20,000 km per year)
    if (input.mileage_km && input.mileage_km > 0) {
      const age = Math.max(1, 1404 - year);
      const expectedKm = age * 20_000;
      const diffKm = input.mileage_km - expectedKm;
      const ratio = Math.max(-0.06, Math.min(0.08, (diffKm / 10_000) * 0.007));
      basePrice = Math.round(basePrice * (1 - ratio));
    }

    return {
      ok: true,
      priceToman: Math.round(basePrice),
      confidence: 0.95,
      responseId: `baravard-${Date.now()}`,
      raw: {
        source: estimationSource,
        make: input.make,
        model: input.model,
        year,
        mileage: input.mileage_km,
      },
    };
  }
}
