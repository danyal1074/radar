import type { Metadata } from "next";
import Link from "next/link";
import { Bell, Bookmark, Eye, Plus, Radar, Target } from "lucide-react";
import { ListingCard } from "@/components/listing-card";
import { Card, EmptyState, LinkButton, PageHeader, SampleBadge } from "@/components/ui";
import { requireContext } from "@/lib/auth";
import { formatNumber } from "@/lib/money";
import { PLANS } from "@/lib/plans";
import { loadViews } from "@/lib/page-data";
import { opportunitiesFor } from "@/lib/views";

export const metadata: Metadata = { title: "داشبورد" };
export const dynamic = "force-dynamic";
export const revalidate = 0;

const hoursAgoMs = (h: number) => Date.now() - h * 3_600_000;

function Stat({ icon: Icon, label, value, href }: { icon: typeof Radar; label: string; value: number; href: string }) {
  return (
    <Link href={href} className="group rounded-xl border border-line bg-surface p-4 transition-colors hover:border-brand-600">
      <div className="flex items-center gap-2 text-sm text-muted">
        <Icon className="size-4" aria-hidden /> {label}
      </div>
      <p className="mt-2 text-3xl font-bold tabular-nums">{formatNumber(value)}</p>
    </Link>
  );
}

export default async function DashboardPage() {
  const ctx = await requireContext({ access: true });
  const [views, rules, unread] = await Promise.all([
    loadViews(ctx),
    ctx.store.listRules(ctx.user.id),
    ctx.store.unreadCount(ctx.user.id),
  ]);
  const plan = PLANS[ctx.access.plan];
  const dayAgo = hoursAgoMs(24);
  const newCount = views.filter((v) => new Date(v.listing.first_seen_at).getTime() > dayAgo).length;
  const opps = opportunitiesFor(views, rules.filter((r) => r.is_active));
  const saved = views.filter((v) => v.saved).length;
  const following = views.filter((v) => v.followup && !["none", "dropped"].includes(v.followup.status)).length;
  const activeRules = rules.filter((r) => r.is_active).length;
  const hasSample = views.some((v) => v.listing.is_sample);

  return (
    <>
      <PageHeader
        title={`سلام، ${ctx.profile.business_name}`}
        description="خلاصه‌ای از آگهی‌ها و فرصت‌های امروز شما."
        actions={
          <LinkButton href="/settings/alerts?new=1">
            <Plus className="size-4" aria-hidden /> قانون هشدار جدید
          </LinkButton>
        }
      />
      {hasSample && (
        <div className="mb-4 flex items-center gap-2 text-sm text-muted">
          <SampleBadge /> بخشی از آگهی‌ها و تخمین‌ها نمونه است.
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={Radar} label="آگهی جدید (۲۴ ساعت)" value={newCount} href="/listings?sort=newest" />
        <Stat icon={Target} label="فرصت خرید" value={opps.length} href="/opportunities" />
        <Stat icon={Bookmark} label="ذخیره‌شده" value={saved} href="/saved" />
        <Stat icon={Eye} label="در حال پیگیری" value={following} href="/saved?follow=1" />
      </div>

      <Card className="mt-4 flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-3 text-sm">
          <Bell className="size-5 text-brand-600" aria-hidden />
          <span>
            {formatNumber(activeRules)} قانون هشدار فعال از {formatNumber(plan.maxActiveRules)}، و {formatNumber(unread)} اعلان خوانده‌نشده.
          </span>
        </div>
        <div className="flex gap-2">
          <LinkButton href="/notifications" variant="secondary">اعلان‌ها</LinkButton>
          <LinkButton href="/settings/alerts" variant="secondary">مدیریت قوانین</LinkButton>
        </div>
      </Card>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">بهترین فرصت‌های خرید</h2>
        {opps.length === 0 ? (
          <EmptyState
            title="هنوز فرصتی پیدا نشده"
            body={
              activeRules === 0
                ? "یک قانون هشدار بسازید تا آگهی‌های ارزان‌تر از قیمت تخمینی را برایتان پیدا کنیم."
                : "آگهی‌ای با شرایط قوانین شما و قیمت تخمینی معتبر پیدا نشد."
            }
            action={activeRules === 0 ? <LinkButton href="/settings/alerts?new=1">ساخت قانون هشدار</LinkButton> : undefined}
          />
        ) : (
          <div className="space-y-3">
            {opps.slice(0, 3).map(({ view }) => (
              <ListingCard key={view.listing.id} view={view} showScore={plan.opportunityScore} />
            ))}
          </div>
        )}
      </section>

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">آخرین آگهی‌ها</h2>
          <Link href="/listings" className="text-sm text-brand-700 hover:underline">
            همه آگهی‌ها
          </Link>
        </div>
        {views.length === 0 ? (
          <EmptyState title="آگهی‌ای وجود ندارد" body="هنوز آگهی‌ای وارد سامانه نشده است." />
        ) : (
          <div className="space-y-3">
            {[...views]
              .sort((a, b) => (b.listing.published_at ?? b.listing.first_seen_at).localeCompare(a.listing.published_at ?? a.listing.first_seen_at))
              .slice(0, 4)
              .map((v) => (
                <ListingCard key={v.listing.id} view={v} showScore={plan.opportunityScore} />
              ))}
          </div>
        )}
      </section>
    </>
  );
}
