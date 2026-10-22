import type { Metadata } from "next";
import { Radio } from "lucide-react";
import { syncLiveDivarAction } from "@/app/actions";
import { FilterBar } from "@/components/filter-bar";
import { ListingCard } from "@/components/listing-card";
import { Pagination } from "@/components/pagination";
import { Button, EmptyState, LinkButton, PageHeader } from "@/components/ui";
import { requireContext } from "@/lib/auth";
import { formatNumber } from "@/lib/money";
import { PLANS } from "@/lib/plans";
import { loadViews } from "@/lib/page-data";
import { parseListingQuery } from "@/lib/search-params";
import { applyFilters, applySort, facets, paginate } from "@/lib/views";

export const metadata: Metadata = { title: "رادار آگهی‌ها" };
export const dynamic = "force-dynamic";
const PAGE_SIZE = 10;

export default async function ListingsPage({ searchParams }: PageProps<"/listings">) {
  const sp = await searchParams;
  const ctx = await requireContext({ access: true });
  const plan = PLANS[ctx.access.plan];
  const userCity = ctx.profile.city?.includes("مشهد") ? "مشهد" : "تربت‌حیدریه";
  const allowedCitiesCount = ctx.profile.role === "admin" ? 2 : plan.allowedCitiesCount;

  const { filters, sort, page } = parseListingQuery(sp, plan.opportunityScore);
  const all = await loadViews(ctx);
  const filtered = applySort(applyFilters(all, filters), sort);
  const pg = paginate(filtered, page, PAGE_SIZE);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageHeader title="رادار آگهی‌ها" description={`${formatNumber(pg.total)} آگهی مطابق فیلتر شما`} />
        <form action={syncLiveDivarAction}>
          <Button type="submit" className="min-h-11 gap-2 bg-brand-600 text-white hover:bg-brand-700">
            <Radio className="size-4 animate-pulse" />
            رادار لحظه‌ای دیوار و شیپور (دریافت جدیدترین آگهی‌ها)
          </Button>
        </form>
      </div>
      <FilterBar
        filters={filters}
        sort={sort}
        facets={facets(all)}
        canScoreSort={plan.opportunityScore}
        allowedCitiesCount={allowedCitiesCount}
        userCity={userCity}
      />
      {pg.items.length === 0 ? (
        <EmptyState
          title="آگهی‌ای پیدا نشد"
          body="فیلترها را کمتر کنید یا پاک کنید تا آگهی‌های بیشتری ببینید."
          action={<LinkButton href="/listings" variant="secondary">پاک‌کردن فیلترها</LinkButton>}
        />
      ) : (
        <div className="space-y-3">
          {pg.items.map((v) => (
            <ListingCard key={v.listing.id} view={v} showScore={plan.opportunityScore} />
          ))}
        </div>
      )}
      <Pagination page={pg.page} totalPages={pg.totalPages} sp={sp} basePath="/listings" />
    </>
  );
}
