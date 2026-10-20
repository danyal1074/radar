import { formatToman } from "./money";
import type { Listing } from "./types";

/**
 * ماژول استخراج اطلاعات طلایی، وضعیت شاسی و بدنه و تولید بنر نمایشگاهی
 */

export interface ListingAnalysis {
  isUrgent: boolean;
  urgentReason?: string;
  hasIntactChassis: boolean;
  isPaintless: boolean;
  isSingleOwner: boolean;
  isStaffCar: boolean;
  tags: string[];
}

const URGENT_PATTERNS = [
  { re: /پول\s*لازم/i, label: "پول‌لازم" },
  { re: /فروش\s*فوری/i, label: "فروش فوری" },
  { re: /چک\s*دارم/i, label: "به دلیل پاس چک" },
  { re: /تخفیف\s*(پای\s*معامله|خوب|عالی|ویژه)/i, label: "تخفیف پای قولنامه" },
  { re: /زیر\s*قیمت/i, label: "زیر قیمت بازار" },
  { re: /مهاجرت/i, label: "فروش به دلیل مهاجرت" },
  { re: /نیاز\s*مالی/i, label: "به دلیل نیاز مالی" },
  { re: /فرصت\s*استثنایی/i, label: "فرصت استثنایی" },
];

export function analyzeListingContent(title: string = "", description: string = ""): ListingAnalysis {
  const text = `${title} ${description}`.toLowerCase();

  const isPaintless = /بدون\s*رنگ|بی\s*رنگ|بی‌رنگ|فاقد\s*رنگ/.test(text);
  const hasIntactChassis = /شاسی\s*(سالم|پلمپ|پلمب|دست نخورده|بدون ضربه)|سر\s*شاسی\s*سالم/.test(text);
  const isSingleOwner = /تک\s*برگ|تک‌برگ|یک\s*دست/.test(text);
  const isStaffCar = /کارمندی|خانگی|کم\s*کارکرد|مشابه\s*صفر/.test(text);

  let isUrgent = false;
  let urgentReason: string | undefined;

  for (const p of URGENT_PATTERNS) {
    if (p.re.test(text)) {
      isUrgent = true;
      urgentReason = p.label;
      break;
    }
  }

  const tags: string[] = [];
  if (isUrgent) tags.push(`🔥 ${urgentReason || "فروش فوری"}`);
  if (isPaintless) tags.push("🛡️ بدون رنگ");
  if (hasIntactChassis) tags.push("✅ شاسی پلمپ");
  if (isSingleOwner) tags.push("📄 سند تک‌برگ");
  if (isStaffCar) tags.push("⭐ کارمندی / تمیز");

  return {
    isUrgent,
    urgentReason,
    hasIntactChassis,
    isPaintless,
    isSingleOwner,
    isStaffCar,
    tags,
  };
}

/**
 * تولید بنر شیک و آماده جهت کپی در کانال تلگرام یا استوری پیج نمایشگاه
 */
export function generateShowroomBanner(
  listing: Listing,
  options: {
    showroomName?: string;
    contactNumber?: string;
  } = {},
): string {
  const name = options.showroomName || "نمایشگاه تخصصی خودرو";
  const contact = options.contactNumber || "09999212209 (حقدادی)";
  const analysis = analyzeListingContent(listing.title, listing.description || "");

  const lines: string[] = [];
  lines.push(`🚗 <b>${listing.title}</b>`);
  lines.push(`🏛️ <b>${name}</b>\n`);

  if (listing.year) {
    lines.push(`📅 سال ساخت: <b>${listing.year}</b>`);
  }
  if (listing.mileage_km !== null && listing.mileage_km !== undefined) {
    lines.push(`🛣️ کارکرد: <b>${new Intl.NumberFormat("fa-IR").format(listing.mileage_km)} کیلومتر</b>`);
  }
  if (listing.color) {
    lines.push(`🎨 رنگ: <b>${listing.color}</b>`);
  }
  lines.push(`💰 قیمت اعلامی: <b>${formatToman(listing.price_toman)}</b>`);

  if (analysis.tags.length > 0) {
    lines.push(`\n✨ <b>ویژگی‌های شاخص:</b>`);
    for (const t of analysis.tags) {
      lines.push(`   • ${t}`);
    }
  }

  lines.push(`\n📞 <b>جهت هماهنگی و بازدید:</b> <code>${contact}</code>`);
  lines.push(`📍 <b>موقعیت:</b> تربت‌حیدریه`);

  return lines.join("\n");
}
