"use client";

import Link from "next/link";
import { useActionState } from "react";
import { saveRuleAction } from "@/app/(app)/settings/alerts/actions";
import type { ActionState } from "@/app/actions";
import { SOURCE_LABEL } from "@/lib/labels";
import type { WatchRule } from "@/lib/types";
import { Alert, Button, Field, Input, Select } from "./ui";

const POPULAR_MAKES = [
  "پژو", "پراید", "سمند", "ساینا", "کوییک", "تیبا", "دنا", "تارا", "شاهین", "رانا",
  "هایما", "جک", "ام‌وی‌ام", "چری", "فونیکس", "لاماری", "فیدلیتی", "دیگنیتی", "کی‌ام‌سی",
  "رنو", "کیا", "هیوندای", "نیسان", "مزدا", "تویوتا", "پیکان", "برلیانس", "بسترن", "لیفان",
  "دانگ‌فنگ", "زامیاد", "سوزوکی", "بنز", "بی‌ام‌و"
];

export function RuleForm({ rule }: { rule?: WatchRule }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveRuleAction, null);
  const e = state?.errors ?? {};
  const v = (n: number | null | undefined) => (n === null || n === undefined ? "" : String(n));
  const vMillion = (n: number | null | undefined) => {
    if (n === null || n === undefined) return "";
    return n >= 1_000_000 ? String(Math.round(n / 1_000_000)) : String(n);
  };

  return (
    <form action={action} className="space-y-5 rounded-xl border border-line bg-surface p-5" noValidate>
      {rule && <input type="hidden" name="id" value={rule.id} />}
      {state?.message && <Alert tone={state.ok ? "good" : "bad"}>{state.message}</Alert>}

      <datalist id="makes-list">
        {POPULAR_MAKES.map((m) => (
          <option key={m} value={m} />
        ))}
      </datalist>

      <Field label="نام قانون" error={e.name}>
        <Input name="name" defaultValue={rule?.name} placeholder="مثلاً: شکار پژو پارس و ۲۰۶ زیر قیمت" required />
      </Field>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-sm font-semibold">مشخصات خودرو</legend>
        <Field label="خودرو (برند)" error={e.make} hint="انتخاب از لیست یا تایپ هر خودروی دلخواه">
          <Input name="make" list="makes-list" defaultValue={rule?.make ?? ""} placeholder="پژو، پراید، هایما، لاماری و..." />
        </Field>
        <Field label="مدل / تیپ" error={e.model} hint="خالی = همه مدل‌ها">
          <Input name="model" defaultValue={rule?.model ?? ""} placeholder="پارس، ۲۰۶، S، تیپ ۲ و..." />
        </Field>
        <Field label="سال از" error={e.year_min}>
          <Input name="year_min" inputMode="numeric" defaultValue={v(rule?.year_min)} placeholder="۱۳۹۵" />
        </Field>
        <Field label="سال تا" error={e.year_max}>
          <Input name="year_max" inputMode="numeric" defaultValue={v(rule?.year_max)} placeholder="۱۴۰۳" />
        </Field>
        <Field label="کارکرد از (کیلومتر)" error={e.mileage_min_km}>
          <Input name="mileage_min_km" inputMode="numeric" defaultValue={v(rule?.mileage_min_km)} placeholder="۰" />
        </Field>
        <Field label="کارکرد تا (کیلومتر)" error={e.mileage_max_km}>
          <Input name="mileage_max_km" inputMode="numeric" defaultValue={v(rule?.mileage_max_km)} placeholder="۱۵۰,۰۰۰" />
        </Field>
        <Field label="شهر" error={e.city} hint="خالی = همه شهرها">
          <Input name="city" defaultValue={rule?.city ?? ""} placeholder="تربت حیدریه، مشهد و..." />
        </Field>
        <Field label="منبع آگهی" error={e.source}>
          <Select name="source" defaultValue={rule?.source ?? "any"}>
            <option value="any">همه منابع (دیوار و شیپور)</option>
            {(["divar", "sheypoor", "manual", "sample"] as const).map((s) => (
              <option key={s} value={s}>{SOURCE_LABEL[s]}</option>
            ))}
          </Select>
        </Field>
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-sm font-semibold">بودجه و قیمت (به میلیون تومان — بدون نیاز به شمردن صفرها)</legend>
        <Field label="حداقل قیمت (میلیون تومان)" error={e.price_min_toman} hint="مثلاً ۳۰۰ = ۳۰۰ میلیون">
          <Input name="price_min_toman" inputMode="numeric" defaultValue={vMillion(rule?.price_min_toman)} placeholder="مثلاً ۳۰۰" />
        </Field>
        <Field label="حداکثر قیمت (میلیون تومان)" error={e.price_max_toman} hint="مثلاً ۷۰۰ = ۷۰۰ میلیون">
          <Input name="price_max_toman" inputMode="numeric" defaultValue={vMillion(rule?.price_max_toman)} placeholder="مثلاً ۷۰۰" />
        </Field>
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-sm font-semibold">شرط شکار و تخفیف نسبت به بازار</legend>
        <Field label="حداقل درصد ارزان‌تر بودن از بازار" error={e.min_discount_percent} hint="خالی = تمام آگهی‌های منطبق بر مشخصات">
          <Input name="min_discount_percent" inputMode="decimal" defaultValue={v(rule?.min_discount_percent)} placeholder="اختیاری؛ مثلاً ۱۰" />
        </Field>
        <Field label="حداقل اختلاف قیمت زیر بازار (میلیون تومان)" error={e.min_discount_toman} hint="اختیاری؛ مثلاً ۵۰ معادل ۵۰ میلیون تومان سود">
          <Input name="min_discount_toman" inputMode="numeric" defaultValue={vMillion(rule?.min_discount_toman)} placeholder="مثلاً ۵۰" />
        </Field>
      </fieldset>

      <fieldset className="rounded-xl border border-brand-200 bg-brand-50/40 p-4 space-y-3">
        <legend className="px-2 text-xs font-bold text-brand-900">
          🎯 فیلترهای ویژه نمایشگاه‌داران و خریداران حرفه‌ای
        </legend>
        
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            name="urgent_only"
            defaultChecked={rule?.urgent_only ?? false}
            className="size-4.5 mt-0.5 rounded border-line text-brand-600 focus:ring-brand-500 accent-brand-600 cursor-pointer"
          />
          <div>
            <span className="text-sm font-bold text-ink">🚨 فقط فروش فوری و پول لازم</span>
            <p className="text-xs text-muted mt-0.5">
              فقط آگهی‌هایی که در عنوان یا متن اعلام کرده‌اند: «فروش فوری»، «پول لازم»، «زیر قیمت بازار»، «مهاجرت» و...
            </p>
          </div>
        </label>

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            name="paint_free_only"
            defaultChecked={rule?.paint_free_only ?? false}
            className="size-4.5 mt-0.5 rounded border-line text-brand-600 focus:ring-brand-500 accent-brand-600 cursor-pointer"
          />
          <div>
            <span className="text-sm font-bold text-ink">🛡️ فقط شاسی پلمپ و کاملاً بی‌رنگ</span>
            <p className="text-xs text-muted mt-0.5">
              فقط خودروهای بکر، بی‌رنگ و با شاسی کاملاً سالم و پلمپ (حذف خودکار موارد دور رنگ، تصادفی، ضربه‌دار و تعویض اتاق)
            </p>
          </div>
        </label>
      </fieldset>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="is_active" defaultChecked={rule?.is_active ?? true} className="size-4 accent-brand-600" />
        قانون فعال باشد
      </label>

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "در حال ذخیره…" : rule ? "ذخیره تغییرات" : "ساخت قانون"}
        </Button>
        <Link href="/settings/alerts" className="inline-flex min-h-10 items-center rounded-lg px-4 text-sm text-muted hover:bg-paper">
          انصراف
        </Link>
      </div>
    </form>
  );
}
