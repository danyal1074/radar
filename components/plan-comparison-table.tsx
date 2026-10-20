"use client";

import clsx from "clsx";
import { Check, Minus, Sparkles } from "lucide-react";

interface ComparisonRow {
  category?: string;
  name: string;
  tooltip?: string;
  basic: string | boolean;
  pro: string | boolean;
  business: string | boolean;
  highlightPro?: boolean;
}

const COMPARISON_ROWS: ComparisonRow[] = [
  {
    category: "سرعت و دریافت آگهی‌ها",
    name: "سرعت پایش و ارسال هشدار",
    basic: "معمولی (با تاخیر)",
    pro: "⚡ آنی VIP (۰ ثانیه تاخیر)",
    business: "⚡ آنی VIP (۰ ثانیه تاخیر)",
    highlightPro: true,
  },
  {
    name: "ارسال تصویر واقعی خودرو در بله و تلگرام",
    basic: false,
    pro: true,
    business: true,
    highlightPro: true,
  },
  {
    name: "پوشش بازار دیوار و شیپور تربت‌حیدریه",
    basic: true,
    pro: true,
    business: true,
  },
  {
    name: "حذف خودکار آگهی‌های اسپم، فیک و حواله",
    basic: true,
    pro: true,
    business: true,
  },
  {
    category: "شکار فرصت‌های پرسود و فیلترهای فنی",
    name: "رادار آگهی‌های «فروش فوری، پول‌لازم و پاس چک»",
    basic: false,
    pro: "🔥 دارد (هوشمند)",
    business: "🔥 دارد (هوشمند)",
    highlightPro: true,
  },
  {
    name: "فیلتر شاسی پلمپ، بدون رنگ و تک‌برگ سند",
    basic: false,
    pro: true,
    business: true,
    highlightPro: true,
  },
  {
    name: "ردیاب کاهش قیمت (هشدار ارزان شدن آگهی)",
    basic: false,
    pro: true,
    business: true,
    highlightPro: true,
  },
  {
    category: "ابزارهای تخصصی معامله و نمایشگاه",
    name: "تولید بنر آماده استوری و کانال گالری با ۱ کلیک",
    basic: false,
    pro: true,
    business: true,
    highlightPro: true,
  },
  {
    name: "ماشین‌حساب هوشمند کارشناسی، قیمت روز و سود خالص",
    basic: false,
    pro: true,
    business: true,
    highlightPro: true,
  },
  {
    name: "دفترچه پیگیری وضعیت مشتری (تماس، بازدید، قولنامه)",
    basic: false,
    pro: true,
    business: true,
  },
  {
    category: "ظرفیت و پشتیبانی",
    name: "تعداد قوانین هشدار همزمان",
    basic: "۵ خودرو",
    pro: "۲۰ خودرو",
    business: "۱۰۰ خودرو",
  },
  {
    name: "سقف ذخیره آگهی در پنل شخصی",
    basic: "۱۰۰ عدد",
    pro: "۵۰۰ عدد",
    business: "۵٬۰۰۰ عدد (نامحدود)",
  },
  {
    name: "اتصال همزمان چند شماره (شرکا و پرسنل گالری)",
    basic: "۱ شماره",
    pro: "۱ شماره",
    business: "چندین شماره همزمان",
  },
  {
    name: "گزارش تحلیلی هفتگی روند بازار تربت‌حیدریه",
    basic: false,
    pro: false,
    business: true,
  },
  {
    name: "پشتیبانی اختصاصی تلفنی و VIP (حقدادی)",
    basic: "تیکت و تلگرام",
    pro: "اولویت VIP تلگرام",
    business: "تماس تلفنی مستقیم VIP",
    highlightPro: true,
  },
];

export function PlanComparisonTable() {
  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-surface shadow-sm">
      <table className="w-full text-right text-xs md:text-sm">
        <thead>
          <tr className="border-b border-line bg-paper text-ink">
            <th className="p-4 font-black text-ink md:w-1/3">قابلیت و امکانات</th>
            <th className="p-4 text-center font-bold text-muted">
              <div>پلن پایه</div>
              <div className="text-[11px] font-normal text-muted/80">۲۹۰,۰۰۰ ت/ماه</div>
            </th>
            <th className="relative p-4 text-center font-black text-brand-900 bg-brand-50/70 border-x-2 border-brand-500">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full mb-1">
                <Sparkles className="size-3" /> محبوب‌ترین
              </span>
              <div>پلن حرفه‌ای (شکارچی) ⭐</div>
              <div className="text-[11px] font-semibold text-brand-700">۷۹۰,۰۰۰ ت/ماه</div>
            </th>
            <th className="p-4 text-center font-bold text-ink">
              <div>پلن سازمانی (گالری) 🏢</div>
              <div className="text-[11px] font-normal text-muted/80">۱,۹۹۰,۰۰۰ ت/ماه</div>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line/60">
          {COMPARISON_ROWS.map((row, idx) => (
            <tr
              key={idx}
              className={clsx(
                "transition-colors hover:bg-paper/50",
                row.category && "border-t-2 border-line bg-paper/30",
              )}
            >
              <td className="p-3.5 font-medium text-ink">
                {row.category && (
                  <span className="block text-[11px] font-bold text-brand-700 mb-1">
                    {row.category}
                  </span>
                )}
                <span>{row.name}</span>
              </td>

              {/* پلن پایه */}
              <td className="p-3.5 text-center text-muted">
                {typeof row.basic === "boolean" ? (
                  row.basic ? (
                    <span className="inline-flex size-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 mx-auto">
                      <Check className="size-3.5 stroke-[3]" />
                    </span>
                  ) : (
                    <span className="inline-flex size-5 items-center justify-center rounded-full bg-paper text-muted/50 mx-auto">
                      <Minus className="size-3" />
                    </span>
                  )
                ) : (
                  <span className="font-semibold text-ink/80">{row.basic}</span>
                )}
              </td>

              {/* پلن حرفه‌ای */}
              <td className="p-3.5 text-center font-bold bg-brand-50/40 border-x-2 border-brand-500 text-ink">
                {typeof row.pro === "boolean" ? (
                  row.pro ? (
                    <span className="inline-flex size-5 items-center justify-center rounded-full bg-brand-600 text-white shadow-sm mx-auto">
                      <Check className="size-3.5 stroke-[3]" />
                    </span>
                  ) : (
                    <span className="inline-flex size-5 items-center justify-center rounded-full bg-paper text-muted/50 mx-auto">
                      <Minus className="size-3" />
                    </span>
                  )
                ) : (
                  <span className="font-bold text-brand-900">{row.pro}</span>
                )}
              </td>

              {/* پلن سازمانی */}
              <td className="p-3.5 text-center text-ink font-semibold">
                {typeof row.business === "boolean" ? (
                  row.business ? (
                    <span className="inline-flex size-5 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm mx-auto">
                      <Check className="size-3.5 stroke-[3]" />
                    </span>
                  ) : (
                    <span className="inline-flex size-5 items-center justify-center rounded-full bg-paper text-muted/50 mx-auto">
                      <Minus className="size-3" />
                    </span>
                  )
                ) : (
                  <span>{row.business}</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
