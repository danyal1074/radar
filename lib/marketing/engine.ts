import { formatTomanReadable } from "../money";
import type { Listing } from "../types";
import { sendDivarChatMessage, getDivarDirectChatUrl } from "./divar";
import { sendSheypoorChatMessage, getSheypoorDirectChatUrl } from "./sheypoor";
import {
  getMarketingConfig,
  getTodaySentCount,
  isAlreadyMessaged,
  recordMarketingLog,
} from "./store";
import type { MarketingLogItem } from "./types";

/**
 * پردازشگر Spintax برای ایجاد تنوع کلمات (مثال: {سلام|درود|وقت بخیر})
 */
export function parseSpintax(text: string): string {
  return text.replace(/\{([^{}]+)\}/g, (_match, group) => {
    // اگر متغیر مشخصی بود (مثل car_title) دست نزن
    if (
      group === "car_title" ||
      group === "car_price" ||
      group === "city" ||
      group === "ad_link"
    ) {
      return `{${group}}`;
    }
    const choices = group.split("|");
    const randomIndex = Math.floor(Math.random() * choices.length);
    return choices[randomIndex].trim();
  });
}

/**
 * جایگذاری متغیرهای آگهی در متن پیام
 */
export function buildPersonalizedMessage(
  template: string,
  listing: Pick<Listing, "title" | "price_toman" | "city" | "source">,
  adLink: string
): string {
  const spintaxed = parseSpintax(template);
  const priceReadable = formatTomanReadable(listing.price_toman);
  const city = listing.city || "مشهد";

  return spintaxed
    .replace(/\{car_title\}/g, listing.title)
    .replace(/\{car_price\}/g, priceReadable)
    .replace(/\{city\}/g, city)
    .replace(/\{ad_link\}/g, adLink.trim());
}

export interface SendResult {
  ok: boolean;
  message?: string;
  directUrl?: string;
  messageText?: string;
}

/**
 * ارسال پیام چت به صاحب آگهی (با رعایت سقف روزانه و ثبت لاگ)
 */
export async function executeMarketingSend(
  listing: Listing,
  customAdLink?: string
): Promise<SendResult> {
  const config = await getMarketingConfig();
  const source = listing.source === "sheypoor" ? "sheypoor" : "divar";
  const postToken = listing.source_post_id;

  // ۱. لینک مستقیم برای دسترسی دستی در مرورگر
  const directUrl =
    source === "divar"
      ? getDivarDirectChatUrl(postToken)
      : getSheypoorDirectChatUrl(postToken);

  // ۲. بررسی سقف ارسال روزانه
  const todayCount = await getTodaySentCount(source);
  if (todayCount >= config.dailyLimit) {
    return {
      ok: false,
      message: `سقف ارسال روزانه ${source === "divar" ? "دیوار" : "شیپور"} (${config.dailyLimit} پیام) تکمیل شده است.`,
      directUrl,
    };
  }

  // ۳. بررسی عدم ارسال تکراری به این آگهی
  if (await isAlreadyMessaged(postToken)) {
    return {
      ok: false,
      message: "به این آگهی قبلاً پیام تبلیغاتی ارسال شده است.",
      directUrl,
    };
  }

  // ۴. تولید متن شخصی‌سازی‌شده پیام
  const targetAdLink =
    customAdLink || (source === "sheypoor" && config.sheypoorAdLink ? config.sheypoorAdLink : config.adLink);

  const messageText = buildPersonalizedMessage(config.template, listing, targetAdLink);

  // ۵. ارسال از طریق API چت پلتفرم مربوطه
  let sendOk = false;
  let errorMsg = "";

  if (source === "divar") {
    if (!config.divarToken) {
      return {
        ok: false,
        message: "توکن دیوار فعال نیست. لطفاً ابتدا در تب تنظیمات به حساب دیوار متصل شوید.",
        directUrl,
        messageText,
      };
    }
    const res = await sendDivarChatMessage(config.divarToken, postToken, messageText);
    sendOk = res.ok;
    errorMsg = res.error || "";
  } else {
    if (!config.sheypoorToken) {
      return {
        ok: false,
        message: "توکن شیپور فعال نیست. لطفاً ابتدا در تب تنظیمات به حساب شیپور متصل شوید.",
        directUrl,
        messageText,
      };
    }
    const res = await sendSheypoorChatMessage(config.sheypoorToken, postToken, messageText);
    sendOk = res.ok;
    errorMsg = res.error || "";
  }

  // ۶. ثبت گزارش در دیتابیس لاگ‌ها
  const logItem: MarketingLogItem = {
    id: `mkt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    listingId: listing.id,
    source,
    postToken,
    carTitle: listing.title,
    priceToman: listing.price_toman,
    city: listing.city || "مشهد",
    messageText,
    status: sendOk ? "sent" : "failed",
    errorMessage: errorMsg || undefined,
    sentAt: new Date().toISOString(),
  };

  await recordMarketingLog(logItem);

  if (sendOk) {
    return {
      ok: true,
      message: `پیام با موفقیت در چت ${source === "divar" ? "دیوار" : "شیپور"} ارسال شد.`,
      directUrl,
      messageText,
    };
  }

  return {
    ok: false,
    message: errorMsg || "خطا در ارسال پیام.",
    directUrl,
    messageText,
  };
}
