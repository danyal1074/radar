import clsx from "clsx";
import { Bookmark, BookmarkCheck, ExternalLink, Eye, EyeOff, ImageOff, Trash2 } from "lucide-react";
import Link from "next/link";
import { deleteListingAction, toggleFollowAction, toggleSavedAction } from "@/app/actions";
import { timeAgo } from "@/lib/dates";
import { FOLLOWUP_LABEL, OPPORTUNITY_LABEL, SOURCE_LABEL } from "@/lib/labels";
import { formatKm, formatNumber, formatToman, formatTomanReadable, formatYear } from "@/lib/money";
import { generateShowroomBanner } from "@/lib/listing-meta";
import type { ListingView } from "@/lib/types";
import { isAllowedListingUrl } from "@/lib/validation";
import { Badge, SampleBadge } from "./ui";
import { PriceGauge } from "./price-gauge";
import { CopyBannerButton } from "./copy-banner-button";

export function OpenOriginal({ url, size = "sm" }: { url: string | null; size?: "sm" | "lg" }) {
  const cls = clsx(
    "inline-flex items-center justify-center gap-1 rounded-md text-xs font-semibold transition-colors",
    size === "lg" ? "h-9 px-4" : "h-7 sm:h-8 px-2.5",
  );
  if (url && isAllowedListingUrl(url)) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer nofollow" className={clsx(cls, "bg-brand-600 text-white hover:bg-brand-700")}>
        <ExternalLink className="size-3.5" aria-hidden /> باز کردن آگهی
      </a>
    );
  }
  return (
    <span
      className={clsx(cls, "cursor-not-allowed border border-line bg-paper text-muted")}
      aria-disabled="true"
      title="برای این آگهی لینک اصلی ثبت نشده است"
    >
      <ExternalLink className="size-3.5" aria-hidden /> بدون لینک
    </span>
  );
}

