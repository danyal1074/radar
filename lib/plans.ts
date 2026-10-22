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
    name: "آزمایشی (VIP)",
    tagline: `${TRIAL_DAYS} روز هدیه رایگان دسترسی کامل به امکانات Pro`,
    priceToman: 0,
    maxActiveRules: 25,
    maxSavedListings: 500,
    opportunityScore: true,
    allowedCitiesCount: 999,
    canChangeCity: true,
    features: [
      "دسترسی کامل و نامحدود به امکانات پلن حرفه‌ای (۹۹۰ تومانی)",
      "پایش همزمان کل شهرهای خراسان رضوی 🏙️",
      "سرعت توربو آنی VIP بدون تاخیر (ثانیه اول) ⚡",
      "رادار اختصاصی خودروهای تصادفی / تعمیری / اوراقی 💥",
      "رادار آگهی‌های «پول‌لازم و فروش فوری» 🔥",
      "۲۵ قانون هشدار فعال همزمان",
      "اعلان داخل سامانه، ربات بله و تلگرام همراه با عکس 📸",
    ],
    purchasable: false,
  },
  basic: {
    id: "basic",
    name: "پایه (شروع کار)",
    tagline: "ورود به شکار خودرو در ۱ شهر انتخابی استان",
    priceToman: 490_000,
    maxActiveRules: 3,
    maxSavedListings: 100,
    opportunityScore: false,
    allowedCitiesCount: 1,
    canChangeCity: false,
    features: [
      "پایش ۱ شهر انتخابی در خراسان رضوی (مثلاً فقط مشهد یا تربت) 🏙️",
      "ثابت بودن شهر انتخابی در طول اشتراک",
      "۳ قانون هشدار فعال همزمان",
      "۱۰۰ آگهی ذخیره‌شده",
      "اعلان داخل سامانه و ربات بله",
      "مقایسه با قیمت کارشناسی روز",
      "فیلتر حذف آگهی‌های اسپم و حواله",
      "دکمه شیشه‌ای لینک مستقیم به آگهی",
    ],
    purchasable: true,
  },
  pro: {
    id: "pro",
    name: "حرفه‌ای (پلن طلایی)",
    tagline: "کل شهرهای استان + سرعت توربو + رادار تصادفی و شکار",
    priceToman: 990_000,
    maxActiveRules: 25,
    maxSavedListings: 500,
    opportunityScore: true,
    allowedCitiesCount: 999,
    canChangeCity: true,
    features: [
      "پایش همزمان کل شهرهای خراسان رضوی (مشهد، نیشابور، سبزوار، تربت و...) 🏙️",
      "سوئیچ و انتخاب آزادانه بین تمام شهرهای استان",
      "۲۵ قانون هشدار فعال (رصد کامل بازار)",
      "۵۰۰ آگهی ذخیره‌شده",
      "سرعت توربو آنی VIP بدون تاخیر (ثانیه اول) ⚡",
      "رادار اختصاصی خودروهای تصادفی / تعمیری / اوراقی 💥",
      "رادار آگهی‌های «پول‌لازم و فروش فوری» 🔥",
      "فیلتر شاسی پلمپ، بدون رنگ و تک‌برگ 🛡️",
      "ردیاب هوشمند کاهش قیمت فروشنده 📉",
      "امتیاز و درصد سود خالص فرصت خرید",
      "ماشین‌حساب هوشمند سود و کارشناسی خودرو",
      "ارسال تصویر خودرو در بله و تلگرام 📸",
    ],
    highlighted: true,
    purchasable: true,
  },
  business: {
    id: "business",
    name: "سازمانی و گالری",
    tagline: "ویژه اتوگالری‌ها، نمایشگاه‌داران بزرگ و هلدینگ‌ها",
    priceToman: 0,
    maxActiveRules: 100,
    maxSavedListings: 5_000,
    opportunityScore: true,
    allowedCitiesCount: 999,
    canChangeCity: true,
    features: [
      "دسترسی تیمی چندکاربره برای همکاران نمایشگاه",
      "پایش همزمان کل شهرهای کشور و خراسان رضوی 🏙️",
      "۱۰۰ قانون هشدار فعال همزمان",
      "۵٬۰۰۰ آگهی ذخیره‌شده",
      "تمام امکانات تحلیلی و هوش مصنوعی رادار خودرو",
      "ربات و پنل اختصاصی با برند اتوگالری شما",
      "اتصال همزمان چند خط بله، تلگرام و پیامک VIP",
      "پشتیبانی مستقیم و اختصاصی تلفنی ۲۴/۷ (حقدادی)",
    ],
    purchasable: false,
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
