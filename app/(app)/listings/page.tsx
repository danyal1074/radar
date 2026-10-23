import type { Metadata } from "next";
import { Radio } from "lucide-react";
import { syncLiveDivarAction } from "@/app/actions";
import { AutoRefresher } from "@/components/auto-refresher";
import { FilterBar } from "@/components/filter-bar";
import { InfiniteListingList } from "@/components/infinite-listing-list";
import { Button, EmptyState, LinkButton, PageHeader } from "@/components/ui";
import { requireContext } from "@/lib/auth";
import { normalizeCityNameFa } from "@/lib/cities";
import { formatNumber } from "@/lib/money";
import { PLANS } from "@/lib/plans";
import { loadViews } from "@/lib/page-data";
import { parseListingQuery } from "@/lib/search-params";
import { applyFilters, applySort, facets } from "@/lib/views";

export const metadata: Metadata = { title: "رادار آگهی‌ها" };
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ListingsPage({ searchParams }: PageProps<"/listings">) {
  const sp = await searchParams;
  const ctx = await requireContext({ access: true });
  const plan = PLANS[ctx.access.plan];
  const userCity = normalizeCityNameFa(ctx.profile.city) || "مشهد";
  const allowedCitiesCount = ctx.profile.role === "admin" ? 999 : plan.allowedCitiesCount;

  const { filters, sort } = parseListingQuery(sp, plan.opportunityScore);
  const all = await loadViews(ctx);
  const filtered = applySort(applyFilters(all, filters), sort);
  const filterKey = `${filters.city ?? ""}-${filters.make ?? ""}-${filters.model ?? ""}-${filters.q ?? ""}-${sort}`;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageHeader title="رادار آگهی‌ها" description={`${formatNumber(filtered.length)} آگهی زنده از دیوار و شیپور`} />
        <form action={syncLiveDivarAction}>
          <input type="hidden" name="city" value={filters.city ?? ""} />
          <Button type="submit" className="min-h-10 gap-2 bg-brand-600 text-white hover:bg-brand-700 text-xs sm:text-sm">
            <Radio className="size-4 animate-pulse" />
            شکار فوری جدیدترین آگهی‌ها
          </Button>
        </form>
      </div>
      <AutoRefresher intervalSeconds={30} totalCount={filtered.length} className="my-2" />
      <FilterBar
        filters={filters}
        sort={sort}
        facets={facets(all)}
        canScoreSort={plan.opportunityScore}
        allowedCitiesCount={allowedCitiesCount}
        userCity={userCity}
      />
      {filtered.length === 0 ? (
        <EmptyState
          title="آگهی‌ای پیدا نشد"
          body="فیلترها را کمتر کنید یا پاک کنید تا آگهی‌های بیشتری ببینید."
          action={<LinkButton href="/listings" variant="secondary">پاک‌کردن فیلترها</LinkButton>}
        />
      ) : (
        <InfiniteListingList
          items={filtered}
          showScore={plan.opportunityScore}
          initialCount={15}
          batchSize={15}
          filterKey={filterKey}
        />
      )}
    </>
  );
}
