"use client";

import { BellPlus, RotateCcw, Search, Sparkles, Wrench } from "lucide-react";
import Link from "next/link";
import { KHORASAN_RAZAVI_CITIES, POPULAR_CITIES } from "@/lib/cities";
import type { ListingFilters, SortKey } from "@/lib/validation";
import { Button, Input } from "./ui";

const POPULAR_MAKES = [
  "پژو", "پراید", "سمند", "ساینا", "کوییک", "تیبا", "دنا", "تارا", "شاهین", "رانا",
  "هایما", "جک", "ام‌وی‌ام", "چری", "فونیکس", "لاماری", "پیکان", "مزدا", "نیسان", "زامیاد", "ریو", "زانتیا"
];

export function FilterBar({
  filters,
  sort,
  canScoreSort,
  action = "/listings",
  allowedCitiesCount = 1,
  userCity = "تربت‌حیدریه",
}: {
  filters: ListingFilters;
  sort: SortKey;
  canScoreSort: boolean;
  action?: string;
  facets?: unknown;
  allowedCitiesCount?: number;
  userCity?: string;
}) {
  const hasFilter = Boolean(filters.q || filters.make || filters.priceMin || filters.priceMax || filters.onlyOpportunities || filters.city);

  const formatMillion = (val?: number) => {
    if (!val) return "";
    return val >= 1_000_000 ? String(Math.round(val / 1_000_000)) : String(val);
  };

  // Build query string for saving as alert
  const alertParams = new URLSearchParams();
  if (filters.q || filters.make) alertParams.set("make", filters.make || filters.q || "");
  if (filters.priceMin) alertParams.set("priceMin", formatMillion(filters.priceMin));
  if (filters.priceMax) alertParams.set("priceMax", formatMillion(filters.priceMax));

  return (
    <form action={action} method="get" className="mb-5 rounded-2xl border border-line bg-surface p-4 shadow-sm">
      <datalist id="filter-popular-cars">
        {POPULAR_MAKES.map((m) => (
          <option key={m} value={m} />
        ))}
      </datalist>

      {/* انتخاب یا نمایش وضعیت شهر (فعلاً به صورت آزمایشی فقط تربت حیدریه و مشهد) */}
      <div className="mb-3.5 pb-3 border-b border-line/60">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-line bg-paper/60 p-1 text-xs font-semibold">
            <span className="text-muted px-1.5">🏙️ شهر تحت رصد:</span>
            <button
              type="submit"
              name="city"
              value=""
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${!filters.city ? "bg-brand-600 text-white shadow-sm" : "text-muted hover:text-ink"}`}
            >
              هر دو شهر (مشهد + تربت‌حیدریه)
            </button>
            <button
              type="submit"
              name="city"
              value="تربت حیدریه"
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${filters.city === "تربت حیدریه" || filters.city === "تربت‌حیدریه" ? "bg-brand-600 text-white shadow-sm" : "text-muted hover:text-ink"}`}
            >
              تربت حیدریه
            </button>
            <button
              type="submit"
              name="city"
              value="مشهد"
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${filters.city === "مشهد" ? "bg-brand-600 text-white shadow-sm" : "text-muted hover:text-ink"}`}
            >
              مشهد
            </button>
          </div>
          <span className="text-[11px] font-bold text-brand-600 bg-brand-50 px-2.5 py-1 rounded-lg border border-brand-200">
            ✓ نسخه آزمایشی: پایش و باگ‌گیری در تربت حیدریه و مشهد
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-12 items-center">
        {/* جستجوی خودرو */}
        <div className="sm:col-span-5 relative">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <Input
            name="q"
            list="filter-popular-cars"
            defaultValue={filters.q || filters.make || ""}
            placeholder="نام خودرو (مثلاً: پژو پارس، پراید، ساینا...)"
            className="ps-9 font-medium"
            aria-label="نام خودرو"
          />
        </div>

        {/* قیمت از */}
        <div className="sm:col-span-3">
          <Input
            name="priceMin"
            inputMode="numeric"
            placeholder="قیمت از (میلیون)"
            defaultValue={formatMillion(filters.priceMin)}
            aria-label="حداقل قیمت"
          />
        </div>

        {/* قیمت تا */}
        <div className="sm:col-span-3">
          <Input
            name="priceMax"
            inputMode="numeric"
            placeholder="قیمت تا (میلیون)"
            defaultValue={formatMillion(filters.priceMax)}
            aria-label="حداکثر قیمت"
          />
        </div>

        {/* دکمه اعمال فیلتر */}
        <div className="sm:col-span-1">
          <Button type="submit" className="w-full min-h-11 justify-center bg-brand-600 text-white hover:bg-brand-700">
            جست‌وجو
          </Button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-line/60 pt-3 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-line bg-paper/50 px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-brand-50 hover:border-brand-200">
            <input
              type="checkbox"
              name="onlyOpportunities"
              value="1"
              defaultChecked={filters.onlyOpportunities}
              className="size-4 rounded border-line-strong text-brand-600 focus:ring-brand-500"
            />
            <Sparkles className="size-3.5 text-good-600" aria-hidden />
            فرصت‌های زیر قیمت
          </label>

          <label className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-line bg-paper/50 px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-amber-50 hover:border-amber-200">
            <input
              type="checkbox"
              name="urgent"
              value="1"
              defaultChecked={filters.onlyUrgent}
              className="size-4 rounded border-line-strong text-amber-600 focus:ring-amber-500"
            />
            <span className="text-amber-600">🔥</span>
            فروش فوری و پول‌لازم
          </label>

          <label className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-line bg-paper/50 px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-emerald-50 hover:border-emerald-200">
            <input
              type="checkbox"
              name="paintless"
              value="1"
              defaultChecked={filters.onlyPaintless}
              className="size-4 rounded border-line-strong text-emerald-600 focus:ring-emerald-500"
            />
            <span>🛡️</span>
            بدون رنگ و شاسی پلمپ
          </label>

          {/* فیلتر خودروهای تصادفی */}
          <div className="flex items-center gap-1.5 rounded-xl border border-line bg-paper/60 px-2.5 py-1 text-xs font-semibold">
            <Wrench className="size-3.5 text-amber-600" />
            <select
              name="damage"
              defaultValue={filters.damageFilter || "all"}
              onChange={(e) => e.target.form?.requestSubmit()}
              aria-label="فیلتر وضعیت بدنه و تصادف"
              className="bg-transparent text-xs font-semibold text-ink cursor-pointer focus:outline-hidden"
            >
              <option value="all">همه (سالم و تصادفی)</option>
              <option value="clean_only">🛡️ فقط سالم و بدون تصادف</option>
              <option value="damaged_only">💥 فقط تصادفی / تعمیری</option>
            </select>
          </div>

          <input type="hidden" name="sort" value={sort} />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {hasFilter && (
            <Link
              href="/listings"
              className="inline-flex items-center gap-1 text-xs text-muted hover:text-ink px-2 py-1 rounded-lg border border-line"
            >
              <RotateCcw className="size-3" />
              پاک کردن فیلتر
            </Link>
          )}

          <Link
            href={`/settings/alerts?${alertParams.toString()}`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-paper px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-50 border border-brand-200"
            title="هر زمان آگهی با این مشخصات ثبت شد به بله و تلگرام پیام فرستاده شود"
          >
            <BellPlus className="size-3.5 text-brand-600" />
            ارسال خودکار آگهی‌های این فیلتر به بله و تلگرام
          </Link>
        </div>
      </div>
    </form>
  );
}
