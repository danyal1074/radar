import type { ListingImportItem } from "../validation";
import type { FetchResult, ListingSourceProvider } from "./provider";

/**
 * Demo data. Everything here is fictional: ids are prefixed "sample-", there are
 * no source_url values (so the "open original ad" button is disabled), and the
 * UI badges every row as «داده نمونه».
 */
const base = (
  n: number,
  p: Omit<ListingImportItem, "source" | "source_post_id" | "source_url" | "image_url" | "published_at" | "description">,
  hoursAgo: number,
  now: Date,
): ListingImportItem => ({
  source: "sample",
  source_post_id: `sample-${n}`,
  source_url: null,
  image_url: null,
  description: "آگهی نمونه برای نمایش امکانات سامانه. این آگهی واقعی نیست.",
  published_at: new Date(now.getTime() - hoursAgo * 3_600_000).toISOString(),
  ...p,
});

export function sampleListings(now: Date = new Date()): ListingImportItem[] {
  return [
    base(1, { title: "پراید ۱۳۱ SE مدل ۱۳۹۹ - سفید", make: "پراید", model: "۱۳۱", trim: "SE", year: 1399, mileage_km: 92_000, color: "سفید", city: "تربت حیدریه", price_toman: 330_000_000 }, 3, now),
    base(2, { title: "پراید ۱۳۱ مدل ۱۳۹۹ - نقره‌ای", make: "پراید", model: "۱۳۱", trim: "SE", year: 1399, mileage_km: 110_000, color: "نقره‌ای", city: "تربت حیدریه", price_toman: 385_000_000 }, 5, now),
    base(3, { title: "پراید ۱۳۱ مدل ۱۴۰۰ - سفید", make: "پراید", model: "۱۳۱", trim: "SE", year: 1400, mileage_km: 60_000, color: "سفید", city: "مشهد", price_toman: 372_000_000 }, 8, now),
    base(4, { title: "پراید ۱۳۱ مدل ۱۴۰۰ - مشکی", make: "پراید", model: "۱۳۱", trim: "EX", year: 1400, mileage_km: 48_000, color: "مشکی", city: "تربت حیدریه", price_toman: 410_000_000 }, 12, now),
    base(5, { title: "پژو ۲۰۶ تیپ ۲ مدل ۱۴۰۰ - سفید", make: "پژو", model: "۲۰۶", trim: "تیپ ۲", year: 1400, mileage_km: 70_000, color: "سفید", city: "تربت حیدریه", price_toman: 640_000_000 }, 2, now),
    base(6, { title: "پژو ۲۰۶ تیپ ۲ مدل ۱۳۹۹", make: "پژو", model: "۲۰۶", trim: "تیپ ۲", year: 1399, mileage_km: 105_000, color: "خاکستری", city: "مشهد", price_toman: 735_000_000 }, 20, now),
    base(7, { title: "سمند LX مدل ۱۳۹۸ - نقره‌ای", make: "سمند", model: "LX", trim: null, year: 1398, mileage_km: 130_000, color: "نقره‌ای", city: "تربت حیدریه", price_toman: 520_000_000 }, 6, now),
    base(8, { title: "سمند LX مدل ۱۴۰۱", make: "سمند", model: "LX", trim: null, year: 1401, mileage_km: 35_000, color: "سفید", city: "نیشابور", price_toman: 820_000_000 }, 30, now),
    base(9, { title: "تیبا ۲ مدل ۱۴۰۰", make: "تیبا", model: "۲", trim: null, year: 1400, mileage_km: 55_000, color: "سفید", city: "تربت حیدریه", price_toman: 365_000_000 }, 9, now),
    base(10, { title: "ماشین نامشخص (بدون داده کافی)", make: "نامشخص", model: "-", trim: null, year: null, mileage_km: null, color: null, city: "تربت حیدریه", price_toman: 300_000_000 }, 40, now),
  ];
}

export class MockListingSourceProvider implements ListingSourceProvider {
  readonly id = "mock";
  readonly displayName = "داده نمونه";
  async fetchLatest(): Promise<FetchResult> {
    return { items: sampleListings(), isSample: true };
  }
}
