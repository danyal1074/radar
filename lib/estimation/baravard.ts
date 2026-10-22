import type { EstimateInput, EstimateResult, PriceEstimationProvider } from "./provider";
import { getDailyCarPrices } from "../daily-prices/service";
import { lookupDailyPrice } from "../daily-prices/lookup";
import { fetchLiveDivarClusterEstimate } from "../daily-prices/divar-market";
import { BenchmarkPriceEstimationProvider } from "./benchmark";

/**
 * Baravard & Divar Market Price Estimation Provider:
 * طبق دستور صریح کاربر:
 * ۱. استفاده از روش اول (تحلیل خوشه‌ای آگهی‌های زنده دیوار) به عنوان یکی از منابع اصلی در کنار برآورد
 * ۲. تشخیص هوشمند منبع معیوب: رد هر منبعی که قیمت غیرواقعی یا خیلی پایین داشته باشد
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
    let divarMarketPrice: number | null = null;
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

    // ۲. استعلام از «روش اول»: تحلیل خوشه‌ای آگهی‌های زنده هم‌مدل دیوار (Divar Cluster Median)
    try {
      const divarMarket = await fetchLiveDivarClusterEstimate({
        make: input.make,
        model: input.model,
        title: input.title,
        year: input.year,
      });

      if (divarMarket && divarMarket.sampleCount >= 2 && divarMarket.medianToman > 0) {
        divarMarketPrice = divarMarket.medianToman;
      }
    } catch {
      // Continue
    }

    // ۳. استعلام از ماتریس ثانویه سامانه برای اعتبارسنجی
    try {
      const fbRes = await this.fallback.estimate(input);
      if (fbRes.ok && fbRes.priceToman && fbRes.priceToman > 0) {
        fallbackMatrixPrice = fbRes.priceToman;
      }
    } catch {
      // ignore
    }

    // ۴. مقایسه و تشخیص هوشمند منبع مشکل‌دار بر اساس دستور کاربر:
    const validSources: { price: number; name: string }[] = [];
    if (baravardSystemPrice && baravardSystemPrice > 0) validSources.push({ price: baravardSystemPrice, name: "برآورد رسمی" });
    if (divarMarketPrice && divarMarketPrice > 0) validSources.push({ price: divarMarketPrice, name: "روش اول (دیوار)" });
    if (fallbackMatrixPrice && fallbackMatrixPrice > 0) validSources.push({ price: fallbackMatrixPrice, name: "ماتریس سامانه" });

    if (validSources.length >= 2) {
      const maxPrice = Math.max(...validSources.map((s) => s.price));
      // فیلتر کردن منبع معیوب: هر منبعی که بیش از ۳۰٪ کمتر از سقف قیمت بازار باشد منسوخ تشخیص داده شده و رد می‌شود
      const nonFaultySources = validSources.filter((s) => s.price >= maxPrice * 0.70);

      if (nonFaultySources.length > 0) {
        const sum = nonFaultySources.reduce((acc, curr) => acc + curr.price, 0);
        basePrice = Math.round(sum / nonFaultySources.length);
        estimationSource = nonFaultySources.map((s) => s.name).join(" + ");
      } else {
        basePrice = maxPrice;
        estimationSource = "برآورد رسمی (رد منبع پایین)";
      }
    } else if (validSources.length === 1) {
      basePrice = validSources[0].price;
      estimationSource = validSources[0].name;
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
