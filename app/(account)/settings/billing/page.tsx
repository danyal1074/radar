import type { Metadata } from "next";
import { PaymentForm } from "@/components/payment-form";
import { PricingCards } from "@/components/pricing-cards";
import { Alert, Badge, Card, PageHeader } from "@/components/ui";
import { requireContext } from "@/lib/auth";
import { env } from "@/lib/env";
import { formatDate, formatDateTime } from "@/lib/dates";
import { formatNumber, formatToman } from "@/lib/money";
import { PLANS } from "@/lib/plans";
import type { PaymentStatus } from "@/lib/types";

export const metadata: Metadata = { title: "اشتراک و پرداخت" };
export const dynamic = "force-dynamic";

const PAY_LABEL: Record<PaymentStatus, { text: string; tone: "warn" | "good" | "bad" }> = {
  pending: { text: "در انتظار تأیید", tone: "warn" },
  confirmed: { text: "تأیید شده", tone: "good" },
  rejected: { text: "رد شده", tone: "bad" },
};

export default async function BillingPage({ searchParams }: PageProps<"/settings/billing">) {
  const sp = await searchParams;
  const ctx = await requireContext();
  const payments = await ctx.store.listPayments({ userId: ctx.user.id });
  const { access } = ctx;
  const plan = PLANS[access.plan];

  return (
    <>
      <PageHeader title="اشتراک و پرداخت" description="وضعیت اشتراک، ارتقای پلن و تاریخچهٔ پرداخت‌ها" />
      <div className="space-y-4">
        {sp.expired === "1" && <Alert tone="bad">اشتراک یا دورهٔ آزمایشی شما تمام شده است. برای ادامه یک پلن انتخاب کنید.</Alert>}
        {sp.limit === "rules" && <Alert tone="warn">به سقف قوانین هشدار پلن خود رسیده‌اید. برای افزایش سقف پلن را ارتقا دهید.</Alert>}
        {sp.limit === "saved" && <Alert tone="warn">به سقف آگهی‌های ذخیره‌شدهٔ پلن خود رسیده‌اید. برای افزایش سقف پلن را ارتقا دهید.</Alert>}

        <Card className="flex flex-wrap items-center justify-between gap-3 p-5">
          <div>
            <p className="text-sm text-muted">پلن فعلی</p>
            <p className="text-lg font-bold">{plan.name}</p>
            <p className="text-sm text-muted">
              {access.hasAccess
                ? `تا ${formatDate(access.endsAt)} (${formatNumber(access.daysLeft ?? 0)} روز باقی‌مانده)`
                : "پایان‌یافته"}
            </p>
          </div>
          <Badge tone={access.hasAccess ? "good" : "bad"}>{access.hasAccess ? (access.status === "trialing" ? "دورهٔ آزمایشی" : "فعال") : "غیرفعال"}</Badge>
        </Card>

        <div className="pt-2">
          <PricingCards />
        </div>

        <Card className="p-5">
          <h2 className="mb-4 font-semibold">خرید یا تمدید اشتراک</h2>
          <PaymentForm defaultPlan={access.plan} cardNumber={env.paymentCardNumber} cardHolder={env.paymentCardHolder} support={env.supportContact} />
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 font-semibold">تاریخچهٔ پرداخت‌ها</h2>
          {payments.length === 0 ? (
            <p className="text-sm text-muted">هنوز پرداختی ثبت نشده است.</p>
          ) : (
            <ul className="divide-y divide-line text-sm">
              {payments.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                  <span>
                    {PLANS[p.plan].name}، {formatNumber(p.months)} ماهه، {formatToman(p.amount_toman)}
                    <span className="block text-xs text-muted">{formatDateTime(p.created_at)} — پیگیری: <span className="ltr-num">{p.reference}</span></span>
                  </span>
                  <Badge tone={PAY_LABEL[p.status].tone}>{PAY_LABEL[p.status].text}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
