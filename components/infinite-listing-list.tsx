"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { ListingCard } from "./listing-card";
import { formatNumber } from "@/lib/money";
import type { ListingView } from "@/lib/types";

interface InfiniteListingListProps {
  items: ListingView[];
  showScore: boolean;
  initialCount?: number;
  batchSize?: number;
  filterKey?: string;
}

export function InfiniteListingList({
  items,
  showScore,
  initialCount = 15,
  batchSize = 15,
  filterKey,
}: InfiniteListingListProps) {
  const [visibleCount, setVisibleCount] = useState(initialCount);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const prevFilterKeyRef = useRef<string | undefined>(filterKey);

  // اگر فیلترها واقعاً تغییر کردند، اسکرول و تعداد نمایشی به مقدار اولیه بازگردد
  // اما در صورت بروزرسانی زنده آگهی‌ها در پس‌زمینه، موقعیت کاربر حفظ می‌شود تا صفحه نپرد
  useEffect(() => {
    if (prevFilterKeyRef.current !== filterKey) {
      prevFilterKeyRef.current = filterKey;
      setVisibleCount(initialCount);
    } else {
      setVisibleCount((prev) => Math.min(Math.max(prev, initialCount), items.length || initialCount));
    }
  }, [filterKey, items.length, initialCount]);

  const hasMore = visibleCount < items.length;

  useEffect(() => {
    if (!hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first?.isIntersecting) {
          setIsLoadingMore(true);
          // تأخیر ملایم برای ترنزیشن نرم رابط کاربری
          setTimeout(() => {
            setVisibleCount((prev) => Math.min(prev + batchSize, items.length));
            setIsLoadingMore(false);
          }, 150);
        }
      },
      {
        rootMargin: "300px", // ۳۰۰ پیکسل قبل از رسیدن به انتهای صفحه شروع به بارگذاری می‌کند
      },
    );

    const el = sentinelRef.current;
    if (el) observer.observe(el);

    return () => {
      if (el) observer.unobserve(el);
    };
  }, [hasMore, items.length, batchSize]);

  const visibleItems = items.slice(0, visibleCount);

  return (
    <div className="space-y-2.5 sm:space-y-3">
      {visibleItems.map((v) => (
        <ListingCard key={v.listing.id} view={v} showScore={showScore} />
      ))}

      {/* ناحیه اسکرول بی‌نهایت و مشاهده پایان لیست */}
      {hasMore ? (
        <div ref={sentinelRef} className="flex flex-col items-center justify-center py-6 gap-2">
          <div className="flex items-center gap-2 text-xs text-muted">
            <Loader2 className="size-4 animate-spin text-brand-600" />
            <span>در حال بارگذاری خودکار آگهی‌های بیشتر...</span>
          </div>
          <button
            type="button"
            onClick={() => setVisibleCount((prev) => Math.min(prev + batchSize, items.length))}
            className="text-[11px] text-brand-700 hover:underline pt-1"
          >
            بارگذاری دستی
          </button>
        </div>
      ) : items.length > 0 ? (
        <div className="py-8 text-center text-xs text-muted border-t border-line mt-4">
          ✓ تمام {formatNumber(items.length)} آگهی موجود بارگذاری شدند.
        </div>
      ) : null}
    </div>
  );
}
