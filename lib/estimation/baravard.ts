import type { EstimateInput, EstimateResult, PriceEstimationProvider } from "./provider";
import { getDailyCarPrices } from "../daily-prices/service";
import { lookupDailyPrice } from "../daily-prices/lookup";
import { fetchLiveDivarClusterEstimate } from "../daily-prices/divar-market";
import { BenchmarkPriceEstimationProvider } from "./benchmark";

/**
 * Baravard & Divar Market Price Estimation Provider:
 * Uses live Divar market clusters + Baravard price database
 * with mileage adjustment and fallback to benchmark matrix.
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

    // ۱. بررسی میانگین قیمت‌های واقعی موجود در دیوار برای این مدل و سال
    try {
      const divarMarket = await fetchLiveDivarClusterEstimate({
        make: input.make,
        model: input.model,
        title: input.title,
        year: input.year,
      });

      if (divarMarket && divarMarket.sampleCount >= 2 && divarMarket.medianToman > 0) {
        basePrice = divarMarket.medianToman;
        estimationSource = `divar_market (${divarMarket.sampleCount} آگهی هم‌مدل دیوار)`;
      }
    } catch {
      // Continue to daily benchmark prices
    }

    // ۲. استعلام از پایگاه قیمت‌های روز خودرو (Baravard & Seed Benchmarks)
    try {
      const dailyPrices = await getDailyCarPrices();
      const benchmarkPrice = lookupDailyPrice(
        dailyPrices,
        input.make,
        `${input.model} ${input.trim ?? ""}`.trim(),
        input.year ?? undefined,
        input.title ?? undefined,
        input.body_status ?? undefined,
        input.chassis_status ?? undefined,
      );

      if (benchmarkPrice && benchmarkPrice > 0) {
        if (basePrice && basePrice > 0) {
          // ترکیب متوازن میانگین بازار دیوار و نرخ روز رسمی
          basePrice = Math.round(basePrice * 0.65 + benchmarkPrice * 0.35);
          estimationSource = "ترکیب دیوار و برآورد بازار";
        } else {
          basePrice = benchmarkPrice;
        }
      }
    } catch (err) {
      console.warn("[baravard-estimator] Failed querying daily prices:", err);
    }

    if (!basePrice || basePrice <= 0) {
      // Fallback to benchmark provider if not directly matched
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
