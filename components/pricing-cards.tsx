"use client";

import clsx from "clsx";
import Link from "next/link";
import {
  Check,
  Sparkles,
} from "lucide-react";

interface PlanItem {
  id: string;
  name: string;
  badge?: string;
  targetUser: string;
  tagline: string;
  priceToman: number;
  highlighted?: boolean;
  baseFeaturesTitle?: string;
  features: { text: string; icon?: string; bold?: boolean; isNew?: boolean }[];
  limitations?: string[];
}

const DETAILED_PLANS: PlanItem[] = [
  {
    id: "basic",
    name: "پلن پایه (شروع کار)",
    badge: "ورود کم‌هزینه در ۱ شهر",
    targetUser: "مناسب خریداران شخصی، تعویض خودرو و مصرف‌کنندگان تک‌شهر",
    tagline: "ابزار ضروری برای دیده‌بانی بازار در ۱ شهر انتخابی استان بدون نیاز به چک مداوم دیوار",
    priceToman: 490_000,
    features: [
      { text: "پایش ۱ شهر انتخابی در استان خراسان رضوی (مثلاً فقط مشهد یا فقط تربت)", bold: true },
      { text: "۳ قانون هشدار فعال همزمان", bold: true },
      { text: "اعلان متنی به ربات بله و تلگرام به همراه دکمه شیشه‌ای لینک مستقیم" },
      { text: "فیلتر هوشمند حذف آگهی‌های اسپم، حواله و متفرقه" },
      { text: "مقایسه قیمت هر آگهی با نرخ کارشناسی روز بازار" },
      { text: "امکان ذخیره تا ۱۰۰ آگهی در پنل شخصی" },
    ],
    limitations: [
      "محدود به ۱ شهر انتخابی در استان",
      "فاقد رادار اختصاصی خودروهای تصادفی و شکار لحظه‌ای",
    ],
  },
  {
    id: "pro",
    name: "پلن حرفه‌ای (طلایی) ⭐",
    badge: "⭐ پیشنهاد رادار / محبوب‌ترین انتخاب بازار",
    targetUser: "مخصوص معامله‌گران حرفه‌ای، گالری‌داران و دلالان باهوش استان",
    tagline: "«کافیست در ماه یک ماشین ارزان شکار کنید تا سود آن چند سال هزینه پلن را جبران کند!»",
    priceToman: 990_000,
    highlighted: true,
    baseFeaturesTitle: "شامل تمام امکانات پلن پایه، به‌علاوه ابزارهای تخصصی زیر:",
    features: [
      {
        text: "🏙️ پایش همزمان کل شهرهای خراسان رضوی (مشهد، نیشابور، سبزوار، تربت و...)",
        bold: true,
        isNew: true,
      },
      {
        text: "⚡ سرعت توربو آنی VIP بدون تاخیر (ثانیه اول): دریافت آگهی قبل از بقیه رقبا!",
        bold: true,
        isNew: true,
      },
      {
        text: "💥 رادار اختصاصی خودروهای تصادفی / تعمیری / اوراقی (مخصوص صافکارها و معامله‌گران)",
        bold: true,
        isNew: true,
      },
      {
        text: "🔥 رادار آگهی‌های «پول‌لازم، فروش فوری و پاس چک»: کشف خودکار فرصت‌های اضطراری زیر قیمت",
        bold: true,
        isNew: true,
      },
      {
        text: "📸 ارسال تصویر واقعی خودرو در بله و تلگرام برای ارزیابی چشمی فوری",
        bold: true,
      },
      {
        text: "🛡️ فیلتر شاسی پلمپ، بدون رنگ و تک‌برگ سند (فقط خودروهای بکر و درجه یک)",
        bold: true,
      },
      {
        text: "📉 ردیاب کاهش قیمت: هشدار فوری به محض اینکه فروشنده قیمت را پایین بیاورد",
        bold: true,
        isNew: true,
      },
      {
        text: "🎯 ۲۵ قانون هشدار همزمان برای رصد تمام خودروهای سبک بازار",
        bold: true,
      },
      {
        text: "🧮 ماشین‌حساب هوشمند سود: محاسبه تخمین سود خالص با کسر خواب پول و کمیسیون",
      },
      {
        text: "📝 دفترچه ثبت یادداشت و وضعیت پیگیری مشتری (تماس، قرار بازدید، قولنامه)",
      },
    ],
  },
  {
    id: "business",
    name: "پلن سازمانی و گالری 🏢",
    badge: "تماس تلفنی جهت فعال‌سازی",
    targetUser: "مناسب گالری‌های بزرگ، مدیران دارای چند شعبه و سرمایه‌گذاران بازار",
    tagline: "مدیریت جامع شکار خودرو برای مجموعه‌هایی که چند شریک یا کارمند دارند",
    priceToman: 0,
    baseFeaturesTitle: "شامل تمام امکانات پلن حرفه‌ای (VIP)، به‌علاوه قابلیت‌های تیمی:",
    features: [
      {
        text: "👥 اتصال همزمان چند شماره بله و تلگرام: ارسال آگهی‌ها به چند شریک و کارمند گالری",
        bold: true,
        isNew: true,
      },
      {
        text: "🎯 ۱۰۰ قانون هشدار فعال همزمان (پوشش کامل سواری، وانت، کراس‌اوور و شاسی‌بلند)",
        bold: true,
      },
      {
        text: "امکان ذخیره نامحدود تا ۵٬۰۰۰ آگهی در دیتابیس اختصاصی",
      },
      {
        text: "📊 گزارش‌های تحلیلی هفتگی از روند عرضه و تقاضا در بازار خودروی شهر",
      },
      {
        text: "📞 خط پشتیبانی مستقیم و تلفنی VIP با مدیریت (حقدادی)",
        bold: true,
      },
    ],
  },
];

