/**
 * فیلتر اختصاصی آگهی‌های حواله، خریدار و موارد اسپم
 * طبق دستور کاربر: آگهی‌هایی که ممکن است صفر اضافه داشته باشند حذف نمی‌شوند تا هیچ آگهی واقعی از دست نرود.
 */

export interface JunkCheckResult {
  isJunk: boolean;
  reason?: string;
}

export const JUNK_KEYWORDS = [
  "فیش",
  "فروش فیش",
  "فیش ثبت نام",
  "فیش ثبت‌نام",
  "کارتکس",
  "حواله",
  "دعوتنامه",
  "دعوت نامه",
  "ثبت نام",
  "ثبت‌نام",
  "امتیاز",
  "پیش فروش",
  "پیش‌فروش",
  "قرعه کشی",
  "قرعه‌کشی",
  "طرح مادران",
  "طرح فرسوده",
  "سهمیه",
  "خریدار",
  "خریداریم",
  "خریدارم",
  "خریدار واقعی",
  "نیازمند",
  "نیازمند خودرو",
  "معاوضه با ملک",
  "معاوضه با زمین",
  "معاوضه با اپارتمان",
  "معاوضه با آپارتمان",
  "معاوضه با باغ",
  "معاوضه با خانه",
  "معاوضه با مغازه",
  "معاوضه با واحد",
  "اوراقی",
  "اسقاطی",
];

export function isJunkOrUnrealisticListing(listing: {
  title: string;
  price_toman: number;
  make?: string | null;
  model?: string | null;
  year?: number | null;
}): JunkCheckResult {
  const title = (listing.title || "").trim();
  const lowerTitle = title.toLowerCase();
  const price = Number(listing.price_toman) || 0;

  // ۱. عنوان‌های نامعتبر یا مبهم
  if (title.length < 4 || title === "ماشین" || title === "خودرو") {
    return { isJunk: true, reason: "عنوان آگهی نامشخص یا بسیار کوتاه است" };
  }

  // ۲. کلیدواژه‌های مشخص حواله، دعوتنامه، خریدار یا معاوضه با املاک
  for (const kw of JUNK_KEYWORDS) {
    if (lowerTitle.includes(kw)) {
      return { isJunk: true, reason: `شامل کلیدواژه حواله یا غیرخودرویی: ${kw}` };
    }
  }

  // ۳. حداقل کف قیمت برای فیلتر ودیعه‌های نمادین و پیش‌پرداخت‌های صوری (زیر ۱۰ میلیون تومان)
  if (price > 0 && price < 10_000_000) {
    return { isJunk: true, reason: "قیمت کمتر از ۱۰ میلیون تومان (مبلغ ودیعه یا نمادین)" };
  }

  // طبق دستور کاربر: هیچ فیلتر سقف قیمتی یا صفرهای اضافه اعمال نمی‌شود تا هیچ آگهی واقعی حذف نگردد.
  return { isJunk: false };
}
