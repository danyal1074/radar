"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { saveRuleAction } from "@/app/(app)/settings/alerts/actions";
import type { ActionState } from "@/app/actions";
import { SOURCE_LABEL } from "@/lib/labels";
import type { WatchRule } from "@/lib/types";
import { Alert, Button, Field, Input, Select } from "./ui";
import { ChevronDown, Sparkles, Zap, ShieldCheck } from "lucide-react";

const QUICK_CAR_PILLS = [
  "همه خودروها",
  "پژو پارس",
  "پراید",
  "پژو ۲۰۶",
  "کوییک",
  "ساینا",
  "دنا",
  "سمند",
  "تیبا",
  "تارا",
  "شاهین",
  "هایما",
];

export function RuleForm({ rule }: { rule?: WatchRule }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveRuleAction, null);
  const [selectedMake, setSelectedMake] = useState(rule?.make ?? (rule?.model ? `${rule.make ?? ""} ${rule.model}`.trim() : ""));

  const e = state?.errors ?? {};
  const v = (n: number | null | undefined) => (n === null || n === undefined ? "" : String(n));
  const vMillion = (n: number | null | undefined) => {
    if (n === null || n === undefined) return "";
    return n >= 1_000_000 ? String(Math.round(n / 1_000_000)) : String(n);
  };

  const handlePillClick = (carName: string) => {
    if (carName === "همه خودروها") {
      setSelectedMake("");
    } else {
      setSelectedMake(carName);
    }
  };

  return (
    <form action={action} className="space-y-5 rounded-2xl border border-line bg-surface p-5 shadow-sm sm:p-6" noValidate>
      {rule && <input type="hidden" name="id" value={rule.id} />}
      {state?.message && <Alert tone={state.ok ? "good" : "bad"}>{state.message}</Alert>}

      {/* ۱. انتخاب خودرو */}
      <div>
        <label className="block text-sm font-bold text-ink mb-1.5">
          🚗 خودروی مدنظر شما
        </label>
        <Input
          name="make"
          value={selectedMake}
          onChange={(ev) => setSelectedMake(ev.target.value)}
          placeholder="مثلاً: پژو پارس، ۲۰۶، پراید یا نام خودرو..."
          className="text-base"
        />
        {e.make && <p className="mt-1 text-xs text-bad">{e.make}</p>}

        {/* دکمه‌های لمسی سریع برای گوشی */}
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {QUICK_CAR_PILLS.map((pill) => {
            const isSelected = (pill === "همه خودروها" && !selectedMake) || (selectedMake && pill.includes(selectedMake));
            return (
              <button
                key={pill}
                type="button"
                onClick={() => handlePillClick(pill)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                  isSelected
                    ? "bg-brand-600 text-white shadow-sm ring-2 ring-brand-300"
                    : "bg-paper text-ink hover:bg-line border border-line/60"
                }`}
              >
                {pill}
              </button>
            );
          })}
        </div>
      </div>

      {/* ۲. سقف بودجه و سال ساخت (۲ فیلد اصلی و روان) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          label="💰 حداکثر قیمت (میلیون تومان)"
          error={e.price_max_toman}
          hint="مثلاً ۵۰۰ بزنید معادل ۵۰۰ میلیون (خالی = بدون سقف قیمت)"
        >
          <Input
            name="price_max_toman"
            inputMode="numeric"
            defaultValue={vMillion(rule?.price_max_toman)}
            placeholder="مثلاً: ۴۵۰"
            className="text-base font-medium"
          />
        </Field>

        <Field
          label="📅 حداقل سال ساخت (مدل)"
          error={e.year_min}
          hint="مثلاً ۱۳۹۵ (خالی = تمام سال‌ها)"
        >
          <Input
            name="year_min"
            inputMode="numeric"
            defaultValue={v(rule?.year_min)}
            placeholder="مثلاً: ۱۳۹۶"
            className="text-base font-medium"
          />
        </Field>
      </div>

      {/* ۳. گزینه‌های هوشمند شکار (تاگل‌های تک‌کلیکه) */}
      <div className="rounded-xl border border-line bg-paper/50 p-3.5 sm:p-4 space-y-2.5">
        <span className="block text-xs font-bold text-ink mb-1">
          🎯 شروط هوشمند هشدار (انتخابی):
        </span>

        <label className="flex items-center gap-2.5 p-2 rounded-lg bg-surface border border-line/50 cursor-pointer hover:border-brand-300 transition-colors">
          <input
            type="checkbox"
            name="discount_only"
            defaultChecked={rule ? (rule.min_discount_percent !== null && rule.min_discount_percent > 0) : true}
            className="size-4.5 rounded text-brand-600 accent-brand-600 cursor-pointer"
          />
          <div className="flex items-center gap-1.5 text-sm font-semibold text-ink">
            <Sparkles className="size-4 text-amber-500 fill-amber-100" />
            <span>فقط آگهی‌های زیر قیمت بازار (شکار و سودآور)</span>
          </div>
        </label>

        <label className="flex items-center gap-2.5 p-2 rounded-lg bg-surface border border-line/50 cursor-pointer hover:border-brand-300 transition-colors">
          <input
            type="checkbox"
            name="urgent_only"
            defaultChecked={rule?.urgent_only ?? false}
            className="size-4.5 rounded text-brand-600 accent-brand-600 cursor-pointer"
          />
          <div className="flex items-center gap-1.5 text-sm font-semibold text-ink">
            <Zap className="size-4 text-red-500 fill-red-100" />
            <span>فقط فروش فوری و پول لازم</span>
          </div>
        </label>

        <label className="flex items-center gap-2.5 p-2 rounded-lg bg-surface border border-line/50 cursor-pointer hover:border-brand-300 transition-colors">
          <input
            type="checkbox"
            name="paint_free_only"
            defaultChecked={rule?.paint_free_only ?? false}
            className="size-4.5 rounded text-brand-600 accent-brand-600 cursor-pointer"
          />
          <div className="flex items-center gap-1.5 text-sm font-semibold text-ink">
            <ShieldCheck className="size-4 text-emerald-600 fill-emerald-100" />
            <span>فقط شاسی پلمپ و کاملاً بی‌رنگ</span>
          </div>
        </label>
      </div>

      {/* ۴. تنظیمات پیشرفته (اختیاری و بازشونده برای خلوت ماندن صفحه) */}
      <details className="group rounded-xl border border-line bg-surface">
        <summary className="flex items-center justify-between p-3.5 text-xs font-bold text-muted cursor-pointer hover:text-ink select-none">
          <span>⚙️ تنظیمات بیشتر (اختیاری)</span>
          <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
        </summary>
        <div className="p-4 pt-1 border-t border-line space-y-4">
          <Field label="نام اختصاصی هشدار" error={e.name} hint="خالی بگذارید تا خودکار نام‌گذاری شود">
            <Input name="name" defaultValue={rule?.name ?? ""} placeholder="مثلاً: شکار پژو پارس سفید" />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="تیپ / مدل دقیق" error={e.model}>
              <Input name="model" defaultValue={rule?.model ?? ""} placeholder="مثلاً: TU5، تیپ ۵، اتومات..." />
            </Field>

            <Field label="حداکثر کارکرد (کیلومتر)" error={e.mileage_max_km}>
              <Input name="mileage_max_km" inputMode="numeric" defaultValue={v(rule?.mileage_max_km)} placeholder="مثلاً: ۱۰۰,۰۰۰" />
            </Field>

            <Field label="حداقل قیمت (میلیون تومان)" error={e.price_min_toman}>
              <Input name="price_min_toman" inputMode="numeric" defaultValue={vMillion(rule?.price_min_toman)} placeholder="مثلاً: ۲۰۰" />
            </Field>

            <Field label="تا سال ساخت" error={e.year_max}>
              <Input name="year_max" inputMode="numeric" defaultValue={v(rule?.year_max)} placeholder="مثلاً: ۱۴۰۳" />
            </Field>

            <Field label="شهر" error={e.city}>
              <Input name="city" defaultValue={rule?.city ?? "تربت حیدریه"} placeholder="تربت حیدریه" />
            </Field>

            <Field label="منبع آگهی" error={e.source}>
              <Select name="source" defaultValue={rule?.source ?? "any"}>
                <option value="any">همه منابع (دیوار و شیپور)</option>
                {(["divar", "sheypoor"] as const).map((s) => (
                  <option key={s} value={s}>{SOURCE_LABEL[s]}</option>
                ))}
              </Select>
            </Field>
          </div>
        </div>
      </details>

      <input type="hidden" name="is_active" value="on" />

      {/* دکمه‌های ذخیره */}
      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" disabled={pending} className="flex-1 py-3 text-base font-bold shadow-md">
          {pending ? "در حال ذخیره…" : rule ? "ذخیره تغییرات" : "🚀 فعال‌سازی هشدار"}
        </Button>
        <Link
          href="/settings/alerts"
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-line px-5 text-sm font-medium text-muted hover:bg-paper"
        >
          انصراف
        </Link>
      </div>
    </form>
  );
}