export function ListingCard({ view, showScore }: { view: ListingView; showScore: boolean }) {
  const { listing: l, comparison: c, estimate, saved, followup } = view;
  const following = followup && followup.status !== "none" && followup.status !== "dropped";
  const labelTone =
    c.label === "opportunity"
      ? "good"
      : c.label === "missing_zero"
      ? "warn"
      : c.label === "needs_review"
      ? "warn"
      : "neutral";

  const isDivar = l.source === "divar";
  const isSheypoor = l.source === "sheypoor";
  const market = c.fresh && c.estimatedToman ? c.estimatedToman : null;
  const showProfit =
    c.label !== "missing_zero" &&
    market !== null &&
    c.diffToman !== null &&
    c.diffToman > 0 &&
    c.diffPercent !== null &&
    c.diffPercent > 0;

  const priceBlock = (
    <div className="flex flex-col gap-0.5">
      <span className="text-base font-black text-ink sm:text-lg">{formatTomanReadable(l.price_toman)}</span>
      {market !== null && <span className="text-[11px] text-muted">ارزش بازار {formatTomanReadable(market)}</span>}
      {showProfit && (
        <span className="text-[11px] font-bold text-good-700">
          سود {formatTomanReadable(c.diffToman)} · {Math.round(c.diffPercent ?? 0)}٪
        </span>
      )}
    </div>
  );

  return (
    <article
      className={clsx(
        "flex flex-row items-stretch gap-2.5 sm:gap-3.5 rounded-xl border bg-surface p-2 sm:p-3 transition-all hover:border-line-strong hover:shadow-xs",
        isDivar
          ? "border-s-[3px] border-s-red-500 border-line"
          : isSheypoor
          ? "border-s-[3px] border-s-blue-500 border-line"
          : "border-line",
      )}
    >
      {/* تصویر بندانگشتی فشرده */}
      <div className="relative flex size-24 sm:size-28 md:w-32 md:h-28 shrink-0 items-center justify-center rounded-lg bg-paper text-muted overflow-hidden shadow-xs">
        {l.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={l.image_url} alt={l.title} className="size-full rounded-lg object-cover" loading="lazy" />
        ) : (
          <span className="flex flex-col items-center gap-1 text-[10px] text-muted">
            <ImageOff className="size-5" aria-hidden />
            بدون عکس
          </span>
        )}
        <div className="absolute top-1 start-1">
          {isDivar && (
            <span className="inline-flex items-center rounded bg-red-600/90 backdrop-blur-xs px-1.5 py-0.5 text-[9px] font-bold text-white shadow-xs">
              دیوار
            </span>
          )}
          {isSheypoor && (
            <span className="inline-flex items-center rounded bg-blue-600/90 backdrop-blur-xs px-1.5 py-0.5 text-[9px] font-bold text-white shadow-xs">
              شیپور
            </span>
          )}
        </div>
      </div>

      {/* ستون محتوا و مشخصات فشرده */}
      <div className="flex min-w-0 flex-1 flex-col justify-between gap-1.5">
        <div>
          {/* ردیف عنوان و برچسب‌ها */}
          <div className="flex flex-wrap items-center justify-between gap-1.5">
            <h3 className="truncate text-xs sm:text-sm font-bold text-ink">
              <Link href={`/listings/${l.id}`} className="hover:text-brand-700">
                {l.title}
              </Link>
            </h3>
            <div className="flex flex-wrap items-center gap-1">
              <Badge tone={labelTone} className="text-[10px] py-0 px-1.5">{OPPORTUNITY_LABEL[c.label]}</Badge>
              {showScore && view.score !== null && <Badge tone="brand" className="text-[10px] py-0 px-1.5">امتیاز {formatNumber(view.score)}</Badge>}
              {l.is_sample && <SampleBadge />}
            </div>
          </div>

          {/* ردیف جزئیات خودرو: سال، کارکرد، شهر، زمان */}
          <p className="mt-0.5 text-[11px] text-muted truncate">
            {l.year ? `مدل ${formatYear(l.year)}` : "سال نامشخص"} · {formatKm(l.mileage_km)} · {l.city ?? "مشهد"} · {timeAgo(l.published_at ?? l.first_seen_at)}
          </p>
        </div>

        <div className="sm:hidden">{priceBlock}</div>
        {!showProfit && (
          <div className="w-full">
            <PriceGauge price={l.price_toman} comparison={c} sample={estimate?.is_sample} />
          </div>
        )}

        {/* دکمه‌های اقدام فشرده در یک ردیف */}
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          <OpenOriginal url={l.source_url} />
          <CopyBannerButton text={generateShowroomBanner(l)} />
          <form action={toggleSavedAction}>
            <input type="hidden" name="listingId" value={l.id} />
            <input type="hidden" name="save" value={saved ? "0" : "1"} />
            <button
              type="submit"
              className="inline-flex h-7 sm:h-8 items-center gap-1 rounded-md border border-line-strong bg-surface px-2 text-xs hover:bg-paper transition-colors"
              aria-pressed={saved}
              title={saved ? "حذف از ذخیره‌ها" : "ذخیره آگهی"}
            >
              {saved ? <BookmarkCheck className="size-3.5 text-brand-600" aria-hidden /> : <Bookmark className="size-3.5" aria-hidden />}
              <span className="hidden sm:inline">{saved ? "ذخیره" : "ذخیره"}</span>
            </button>
          </form>
          <form action={toggleFollowAction}>
            <input type="hidden" name="listingId" value={l.id} />
            <button
              type="submit"
              className="inline-flex h-7 sm:h-8 items-center gap-1 rounded-md border border-line-strong bg-surface px-2 text-xs hover:bg-paper transition-colors"
              aria-pressed={!!following}
              title={following ? "توقف پیگیری" : "پیگیری آگهی"}
            >
              {following ? <EyeOff className="size-3.5 text-brand-600" aria-hidden /> : <Eye className="size-3.5" aria-hidden />}
              <span className="hidden sm:inline">{following ? "توقف" : "پیگیری"}</span>
            </button>
          </form>
          <form action={deleteListingAction}>
            <input type="hidden" name="listingId" value={l.id} />
            <button
              type="submit"
              className="inline-flex h-7 sm:h-8 items-center gap-1 rounded-md border border-line bg-surface px-2 text-xs text-bad-600 hover:bg-bad-50 transition-colors"
              title="حذف این آگهی"
            >
              <Trash2 className="size-3.5" aria-hidden />
            </button>
          </form>
          {followup && followup.status !== "none" && <Badge tone="brand" className="text-[10px] py-0 px-1.5">{FOLLOWUP_LABEL[followup.status]}</Badge>}
        </div>
      </div>
      <div className="hidden w-40 shrink-0 flex-col justify-center border-s border-line ps-3 text-right sm:flex">{priceBlock}</div>
    </article>
  );
}
