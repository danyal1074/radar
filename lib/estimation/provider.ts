import type { Listing } from "../types";

/** The pricing-relevant attributes of a listing. */
export interface EstimateInput {
  make: string;
  model: string;
  trim: string | null;
  year: number | null;
  mileage_km: number | null;
  city: string | null;
  color: string | null;
  title?: string | null;
  description?: string | null;
  body_status?: string | null;
  chassis_status?: string | null;
}

export type EstimateResult =
  | {
      ok: true;
      priceToman: number;
      /** 0..1, only when the provider really returns one */
      confidence: number | null;
      /** provider response id / version, if any */
      responseId: string | null;
      raw: Record<string, unknown>;
    }
  | { ok: false; error: string; retryable: boolean };

export interface PriceEstimationProvider {
  readonly id: string;
  /** true => results are demo data and must be labelled «قیمت نمونه» */
  readonly isSample: boolean;
  estimate(input: EstimateInput): Promise<EstimateResult>;
}

export function toEstimateInput(l: Listing): EstimateInput {
  let body_status: string | null = null;
  let chassis_status: string | null = null;

  if (l.description) {
    const bMatch = l.description.match(/بدنه:\s*([^|\n]+)/);
    if (bMatch) body_status = bMatch[1].trim();
    const cMatch = l.description.match(/شاسی:\s*([^|\n]+)/);
    if (cMatch) chassis_status = cMatch[1].trim();
  }

  return {
    make: l.make,
    model: l.model,
    trim: l.trim,
    year: l.year,
    mileage_km: l.mileage_km,
    city: l.city,
    color: l.color,
    title: l.title,
    description: l.description,
    body_status,
    chassis_status,
  };
}

/** Stable signature of identical pricing inputs (used for de-duplicating paid requests). */
export function estimateSignature(provider: string, i: EstimateInput): string {
  return [
    provider,
    i.make.trim(),
    i.model.trim(),
    (i.trim ?? "").trim(),
    i.year ?? "",
    i.mileage_km ?? "",
    (i.city ?? "").trim(),
  ].join("|");
}
