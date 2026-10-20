import type { Metadata } from "next";
import { Sparkles } from "lucide-react";
import { ListingCard } from "@/components/listing-card";
import { Badge, EmptyState, LinkButton, PageHeader } from "@/components/ui";
import { requireContext } from "@/lib/auth";
import { formatNumber } from "@/lib/money";
import { PLANS } from "@/lib/plans";
import { loadViews } from "@/lib/page-data";
import { opportunitiesFor } from "@/lib/views";

export const metadata: Metadata = { title: "فرصت‌های خرید" };
export const dynamic = "force-dynamic";

export default async function OpportunitiesPage() {
  const ctx = await requireContext({ access: true });
  const [views, rules] = await Promise.all([loadViews(ctx), ctx.store.listRules(ctx.user.id)]);
  const plan = PLANS[ctx.access.plan];

  const activeRules = rules.filter((r) => r.is_active);
  // ۱. فرصت‌های دقیقاً منطبق با هشدارهای کاربر
  const ruleOpps = opportunitiesFor(views, activeRules);
  const ruleOppListingIds = new Set(ruleOpps.map((o) => o.view.listing.id));

  // ۲. تمام فرصت‌های زیر قیمت بازار در تربت‌حیدریه (چه برای آن‌ها هشدار باشد چه نباشد)
  const marketOpps = views
    .filter((v) => {
      if (ruleOppListingIds.has(v.listing.id)) return false; // جلوگیری از نمایش تکراری
      return (
        v.comparison.fresh &&
        v.comparison.diffPercent !== null &&
        v.comparison.diffPercent >= 5 &&
        (v.comparison.diffToman ?? 0) > 0
      );
    })
    .sort((a, b) => (b.comparison.diffPercent ?? 0) - (a.comparison.diffPercent ?? 0));

  const totalOpps = ruleOpps.length + marketOpps.length;

  return (
    <>
      <PageHeader
        title="فرصت‌های خرید"
        description="تمام آگهی‌های واقعی دیوار و شیپور تربت‌حیدریه که قیمت آن‌ها پایین‌تر از نرخ کارشناسی روز بازار است."
        actions={
          <LinkButton href="/settings/alerts?new=1" variant="secondary">
            تعریف هشدار جدید
          </LinkButton>
        }
      />

      {totalOpps === 0 ? (
        <EmptyState
          title="در حال حاضر فرصت خریدی یافت نشد"
          body="به محض انتشار آگهی جدید زیر قیمت در دیوار و شیپور تربت‌حیدریه، در اینجا نمایش داده می‌شود و به بله و تلگرام شما ارسال خواهد شد."
          action={<LinkButton href="/listings">مشاهده تمام آگهی‌ها</LinkButton>}
        />
      ) : (
        <div className="space-y-6">
          {/* بخش ۱: منطبق با هشدارهای شما */}
          {ruleOpps.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-good-600" />
                <h2 className="font-bold text-ink">
                  منطبق با هشدارهای فعال شما ({formatNumber(ruleOpps.length)} آگهی)
                </h2>
              </div>
              <div className="space-y-3">
                {ruleOpps.map(({ view, ruleNames }) => (
                  <div key={view.listing.id} className="space-y-1.5">
                    <div className="flex flex-wrap gap-1.5">
                      {ruleNames.map((n) => (
                        <Badge key={n} tone="brand">
                          قانون: {n}
                        </Badge>
                      ))}
                    </div>
                    <ListingCard view={view} showScore={plan.opportunityScore} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* بخش ۲: سایر فرصت‌های شکار بازار تربت‌حیدریه */}
          {marketOpps.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-ink">
                  سایر فرصت‌های زیر قیمت بازار در تربت‌حیدریه ({formatNumber(marketOpps.length)} خودرو)
                </h2>
                <span className="text-xs text-muted">مرتب‌شده بر اساس بیشترین سود</span>
              </div>
              <div className="space-y-3">
                {marketOpps.map((view) => (
                  <ListingCard key={view.listing.id} view={view} showScore={plan.opportunityScore} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
