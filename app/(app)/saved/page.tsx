import type { Metadata } from "next";
import Link from "next/link";
import { ListingCard } from "@/components/listing-card";
import { EmptyState, LinkButton, PageHeader } from "@/components/ui";
import { requireContext } from "@/lib/auth";
import { formatNumber } from "@/lib/money";
import { PLANS } from "@/lib/plans";
import { loadViews } from "@/lib/page-data";

export const metadata: Metadata = { title: "آگهی‌های ذخیره‌شده" };
export const dynamic = "force-dynamic";

export default async function SavedPage({ searchParams }: PageProps<"/saved">) {
  const sp = await searchParams;
  const onlyFollow = sp.follow === "1";
  const ctx = await requireContext({ access: true });
  const plan = PLANS[ctx.access.plan];
  const views = (await loadViews(ctx)).filter((v) =>
    onlyFollow ? v.followup && !["none", "dropped"].includes(v.followup.status) : v.saved,
  );

  return (
    <>
      <PageHeader
        title={onlyFollow ? "در حال پیگیری" : "آگهی‌های ذخیره‌شده"}
        description={`${formatNumber(views.length)} آگهی${onlyFollow ? "" : ` (سقف پلن ${plan.name}: ${formatNumber(plan.maxSavedListings)})`}`}
        actions={
          <Link href={onlyFollow ? "/saved" : "/saved?follow=1"} className="text-sm text-brand-700 hover:underline">
            {onlyFollow ? "نمایش ذخیره‌شده‌ها" : "نمایش در حال پیگیری"}
          </Link>
        }
      />
      {views.length === 0 ? (
        <EmptyState
          title={onlyFollow ? "آگهی‌ای در حال پیگیری نیست" : "هنوز آگهی‌ای ذخیره نکرده‌اید"}
          body="در رادار آگهی‌ها، دکمه ذخیره یا پیگیری را بزنید."
          action={<LinkButton href="/listings">رفتن به رادار آگهی‌ها</LinkButton>}
        />
      ) : (
        <div className="space-y-3">
          {views.map((v) => (
            <ListingCard key={v.listing.id} view={v} showScore={plan.opportunityScore} />
          ))}
        </div>
      )}
    </>
  );
}
