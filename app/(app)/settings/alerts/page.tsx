import type { Metadata } from "next";
import Link from "next/link";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { BotLinkCard } from "@/components/bot-link-card";
import { RuleForm } from "@/components/rule-form";
import { Alert, Badge, Card, EmptyState, LinkButton, PageHeader } from "@/components/ui";
import { requireContext } from "@/lib/auth";
import { getUserLinkStatus } from "@/lib/bot-linker";
import { SOURCE_LABEL } from "@/lib/labels";
import { formatNumber, formatTomanCompact, formatYear } from "@/lib/money";
import { PLANS } from "@/lib/plans";
import type { WatchRule } from "@/lib/types";
import { deleteRuleAction, toggleRuleAction } from "./actions";

export const metadata: Metadata = { title: "هشدارهای من" };
export const dynamic = "force-dynamic";

function summary(r: WatchRule): string {
  const parts: string[] = [];
  if (r.make || r.model) parts.push(`${r.make ?? ""} ${r.model ?? ""}`.trim());
  if (r.year_min || r.year_max) parts.push(`سال ${r.year_min ? formatYear(r.year_min) : "…"} تا ${r.year_max ? formatYear(r.year_max) : "…"}`);
  if (r.price_max_toman) parts.push(`حداکثر ${formatTomanCompact(r.price_max_toman)}`);
  if (r.mileage_max_km) parts.push(`تا ${formatNumber(r.mileage_max_km)} کیلومتر`);
  if (r.city) parts.push(r.city);
  if (r.source) parts.push(SOURCE_LABEL[r.source]);
  return parts.join("، ") || "همه خودروها";
}

export default async function AlertsPage({ searchParams }: PageProps<"/settings/alerts">) {
  const sp = await searchParams;
  const ctx = await requireContext({ access: true });
  const rules = await ctx.store.listRules(ctx.user.id);
  const plan = PLANS[ctx.access.plan];
  const userCity = ctx.profile.city?.includes("مشهد") ? "مشهد" : "تربت‌حیدریه";
  const allowedCitiesCount = ctx.profile.role === "admin" ? 2 : plan.allowedCitiesCount;
  const editing = typeof sp.edit === "string" ? rules.find((r) => r.id === sp.edit) : undefined;
  const showForm = sp.new === "1" || !!editing;
  const active = rules.filter((r) => r.is_active).length;
  const linkStatus = await getUserLinkStatus(ctx.user.id);

  return (
    <>
      <PageHeader
        title="هشدارهای من"
        description={`قانون بسازید تا اگر خودرویی مطابق شرایط شما ثبت شد، فوری پیام بگیرید. ${formatNumber(active)} از ${formatNumber(plan.maxActiveRules)} قانون فعال استفاده شده.`}
        actions={
          !showForm && (
            <LinkButton href="/settings/alerts?new=1">
              <Plus className="size-4" aria-hidden /> قانون جدید
            </LinkButton>
          )
        }
      />
      {sp.saved === "1" && (
        <div className="mb-4">
          <Alert tone="good">قانون ذخیره شد و آگهی‌های فعلی با آن بررسی شدند.</Alert>
        </div>
      )}

      <BotLinkCard
        code={linkStatus.code}
        isBaleLinked={linkStatus.isBaleLinked}
        isTelegramLinked={linkStatus.isTelegramLinked}
      />

      {showForm && (
        <div className="mb-6">
          <RuleForm rule={editing} userCity={userCity} allowedCitiesCount={allowedCitiesCount} />
        </div>
      )}

      {rules.length === 0 && !showForm ? (
        <EmptyState
          title="هنوز قانونی نساخته‌اید"
          body="مثال: پراید ۱۳۱ مدل ۱۳۹۹، حداکثر ۴۰۰ میلیون تومان، هشدار اگر قیمت آگهی دست‌کم ۱۰ درصد زیر تخمین روز باشد."
          action={<LinkButton href="/settings/alerts?new=1">ساخت اولین قانون</LinkButton>}
        />
      ) : (
        <div className="space-y-3">
          {rules.map((r) => (
            <Card key={r.id} className="flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold">{r.name}</h3>
                  <Badge tone={r.is_active ? "good" : "neutral"}>{r.is_active ? "فعال" : "غیرفعال"}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted">{summary(r)}</p>
                <p className="mt-0.5 text-xs text-muted">
                  هشدار وقتی:{" "}
                  {[
                    r.min_discount_percent !== null && r.min_discount_percent > 0 ? `حداقل ${formatNumber(r.min_discount_percent)}٪ زیر تخمین` : null,
                    r.min_discount_toman !== null && r.min_discount_toman > 0 ? `حداقل ${formatTomanCompact(r.min_discount_toman)} اختلاف` : null,
                  ]
                    .filter(Boolean)
                    .join(" و ") || "همه آگهی‌های منطبق بر شرایط"}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <form action={toggleRuleAction}>
                  <input type="hidden" name="id" value={r.id} />
                  <input type="hidden" name="active" value={r.is_active ? "0" : "1"} />
                  <button className="min-h-9 rounded-lg border border-line-strong px-3 text-sm hover:bg-paper">{r.is_active ? "غیرفعال کن" : "فعال کن"}</button>
                </form>
                <Link href={`/settings/alerts?edit=${r.id}`} className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-line-strong px-3 text-sm hover:bg-paper">
                  <Pencil className="size-3.5" aria-hidden /> ویرایش
                </Link>
                <form action={deleteRuleAction}>
                  <input type="hidden" name="id" value={r.id} />
                  <button className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-line-strong px-3 text-sm text-bad-600 hover:bg-bad-50" aria-label={`حذف ${r.name}`}>
                    <Trash2 className="size-3.5" aria-hidden /> حذف
                  </button>
                </form>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
