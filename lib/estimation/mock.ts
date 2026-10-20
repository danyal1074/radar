import { normalizeFa } from "../text";
import type { EstimateInput, EstimateResult, PriceEstimationProvider } from "./provider";

/**
 * DEMO ONLY. These numbers are NOT market prices; they exist so the app can be
 * explored and tested without a paid pricing API. Every estimate produced here
 * is stored with is_sample=true and shown in the UI as «قیمت نمونه».
 */
const BASE_1400: { match: string; base: number }[] = [
  { match: "پراید131", base: 395_000_000 },
  { match: "پراید", base: 380_000_000 },
  { match: "206تیپ2", base: 790_000_000 },
  { match: "206", base: 780_000_000 },
  { match: "سمند", base: 700_000_000 },
  { match: "تیبا", base: 420_000_000 },
  { match: "دنا", base: 1_050_000_000 },
  { match: "پژو405", base: 560_000_000 },
];

export class MockPriceEstimationProvider implements PriceEstimationProvider {
  readonly id = "mock";
  readonly isSample = true;

  constructor(private readonly opts: { failForModels?: string[] } = {}) {}

  async estimate(input: EstimateInput): Promise<EstimateResult> {
    const key = normalizeFa(`${input.make}${input.model}${input.trim ?? ""}`);

    if (this.opts.failForModels?.some((m) => key.includes(normalizeFa(m)))) {
      return { ok: false, error: "سرویس نمونه برای این مدل پاسخ نداد", retryable: true };
    }

    const row = BASE_1400.find((r) => key.includes(r.match));
    if (!row) {
      // Not enough data: say so instead of inventing a number.
      return { ok: false, error: "برای این مدل در داده نمونه تخمینی وجود ندارد", retryable: false };
    }

    const yearDelta = input.year === null ? 0 : input.year - 1400;
    const yearFactor = 1 + yearDelta * 0.05;
    const mileage = input.mileage_km ?? 100_000;
    const mileageFactor = 1 - Math.min(0.25, Math.max(-0.1, (mileage - 100_000) / 100_000 * 0.06));
    const price = Math.round((row.base * yearFactor * mileageFactor) / 1_000_000) * 1_000_000;

    return {
      ok: true,
      priceToman: price,
      confidence: null, // the mock has no real confidence to report
      responseId: null,
      raw: { sample: true, model_key: key },
    };
  }
}
