"use client";

import { useActionState, useMemo, useState } from "react";
import { requestPaymentAction } from "@/app/(account)/settings/billing/actions";
import { Alert, Button, Field, Input, Textarea } from "@/components/ui";
import { formatNumber, formatToman } from "@/lib/money";
import { DURATION_OPTIONS, PURCHASABLE_PLANS, planPrice } from "@/lib/plans";
import type { PlanId } from "@/lib/types";

export function PaymentForm({ defaultPlan, cardNumber, cardHolder, support }: { defaultPlan: PlanId; cardNumber: string; cardHolder: string; support: string }) {
  const [state, action, pending] = useActionState(requestPaymentAction, null);
  const [plan, setPlan] = useState<PlanId>(defaultPlan === "trial" ? "pro" : defaultPlan);
  const [months, setMonths] = useState(1);
  const amount = useMemo(() => planPrice(plan as Exclude<PlanId, "trial">, months), [plan, months]);
  const configured = Boolean(cardNumber);

  return (
    <form action={action} className="space-y-5">
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">پلن</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {PURCHASABLE_PLANS.map((p) => (
            <label key={p.id} className={`cursor-pointer rounded-lg border p-3 text-sm ${plan === p.id ? "border-brand-600 bg-brand-50" : "border-line-strong"}`}>
              <input type="radio" name="plan" value={p.id} checked={plan === p.id} onChange={() => setPlan(p.id)} className="sr-only" />
              <span className="block font-semibold">{p.name}</span>
              <span className="text-xs text-muted">{formatToman(p.priceToman)} / ماه</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">مدت</legend>
        <div className="flex flex-wrap gap-2">
          {DURATION_OPTIONS.map((d) => (
            <label key={d.months} className={`cursor-pointer rounded-lg border px-4 py-2 text-sm ${months === d.months ? "border-brand-600 bg-brand-50" : "border-line-strong"}`}>
              <input type="radio" name="months" value={d.months} checked={months === d.months} onChange={() => setMonths(d.months)} className="sr-only" />
              {d.label}
              {d.discountPercent > 0 && <span className="ms-1 text-xs text-good-700">({formatNumber(d.discountPercent)}٪ تخفیف)</span>}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="rounded-lg bg-paper p-4 text-sm">
        <p>
          مبلغ قابل پرداخت: <strong className="text-base">{formatToman(amount)}</strong>
        </p>
        {configured ? (
          <p className="mt-2 text-muted">
            مبلغ را کارت‌به‌کارت به شمارهٔ <span className="ltr-num font-bold text-ink">{cardNumber}</span>
            {cardHolder && <> به نام <strong>{cardHolder}</strong></>} واریز کنید و ۴ رقم آخر کارت خود را در کادر زیر وارد کنید تا مدیر بلافاصله حساب شما را فعال کند.
          </p>
        ) : (
          <p className="mt-2 text-bad-600">شمارهٔ کارت مقصد هنوز توسط مدیر سامانه تنظیم نشده است. لطفاً با پشتیبانی تماس بگیرید{support ? `: ${support}` : "."}</p>
        )}
        <p className="mt-2 text-xs text-muted">تأیید پرداخت‌ها توسط مدیریت انجام شده و بلافاصله پس از تایید، اشتراک و امکانات پنل ارتقا می‌یابد.</p>
        <p className="mt-2 text-xs font-medium text-ink">📞 تماس و پشتیبانی: <span className="ltr-num font-bold text-brand-700">{support || "09999212209"}</span> (حقدادی)</p>
      </div>

      <Field label="۴ رقم آخر کارت واریزکننده (یا کد پیگیری)" error={state?.errors?.reference}>
        <Input name="reference" placeholder="مثلاً: ۵۰۵۲" required minLength={4} maxLength={60} inputMode="numeric" autoComplete="off" disabled={!configured} />
      </Field>
      <Field label="توضیح (اختیاری)">
        <Textarea name="note" maxLength={300} className="min-h-16" disabled={!configured} />
      </Field>

      {state?.message && <Alert tone={state.ok ? "good" : "bad"}>{state.message}</Alert>}
      <Button type="submit" disabled={pending || !configured}>
        {pending ? "در حال ثبت…" : "ثبت پرداخت"}
      </Button>
    </form>
  );
}
