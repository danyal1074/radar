import clsx from "clsx";
import { Bookmark, BookmarkCheck, ExternalLink, Eye, EyeOff, ImageOff, Trash2 } from "lucide-react";
import Link from "next/link";
import { deleteListingAction, toggleFollowAction, toggleSavedAction } from "@/app/actions";
import { timeAgo } from "@/lib/dates";
import { FOLLOWUP_LABEL, OPPORTUNITY_LABEL, SOURCE_LABEL } from "@/lib/labels";
import { formatKm, formatNumber, formatToman, formatYear } from "@/lib/money";
import { analyzeListingContent, generateShowroomBanner } from "@/lib/listing-meta";
import type { ListingView } from "@/lib/types";
import { isAllowedListingUrl } from "@/lib/validation";
import { Badge, SampleBadge } from "./ui";
import { PriceGauge } from "./price-gauge";
import { CopyBannerButton } from "./copy-banner-button";

export function OpenOriginal({ url, size = "sm" }: { url: string | null; size?: "sm" | "lg" }) {
  const cls = clsx(
    "inline-flex items-center justify-center gap-1.5 rounded-lg text-sm font-medium",
    size === "lg" ? "min-h-11 px-5" : "min-h-10 px-3",
  );
  if (url && isAllowedListingUrl(url)) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer nofollow" className={clsx(cls, "bg-brand-600 text-white hover:bg-brand-700")}>
        <ExternalLink className="size-4" aria-hidden /> باز کردن آگهی اصلی
      </a>
    );
  }
  return (
    <span
      className={clsx(cls, "cursor-not-allowed border border-line bg-paper text-muted")}
      aria-disabled="true"
      title="برای این آگهی لینک اصلی ثبت نشده است"
    >
      <ExternalLink className="size-4" aria-hidden /> لینک آگهی موجود نیست
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
  const analysis = analyzeListingContent(l.title, l.description || "");

  const isDivar = l.source === "divar";
  const isSheypoor = l.source === "sheypoor";

  return (
    <article
      className={clsx(
        "flex flex-col gap-4 rounded-xl border bg-surface p-4 sm:flex-row transition-all",
        isDivar
          ? "border-s-4 border-s-red-500 border-line hover:border-red-400"
          : isSheypoor
          ? "border-s-4 border-s-blue-500 border-line hover:border-blue-400"
          : "border-line",
      )}
    >
      <div className="flex h-44 w-full shrink-0 items-center justify-center rounded-xl bg-paper text-muted sm:h-auto sm:w-44 relative overflow-hidden shadow-xs">
        {l.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={l.image_url} alt={l.title} className="size-full rounded-xl object-cover" loading="lazy" />
        ) : (
          <span className="flex flex-col items-center gap-1.5 text-xs">
            <ImageOff className="size-7" aria-hidden />
            بدون تصویر
          </span>
        )}
        <div className="absolute top-2 start-2">
          {isDivar && (
            <span className="inline-flex items-center rounded-md bg-red-600 px-2 py-0.5 text-[11px] font-bold text-white shadow-sm">
              دیوار
            </span>
          )}
          {isSheypoor && (
            <span className="inline-flex items-center rounded-md bg-blue-600 px-2 py-0.5 text-[11px] font-bold text-white shadow-sm">
              شیپور
            </span>
          )}
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold">
              <Link href={`/listings/${l.id}`} className="hover:text-brand-700">
                {l.title}
              </Link>
            </h3>
            <p className="mt-0.5 text-xs text-muted">
              {l.year ? `مدل ${formatYear(l.year)}` : "سال نامشخص"} · {formatKm(l.mileage_km)} · {l.city ?? "تربت‌حیدریه"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {isDivar && (
              <span className="inline-flex items-center rounded-md border border-red-500/20 bg-red-500/10 px-2 py-0.5 text-xs font-semibold text-red-600">
                دیوار
              </span>
            )}
            {isSheypoor && (
              <span className="inline-flex items-center rounded-md border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 text-xs font-semibold text-blue-600">
                شیپور
              </span>
            )}
            <Badge tone={labelTone}>{OPPORTUNITY_LABEL[c.label]}</Badge>
            {showScore && view.score !== null && <Badge tone="brand">امتیاز {formatNumber(view.score)}</Badge>}
            {analysis.tags.map((tag) => (
              <span
                key={tag}
                className={clsx(
                  "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold",
                  tag.includes("🔥")
                    ? "bg-amber-500/15 text-amber-700 border border-amber-300 dark:text-amber-300"
                    : "bg-emerald-500/10 text-emerald-700 border border-emerald-300 dark:text-emerald-300",
                )}
              >
                {tag}
              </span>
            ))}
            {l.is_sample && <SampleBadge />}
          </div>
        </div>

        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <span className="text-lg font-bold">{formatToman(l.price_toman)}</span>
          <span className="text-xs text-muted">
            {SOURCE_LABEL[l.source]} · {timeAgo(l.published_at ?? l.first_seen_at)}
          </span>
        </div>

        <PriceGauge price={l.price_toman} comparison={c} sample={estimate?.is_sample} />

        <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
          <OpenOriginal url={l.source_url} />
          <CopyBannerButton text={generateShowroomBanner(l)} />
          <form action={toggleSavedAction}>
            <input type="hidden" name="listingId" value={l.id} />
            <input type="hidden" name="save" value={saved ? "0" : "1"} />
            <button
              type="submit"
              className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-line-strong bg-surface px-3 text-sm hover:bg-paper"
              aria-pressed={saved}
            >
              {saved ? <BookmarkCheck className="size-4 text-brand-600" aria-hidden /> : <Bookmark className="size-4" aria-hidden />}
              {saved ? "ذخیره شد" : "ذخیره"}
            </button>
          </form>
          <form action={toggleFollowAction}>
            <input type="hidden" name="listingId" value={l.id} />
            <button
              type="submit"
              className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-line-strong bg-surface px-3 text-sm hover:bg-paper"
              aria-pressed={!!following}
            >
              {following ? <EyeOff className="size-4 text-brand-600" aria-hidden /> : <Eye className="size-4" aria-hidden />}
              {following ? "توقف پیگیری" : "پیگیری"}
            </button>
          </form>
          <form action={deleteListingAction}>
            <input type="hidden" name="listingId" value={l.id} />
            <button
              type="submit"
              className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-line-strong bg-surface px-2.5 text-sm text-bad-600 hover:bg-bad-50"
              title="حذف این آگهی"
            >
              <Trash2 className="size-4" aria-hidden />
              حذف
            </button>
          </form>
          {followup && followup.status !== "none" && <Badge tone="brand">{FOLLOWUP_LABEL[followup.status]}</Badge>}
        </div>
      </div>
    </article>
  );
}
