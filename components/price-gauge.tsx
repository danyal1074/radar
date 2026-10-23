import clsx from "clsx";
import { formatPercent, formatToman, formatTomanReadable } from "@/lib/money";
import type { PriceComparison } from "@/lib/types";

/**
 * Signature element: a track where the tick is the estimated price and the
 * filled marker is the listing price. Left = cheaper in RTL reading order.
 * The span below the estimate means "you pay less than the estimate".
 */
export function PriceGauge({ price, comparison, sample }: { price: number; comparison: PriceComparison; sample?: boolean }) {
  if (!comparison.fresh || comparison.estimatedToman === null || comparison.diffPercent === null) {
    return (
      <p className="text-xs text-muted">
        {comparison.estimatedToman === null ? "قیمت تخمینی در دسترس نیست" : "تخمین منقضی شده است"}؛ مقایسه انجام نشد.
      </p>
    );
  }

  // در صورت تشخیص خطای کم گذاشتن صفر، باکس هشدار تحلیلی نمایش داده می‌شود
  if (comparison.label === "missing_zero") {
    const suggested = comparison.typoInfo?.suggestedPriceToman;
    const est = comparison.estimatedToman;
    return (
      <div className="rounded-lg border border-amber-300/80 bg-amber-50/70 p-2.5 text-xs text-amber-900 dark:border-amber-700/50 dark:bg-amber-950/30 dark:text-amber-200">
        <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-300">
          <span>احتمال خطای ثبت قیمت: فروشنده یک یا دو صفر کم گذاشته است.</span>
        </div>
        <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-amber-800/80 dark:text-amber-300/80">
          <span>مبلغ درج‌شده: <strong className="line-through">{formatToman(price)}</strong></span>
          {suggested && (
            <span className="font-semibold text-amber-900 dark:text-amber-200">
              قیمت احتمالی واقعی: <strong>{formatToman(suggested)}</strong>
            </span>
          )}
          <span>کارشناسی برآورد: <strong>{formatToman(est)}</strong></span>
        </div>
      </div>
    );
  }

  const est = comparison.estimatedToman;
  // Window: ±30% around the estimate, estimate tick pinned to the centre.
  const lo = est * 0.7;
  const hi = est * 1.3;
  const pos = Math.max(0, Math.min(100, ((price - lo) / (hi - lo)) * 100));
  const cheaper = comparison.diffPercent > 0;
  const tone = comparison.label === "opportunity" ? "bg-good-600" : cheaper ? "bg-brand-600" : "bg-muted";

  return (
    <div className="space-y-1">
      <div
        className="relative h-3.5"
        role="img"
        aria-label={`قیمت آگهی ${formatPercent(Math.abs(comparison.diffPercent))} ${cheaper ? "پایین‌تر" : "بالاتر"} از قیمت تخمینی است`}
      >
        <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-line" />
        {/* span between listing price and estimate */}
        <div
          className={clsx("absolute top-1/2 h-1 -translate-y-1/2 rounded-full opacity-40", tone)}
          style={{ insetInlineStart: `${Math.min(pos, 50)}%`, width: `${Math.abs(50 - pos)}%` }}
        />
        <div className="absolute inset-y-0 w-px bg-ink/60" style={{ insetInlineStart: "50%" }} />
        <div
          className={clsx("absolute top-1/2 size-2.5 -translate-y-1/2 rounded-full border border-surface shadow-[0_0_0_1px_var(--color-line-strong)]", tone)}
          style={{ insetInlineStart: `calc(${pos}% - 5px)` }}
        />
      </div>
      <div className="flex items-baseline justify-between text-[11px]">
        <span className={clsx("font-semibold", comparison.label === "opportunity" ? "text-good-700 dark:text-good-400" : cheaper ? "text-brand-700 dark:text-brand-400" : "text-muted")}>
          {formatPercent(Math.abs(comparison.diffPercent))} {cheaper ? "ارزان‌تر" : "گران‌تر"} ({formatTomanReadable(Math.abs(comparison.diffToman ?? 0))})
        </span>
        <span className="text-muted text-[10px]">
          کارشناسی: {formatTomanReadable(est)}
          {sample ? " (نمونه)" : ""}
        </span>
      </div>
    </div>
  );
}
