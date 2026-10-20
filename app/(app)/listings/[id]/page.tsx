import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { FollowupForm } from "@/components/followup-form";
import { OpenOriginal } from "@/components/listing-card";
import { PriceGauge } from "@/components/price-gauge";
import { Badge, Card, SampleBadge } from "@/components/ui";
import { requireContext } from "@/lib/auth";
import { formatDateTime } from "@/lib/dates";
import { OPPORTUNITY_LABEL, SOURCE_LABEL } from "@/lib/labels";
import { formatKm, formatPercent, formatToman, formatYear } from "@/lib/money";
import { loadViews } from "@/lib/page-data";
import { toggleSavedAction } from "@/app/actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "جزئیات آگهی" };

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-line py-2.5 text-sm last:border-0">
      <dt className="text-muted">{label}</dt>
      <dd className="text-end font-medium">{children}</dd>
    </div>
  );
}

export default async function ListingDetailPage({ params }: PageProps<"/listings/[id]">) {
  const { id } = await params;
  const ctx = await requireContext({ access: true });
  const views = await loadViews(ctx);
  const view = views.find((v) => v.listing.id === id);
  if (!view) notFound();
  const { listing: l, estimate: e, comparison: c } = view;
  const history = await ctx.store.getPriceHistory(l.id);

  return (
    <>
      <Link href="/listings" className="mb-4 inline-flex items-center gap-1 text-sm text-brand-700 hover:underline">
        <ArrowRight className="size-4" aria-hidden /> بازگشت به آگهی‌ها
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">{l.title}</h1>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge tone={c.label === "opportunity" ? "good" : c.label === "missing_zero" ? "warn" : c.label === "needs_review" ? "warn" : "neutral"}>
              {OPPORTUNITY_LABEL[c.label]}
            </Badge>
            {l.is_sample && <SampleBadge />}
            {l.source_status === "removed" && <Badge tone="bad">دیگر در منبع دیده نمی‌شود</Badge>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <OpenOriginal url={l.source_url} size="lg" />
          <form action={toggleSavedAction}>
            <input type="hidden" name="listingId" value={l.id} />
            <input type="hidden" name="save" value={view.saved ? "0" : "1"} />
            <button type="submit" className="inline-flex min-h-11 items-center rounded-lg border border-line-strong bg-surface px-5 text-sm font-medium hover:bg-paper">
              {view.saved ? "حذف از ذخیره‌ها" : "ذخیره آگهی"}
            </button>
          </form>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-4">
          <Card className="p-5">
            <p className="text-sm text-muted">قیمت آگهی</p>
            <p className="mb-4 text-3xl font-bold">{formatToman(l.price_toman)}</p>
            <PriceGauge price={l.price_toman} comparison={c} sample={e?.is_sample} />
            {e && (
              <dl className="mt-4">
                <Row label="قیمت تخمینی">
                  {e.status === "success" ? formatToman(e.estimated_price_toman) : "ناموفق"}
                  {e.is_sample && " (قیمت نمونه)"}
                </Row>
                {c.fresh && c.diffToman !== null && c.diffPercent !== null && (
                  <>
                    <Row label="اختلاف قیمت">{formatToman(c.diffToman)}</Row>
                    <Row label="درصد اختلاف">{formatPercent(c.diffPercent)}</Row>
                  </>
                )}
                <Row label="تاریخ تخمین">{formatDateTime(e.estimated_at)}</Row>
                <Row label="منبع تخمین">{e.provider === "mock" ? "سرویس نمونه" : e.provider}</Row>
                {e.confidence !== null && <Row label="اطمینان تخمین">{formatPercent(e.confidence * 100)}</Row>}
                {e.status === "success" && !c.fresh && <Row label="وضعیت">تخمین منقضی شده است</Row>}
              </dl>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="mb-2 font-semibold">مشخصات</h2>
            <dl>
              <Row label="خودرو">{l.make} {l.model} {l.trim ?? ""}</Row>
              <Row label="سال ساخت">{l.year ? formatYear(l.year) : "نامشخص"}</Row>
              <Row label="کارکرد">{formatKm(l.mileage_km)}</Row>
              <Row label="رنگ">{l.color ?? "نامشخص"}</Row>
              <Row label="شهر">{l.city ?? "نامشخص"}</Row>
              <Row label="منبع">{SOURCE_LABEL[l.source]}</Row>
              <Row label="شناسه آگهی در منبع"><span className="ltr-num">{l.source_post_id}</span></Row>
              <Row label="زمان انتشار">{formatDateTime(l.published_at)}</Row>
              <Row label="آخرین بررسی">{formatDateTime(l.last_seen_at)}</Row>
            </dl>
            {l.description && <p className="mt-4 whitespace-pre-line text-sm leading-7 text-muted">{l.description}</p>}
          </Card>

          <Card className="p-5">
            <h2 className="mb-2 font-semibold">تاریخچه قیمت</h2>
            {history.length < 2 ? (
              <p className="text-sm text-muted">تغییر قیمتی ثبت نشده است.</p>
            ) : (
              <ul className="divide-y divide-line text-sm">
                {[...history].reverse().map((h) => (
                  <li key={h.seen_at} className="flex justify-between py-2">
                    <span className="text-muted">{formatDateTime(h.seen_at)}</span>
                    <span className="font-medium">{formatToman(h.price_toman)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <Card className="h-fit p-5">
          <h2 className="mb-4 font-semibold">پیگیری و یادداشت</h2>
          <FollowupForm listingId={l.id} followup={view.followup} />
        </Card>
      </div>
    </>
  );
}
