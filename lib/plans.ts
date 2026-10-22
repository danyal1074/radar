import type { PlanId, Subscription } from "./types";

/**
 * Subscription plans. Prices are PLACEHOLDERS (integer toman / month) that you
 * should set to your real pricing before launch. They are read in one place so
 * changing them requires no other code change.
 */
export interface PlanDef {
  id: PlanId;
  name: string;
  tagline: string;
  priceToman: number; // per month; 0 for trial
  maxActiveRules: number;
  maxSavedListings: number;
  /** opportunity score (0-100) visible + sortable */
  opportunityScore: boolean;
  allowedCitiesCount: number; // 1 for trial/basic, 2 for pro/business
  canChangeCity: boolean; // false for trial/basic, true for pro/business
  features: string[];
  highlighted?: boolean;
  purchasable: boolean;
}

export const TRIAL_DAYS = 14;

export const PLANS: Record<PlanId, PlanDef> = {
  trial: {
    id: "trial",
    name: "آزمایشی",
    tagline: `${TRIAL_DAYS} روز هدیه رایگان جهت تست`,
    priceToman: 0,
    maxActiveRules: 2,
    maxSavedListings: 20,
    opportunityScore: true,
    allowedCitiesCount: 1,
    canChangeCity: false,
    features: [
      "۲ قانون هشدار فعال",
      "۲۰ آگهی ذخیره‌شده",
      "اعلان داخل سامانه و ربات بله",
      "پایش ۱ شهر انتخابی (تربت‌حیدریه یا مشهد)",
      "ثابت بودن شهر در طول دوره آزمایشی",
    ],
    purchasable: false,
  },
  basic: {
    id: "basic",
    name: "پایه (شروع کار)",
    tagline: "ورود آسان به شکار خودرو با هزینه اندک",
    priceToman: 290_000,
    maxActiveRules: 5,
    maxSavedListings: 100,
    opportunityScore: false,
    allowedCitiesCount: 1,
    canChangeCity: false,
    features: [
      "۵ قانون هشدار فعال همزمان",
      "۱۰۰ آگهی ذخیره‌شده",
      "پایش ۱ شهر انتخابی (تربت‌حیدریه یا مشهد)",
      "اعلان داخل سامانه و ربات بله",
      "مقایسه با قیمت کارشناسی روز",
      "فیلتر حذف آگهی‌های اسپم و حواله",
      "دکمه شیشه‌ای لینک مستقیم به آگهی",
    ],
    purchasable: true,
  },
  pro: {
    id: "pro",
    name: "حرفه‌ای (پلن پرطرفدار)",
    tagline: "ابزار تخصصی و سودآور نمایشگاه‌داران فعال",
    priceToman: 790_000,
    maxActiveRules: 20,
    maxSavedListings: 500,
    opportunityScore: true,
    allowedCitiesCount: 2,
    canChangeCity: true,
    features: [
      "پایش همزمان هر ۲ شهر (تربت‌حیدریه + مشهد) 🏙️",
      "تغییر و سوئیچ آزادانه بین شهرها",
      "۲۰ قانون هشدار فعال (رصد کل بازار)",
      "۵۰۰ آگهی ذخیره‌شده",
      "سرعت آنی VIP بدون تاخیر (ثانیه اول)",
      "ارسال تصویر خودرو در بله و تلگرام",
      "رادار آگهی‌های «پول‌لازم و فروش فوری» 🔥",
      "فیلتر شاسی پلمپ، بدون رنگ و تک‌برگ 🛡️",
      "ردیاب هوشمند کاهش قیمت فروشنده 📉",
      "امتیاز و درصد سود خالص فرصت خرید",
      "ماشین‌حساب هوشمند سود و کارشناسی خودرو",
    ],
    highlighted: true,
    purchasable: true,
  },
  business: {
    id: "business",
    name: "سازمانی و گالری",
    tagline: "برای اتوگالری‌های بزرگ، مدیران و هلدینگ‌ها",
    priceToman: 1_990_000,
    maxActiveRules: 100,
    maxSavedListings: 5_000,
    opportunityScore: true,
    allowedCitiesCount: 2,
    canChangeCity: true,
    features: [
      "پایش همزمان هر ۲ شهر (تربت‌حیدریه + مشهد) 🏙️",
      "۱۰۰ قانون هشدار فعال همزمان",
      "۵٬۰۰۰ آگهی ذخیره‌شده",
      "تمام امکانات تحلیلی و هوش مصنوعی پلن Pro",
      "اتصال چند شماره بله و تلگرام همکاران",
      "گزارش‌های جامع تحلیلی بازار خودرو خراسان",
      "پشتیبانی مستقیم و اختصاصی تلفنی (حقدادی)",
    ],
    purchasable: true,
  },
};

export const PURCHASABLE_PLANS = (Object.values(PLANS) as PlanDef[]).filter(
  (p) => p.purchasable,
);

export const DURATION_OPTIONS: { months: number; label: string; discountPercent: number }[] = [
  { months: 1, label: "۱ ماهه", discountPercent: 0 },
  { months: 3, label: "۳ ماهه", discountPercent: 5 },
  { months: 12, label: "۱۲ ماهه", discountPercent: 15 },
];

export function planPrice(planId: PlanId, months: number): number {
  const plan = PLANS[planId];
  const opt = DURATION_OPTIONS.find((d) => d.months === months);
  if (!plan || !plan.purchasable || !opt) {
    throw new RangeError("پلن یا مدت نامعتبر است");
  }
  const gross = plan.priceToman * months;
  return Math.round(gross * (1 - opt.discountPercent / 100));
}

export interface Access {
  hasAccess: boolean;
  plan: PlanId;
  status: Subscription["status"];
  /** ISO date when access ends (trial end or period end) */
  endsAt: string | null;
  daysLeft: number | null;
  reason?: "no_subscription" | "expired" | "canceled";
}

/** Single source of truth for "can this account use the product right now". */
export function resolveAccess(sub: Subscription | null, now: Date = new Date()): Access {
  if (!sub) {
    return { hasAccess: false, plan: "trial", status: "expired", endsAt: null, daysLeft: null, reason: "no_subscription" };
  }
  if (sub.status === "canceled") {
    return { hasAccess: false, plan: sub.plan, status: "canceled", endsAt: null, daysLeft: null, reason: "canceled" };
  }
  const endsAt = sub.status === "trialing" ? sub.trial_ends_at : sub.current_period_end;
  if (!endsAt) {
    return { hasAccess: false, plan: sub.plan, status: "expired", endsAt: null, daysLeft: null, reason: "expired" };
  }
  const ms = new Date(endsAt).getTime() - now.getTime();
  if (ms <= 0) {
    return { hasAccess: false, plan: sub.plan, status: "expired", endsAt, daysLeft: 0, reason: "expired" };
  }
  return {
    hasAccess: true,
    plan: sub.plan,
    status: sub.status,
    endsAt,
    daysLeft: Math.ceil(ms / 86_400_000),
  };
}

export function addMonths(from: Date, months: number): Date {
  const d = new Date(from.getTime());
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
}
