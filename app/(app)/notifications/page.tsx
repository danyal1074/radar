import type { Metadata } from "next";
import Link from "next/link";
import { CheckCheck, Circle } from "lucide-react";
import { markAllNotificationsAction, markNotificationAction } from "@/app/actions";
import { Card, EmptyState, LinkButton, PageHeader } from "@/components/ui";
import { requireContext } from "@/lib/auth";
import { timeAgo } from "@/lib/dates";
import { formatNumber } from "@/lib/money";

export const metadata: Metadata = { title: "اعلان‌ها" };
export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const ctx = await requireContext({ access: true });
  const items = await ctx.store.listNotifications(ctx.user.id);
  const unread = items.filter((n) => !n.is_read).length;

  return (
    <>
      <PageHeader
        title="اعلان‌ها"
        description={`${formatNumber(unread)} اعلان خوانده‌نشده. اعلان‌ها فقط داخل همین سامانه نمایش داده می‌شوند.`}
        actions={
          unread > 0 && (
            <form action={markAllNotificationsAction}>
              <button className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-line-strong bg-surface px-4 text-sm font-medium hover:bg-paper">
                <CheckCheck className="size-4" aria-hidden /> همه را خوانده‌شده کن
              </button>
            </form>
          )
        }
      />
      {items.length === 0 ? (
        <EmptyState
          title="اعلانی ندارید"
          body="وقتی آگهی‌ای به آستانه قانون‌های شما برسد، اینجا خبرتان می‌کنیم."
          action={<LinkButton href="/settings/alerts">مدیریت قوانین هشدار</LinkButton>}
        />
      ) : (
        <Card className="divide-y divide-line">
          {items.map((n) => (
            <div key={n.id} className="flex items-start gap-3 p-4">
              <Circle className={`mt-1.5 size-2.5 shrink-0 ${n.is_read ? "text-line-strong" : "fill-brand-600 text-brand-600"}`} aria-label={n.is_read ? "خوانده‌شده" : "خوانده‌نشده"} />
              <div className="min-w-0 flex-1">
                <Link href={`/listings/${n.listing_id}`} className="font-semibold hover:text-brand-700">
                  {n.title}
                </Link>
                <p className="mt-1 text-sm text-muted">{n.body}</p>
                <p className="mt-1 text-xs text-muted">{timeAgo(n.created_at)}</p>
              </div>
              <form action={markNotificationAction}>
                <input type="hidden" name="id" value={n.id} />
                <input type="hidden" name="read" value={n.is_read ? "0" : "1"} />
                <button className="rounded-lg px-3 py-1.5 text-xs text-brand-700 hover:bg-brand-50">
                  {n.is_read ? "خوانده‌نشده کن" : "خوانده شد"}
                </button>
              </form>
            </div>
          ))}
        </Card>
      )}
    </>
  );
}
