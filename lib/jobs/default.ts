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
  // اگر یک شهر خاص توسط کاربر انتخاب شده باشد، همان شهر بلافاصله در اولویت اول پایش می‌شود
  if (targetCity && targetCity !== "کل استان") {
    const cityObj = getCityByNameFa(targetCity) || getCityBySlug(targetCity);
    const slug = cityObj?.slug || targetCity;
    return [
      new DivarListingSourceProvider(slug),
      new DivarListingSourceProvider("mashhad"),
      new DivarListingSourceProvider("torbat-heydariyeh"),
    ];
  }

  // برای پایش مداوم پس‌زمینه (هر ۶۰ ثانیه):
  // مشهد و تربت‌حیدریه همیشه به همراه یک دسته چرخشی ۶تایی از سایر شهرهای استان خراسان رضوی در هر دقیقه
  // این روش هوشمندانه از مسدود شدن آی‌پی توسط دیوار (خطای 429) جلوگیری کرده و همه ۲۵ شهر را مدام تازه نگه می‌دارد
  const nowMinute = Math.floor(Date.now() / 60000);
  const otherCities = KHORASAN_RAZAVI_CITIES.filter(
    (c) => c.slug !== "mashhad" && c.slug !== "torbat-heydariyeh",
  );
  const CHUNK_SIZE = 6;
  const chunkIndex = nowMinute % Math.ceil(otherCities.length / CHUNK_SIZE);
  const rotatingCohort = otherCities.slice(
    chunkIndex * CHUNK_SIZE,
    (chunkIndex + 1) * CHUNK_SIZE,
  );

  return [
    new DivarListingSourceProvider("mashhad"),
    new DivarListingSourceProvider("torbat-heydariyeh"),
    ...rotatingCohort.map((c) => new DivarListingSourceProvider(c.slug)),
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
