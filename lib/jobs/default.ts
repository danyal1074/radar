import "server-only";
import { KHORASAN_RAZAVI_CITIES, getCityByNameFa, getCityBySlug } from "../cities";
import { estimationConfig, getServiceStore } from "../db";
import { env } from "../env";
import { BenchmarkPriceEstimationProvider } from "../estimation/benchmark";
import { BaravardPriceEstimationProvider } from "../estimation/baravard";
import type { PriceEstimationProvider } from "../estimation/provider";
import { DivarListingSourceProvider } from "../sources/divar";
import { SheypoorListingSourceProvider } from "../sources/sheypoor";
import type { ListingSourceProvider } from "../sources/provider";
import { runPipeline } from "./pipeline";

export function activeSources(targetCity?: string): ListingSourceProvider[] {
  // طبق دستور کاربر: به صورت موقت فقط شهرهای تربت‌حیدریه و مشهد فعال هستند
  if (targetCity) {
    const cityObj = getCityByNameFa(targetCity) || getCityBySlug(targetCity);
    const slug = cityObj?.slug || (targetCity.includes("تربت") ? "torbat-heydariyeh" : "mashhad");
    return [
      new DivarListingSourceProvider(slug),
      new SheypoorListingSourceProvider(slug),
    ];
  }

  return [
    new DivarListingSourceProvider("mashhad"),
    new DivarListingSourceProvider("torbat-heydariyeh"),
    new SheypoorListingSourceProvider("mashhad"),
    new SheypoorListingSourceProvider("torbat-heydariyeh"),
  ];
}

export function activeEstimator(): PriceEstimationProvider {
  // Always use official live Baravard data as the primary appraisal baseline
  return new BaravardPriceEstimationProvider();
}

export async function runDefaultPipeline(targetCity?: string) {
  return runPipeline(await getServiceStore(), {
    sources: activeSources(targetCity),
    estimator: activeEstimator(),
    estimationConfig: estimationConfig(),
  });
}
