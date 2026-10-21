import type { EstimateInput, EstimateResult, PriceEstimationProvider } from "./provider";
import { getDailyCarPrices } from "../daily-prices/service";
import { lookupDailyPrice } from "../daily-prices/lookup";
import { BenchmarkPriceEstimationProvider } from "./benchmark";

/**
 * Baravard Price Estimation Provider:
 * Uses the live database of 3,900+ cars extracted directly from baravard.com
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

    try {
      const dailyPrices = await getDailyCarPrices();
      basePrice = lookupDailyPrice(
        dailyPrices,
        input.make,
        `${input.model} ${input.trim ?? ""}`.trim(),
        input.year ?? undefined,
        input.title ?? undefined,
      );
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
        source: "baravard.com",
        make: input.make,
        model: input.model,
        year,
        mileage: input.mileage_km,
      },
    };
  }
}