export function PricingCards({ showActionButtons = false }: { showActionButtons?: boolean }) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 items-stretch">
      {DETAILED_PLANS.map((plan) => (
        <div
          key={plan.id}
          className={clsx(
            "relative flex flex-col justify-between rounded-2xl p-6 transition-all duration-200",
            plan.highlighted
              ? "border-2 border-brand-500 bg-gradient-to-b from-brand-50/40 via-surface to-surface shadow-xl ring-4 ring-brand-500/10 lg:-translate-y-2"
              : "border border-line bg-surface shadow-sm hover:border-line-strong hover:shadow-md",
          )}
        >
          {/* نشان بالای کارت برای پلن ویژه */}
          {plan.highlighted && (
            <div className="absolute -top-3.5 inset-x-0 mx-auto w-fit">
              <span className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-1 text-xs font-black text-white shadow-md">
                <Sparkles className="size-3.5 fill-white" />
                {plan.badge}
              </span>
            </div>
          )}

          <div>
            {/* عنوان و مخاطب */}
            <div className="border-b border-line/70 pb-4">
              {!plan.highlighted && plan.badge && (
                <span className="inline-block rounded-md bg-paper px-2.5 py-0.5 text-[11px] font-semibold text-muted border border-line mb-2">
                  {plan.badge}
                </span>
              )}
              <h3 className="text-xl font-black text-ink">{plan.name}</h3>
              <p className="mt-1.5 text-xs font-semibold text-brand-700 leading-relaxed">
                {plan.targetUser}
              </p>
              <p className="mt-2 text-xs text-muted leading-relaxed">{plan.tagline}</p>
            </div>

            {/* قیمت */}
            <div className="py-4 border-b border-line/70">
              <span className="text-xs text-muted block mb-1">هزینه اشتراک ماهانه:</span>
              <div className="flex items-baseline gap-1.5">
                {plan.priceToman > 0 ? (
                  <>
                    <span className="text-3xl font-black tracking-tight text-brand-800">
                      {new Intl.NumberFormat("fa-IR").format(plan.priceToman)}
                    </span>
                    <span className="text-xs font-medium text-muted">تومان / ماه</span>
                  </>
                ) : (
                  <span className="text-2xl font-black tracking-tight text-brand-800">
                    تماس بگیرید
                  </span>
                )}
              </div>
            </div>

            {/* لیست ویژگی‌ها */}
            <div className="pt-4 space-y-3">
              {plan.baseFeaturesTitle && (
                <p className="text-xs font-bold text-brand-900 bg-brand-50/80 rounded-lg p-2 border border-brand-200">
                  {plan.baseFeaturesTitle}
                </p>
              )}

              <ul className="space-y-2.5 text-xs text-ink/90 leading-relaxed">
                {plan.features.map((f, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span
                      className={clsx(
                        "flex size-4 shrink-0 items-center justify-center rounded-full mt-0.5",
                        plan.highlighted
                          ? "bg-brand-600 text-white"
                          : "bg-emerald-100 text-emerald-700",
                      )}
                    >
                      <Check className="size-2.5 stroke-[3]" />
                    </span>
                    <span className={clsx(f.bold && "font-bold text-ink")}>{f.text}</span>
                  </li>
                ))}
              </ul>

              {/* محدودیت‌های پلن پایه (برای تشویق شفاف به پلن حرفه‌ای) */}
              {plan.limitations && (
                <div className="mt-4 pt-3 border-t border-dashed border-line space-y-1.5">
                  <p className="text-[11px] font-semibold text-muted">تفاوت با پلن حرفه‌ای:</p>
                  {plan.limitations.map((lim, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 text-[11px] text-muted">
                      <span className="text-amber-500 font-bold">⚠️</span>
                      <span>{lim}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* دکمه اقدام (در صورت نمایش) */}
          {showActionButtons && (
            <div className="mt-6 pt-4 border-t border-line">
              <Link
                href="/register"
                className={clsx(
                  "block w-full py-2.5 px-4 text-center rounded-xl text-sm font-bold transition-all shadow-sm",
                  plan.highlighted
                    ? "bg-brand-600 hover:bg-brand-700 text-white shadow-brand-500/25 ring-2 ring-brand-500/30"
                    : "bg-paper hover:bg-surface border border-line text-ink hover:border-brand-300",
                )}
              >
                {plan.highlighted ? "🚀 شروع ۱۴ روز تست رایگان (پلن شکارچی)" : "ثبت‌نام و شروع رایگان"}
              </Link>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
