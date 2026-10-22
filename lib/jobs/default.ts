import "server-only";
import { KHORASAN_RAZAVI_CITIES } from "../cities";
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
  // پایش لحظه‌ای و همزمان دیوار در تمامی ۲۵ شهر استان خراسان رضوی + شیپور در شهرهای فعال
  const divarSources = KHORASAN_RAZAVI_CITIES.map(
    (c) => new DivarListingSourceProvider(c.slug),
  );
  return [
    ...divarSources,
    new SheypoorListingSourceProvider("mashhad"),
    new SheypoorListingSourceProvider("torbat-heydariyeh"),
    new SheypoorListingSourceProvider("neyshabur"),
    new SheypoorListingSourceProvider("sabzevar"),
    new SheypoorListingSourceProvider("kashmar"),
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
