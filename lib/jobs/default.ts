import "server-only";
import { estimationConfig, getServiceStore } from "../db";
import { env } from "../env";
import { BenchmarkPriceEstimationProvider } from "../estimation/benchmark";
import { BaravardPriceEstimationProvider } from "../estimation/baravard";
import type { PriceEstimationProvider } from "../estimation/provider";
import { DivarListingSourceProvider } from "../sources/divar";
import { SheypoorListingSourceProvider } from "../sources/sheypoor";
import type { ListingSourceProvider } from "../sources/provider";
import { runPipeline } from "./pipeline";

export function activeSources(): ListingSourceProvider[] {
  // پایش لحظه‌ای و همزمان دیوار و شیپور در شهرهای مهم خراسان رضوی
  return [
    new DivarListingSourceProvider("mashhad"),
    new DivarListingSourceProvider("torbat-heydariyeh"),
    new DivarListingSourceProvider("neyshabur"),
    new DivarListingSourceProvider("sabzevar"),
    new SheypoorListingSourceProvider("mashhad"),
    new SheypoorListingSourceProvider("torbat-heydariyeh"),
  ];
}

export function activeEstimator(): PriceEstimationProvider {
  // Always use official live Baravard data as the primary appraisal baseline
  return new BaravardPriceEstimationProvider();
}

export async function runDefaultPipeline() {
  return runPipeline(await getServiceStore(), {
    sources: activeSources(),
    estimator: activeEstimator(),
    estimationConfig: estimationConfig(),
  });
}
