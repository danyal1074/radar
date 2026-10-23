import { getTargetChatsForUser } from "./bot-linker";

/**
 * ماژول ارسال پیام‌های هشدار و فرصت‌های خرید به ربات بله و تلگرام
 * همراه با طراحی خلوت و مدرن و دکمه شیشه‌ای (Inline Keyboard)
 */

export interface NotificationPayload {
  userId?: string;
  title: string;
  source: "divar" | "sheypoor" | "manual" | "sample";
  priceToman: number;
  estimatedToman?: number | null;
  discountPercent?: number | null;
  profitToman?: number | null;
  priceDropToman?: number | null;
  imageUrl?: string | null;
  tags?: string[] | null;
  city: string;
  url?: string | null;
  ruleName?: string | null;
  year?: number | null;
  mileageKm?: number | null;
  color?: string | null;
  insurance?: string | null;
  bodyHealth?: string | null;
  chassisHealth?: string | null;
  engineHealth?: string | null;
  gearboxHealth?: string | null;
}

const BALE_BOT_TOKEN = "1290870269:jrmvQqvF3-ocsh914COgiuUvXUsAxP1ut6U";
const TELEGRAM_BOT_TOKEN = "8961215144:AAEj2tkW0B9Sxee9uusvle6_NwCI-_aD2r0";
const RUBIKA_BOT_TOKEN = "CHEGEH0TZCBGQPEUYBYTMXRUTGTADRUVGKPXXNUBFHXIUOYELMOJCOHLHOZOMZJJ";
const DEFAULT_ADMIN_RUBIKA_CHAT = "b0BRnXf0BMoZ02419247225b30f018fe";
const EITAA_BOT_TOKEN = "bot327777:f2d967b9-4d8c-480a-8fcd-16c1dbb59611";
const EITAA_BROADCAST_CHANNEL = "radarcarr";

function toPersianDigits(n: number | string | null | undefined): string {
  if (n === null || n === undefined) return "";
  return String(n)
    .replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)])
    .replace(/\B(?=(\d{3})+(?!\d))/g, "٬");
}

function formatTomanPersian(amount: number): string {
  return toPersianDigits(amount) + " تومان";
}

function buildCleanMessageText(p: NotificationPayload, platform: "telegram" | "bale" | "eitaa" = "bale"): string {
  const isDivar = p.source === "divar";
  const cityPersian = p.city || "مشهد";
  const sourceName = isDivar ? "دیوار" : "شیپور";
  const sourceTitle = `${sourceName} ${cityPersian}`;

  const isUrgent =
    p.tags?.some((t) => t.includes("فوری") || t.includes("پول لازم")) ||
    p.title.includes("فوری") ||
    p.title.includes("پول لازم");
  const isPriceDrop = Boolean(p.priceDropToman && p.priceDropToman > 0);

  // ۱. برچسب تیتر کوتاه و جذاب
  let headerBadge = "🎯 <b>#شکار_خودرو | زیر قیمت بازار</b>";
  if (isUrgent) {
    headerBadge = "🚨 <b>#فروش_فوری | پول‌لازم زیر فی</b> 🔥";
  } else if (isPriceDrop) {
    headerBadge = "📉 <b>#کاهش_قیمت | تخفیف ویژه</b> ⚡️";
  }

  // ۲. مدل خودرو بولد و خوانا
  const yearStr = p.year ? ` (مدل ${toPersianDigits(p.year)})` : "";
  const modelLine = `🚘 <b>${p.title}${yearStr}</b>`;

  // ۳. قیمت‌ها
  const priceFormatted = formatTomanPersian(p.priceToman);
  const marketFormatted = p.estimatedToman ? formatTomanPersian(p.estimatedToman) : null;

  const lines = [
    headerBadge,
    modelLine,
    "",
    `💰 <b>قیمت فروشنده:</b> <b>« ${priceFormatted} »</b>`,
  ];

  if (marketFormatted) {
    lines.push(`📊 <b>ارزش بازار:</b> ${marketFormatted}`);
  }

  if (p.profitToman && p.profitToman > 0) {
    const profitStr = `${formatTomanPersian(p.profitToman)} (${toPersianDigits(p.discountPercent || 0)}٪ سود)`;
    lines.push(`🎁 <b>سود شما:</b> 🔥 <b>${profitStr}</b>`);
  } else if (isPriceDrop && p.priceDropToman) {
    lines.push(`🔻 <b>تخفیف:</b> 🔥 <b>${formatTomanPersian(p.priceDropToman)} کاهش قیمت</b>`);
  }

  // ۴. مشخصات کوتاه
  const specs: string[] = [];
  if (p.mileageKm !== undefined && p.mileageKm !== null) {
    specs.push(p.mileageKm === 0 ? "صفر کیلومتر" : `${toPersianDigits(p.mileageKm)} km`);
  }
  if (p.color) specs.push(p.color);
  if (p.bodyHealth) specs.push(p.bodyHealth);

  if (specs.length > 0) {
    lines.push(`⚙️ <b>مشخصات:</b> ${specs.join(" • ")}`);
  }

  lines.push(`📍 <code>${sourceTitle}</code>  |  ⚡️ <b>رادار خودرو</b>`);

  return lines.filter(Boolean).join("\n");
}

function buildReplyMarkup(url?: string | null, source?: string) {
  const isDivar = source === "divar";
  const buttonText = isDivar ? "🚗 مشاهده آگهی در دیوار" : "🚗 مشاهده آگهی در شیپور";

  const rows = [];
  if (url) {
    rows.push([{ text: buttonText, url: url }]);
  }
  rows.push([{ text: "⚙️ مدیریت فیلترهای من در بله", callback_data: "menu_rules" }]);

  return {
    inline_keyboard: rows,
  };
}

export async function sendLiveAlert(payload: NotificationPayload): Promise<void> {
  const telegramText = buildCleanMessageText(payload, "telegram");
  const baleText = buildCleanMessageText(payload, "bale");
  const replyMarkup = buildReplyMarkup(payload.url, payload.source);

  // دریافت چت‌های متصل به این کاربر
  const { baleChats, telegramChats } = await getTargetChatsForUser(payload.userId || "admin");

  // ۱. ارسال به پیام‌رسان بله (متن کوتاه، بدون عکس به درخواست کاربر)
  for (const chatId of baleChats) {
    try {
      await fetch(`https://tapi.bale.ai/bot${BALE_BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: baleText,
          parse_mode: "HTML",
          reply_markup: replyMarkup,
          disable_notification: false,
        }),
        signal: AbortSignal.timeout(5000),
      });
    } catch {
      // ادامه بدون توقف
    }
  }

  // ۲. ارسال به تلگرام (متن کوتاه و جذاب بدون تأخیر عکس)
  for (const chatId of telegramChats) {
    try {
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: telegramText,
          parse_mode: "HTML",
          reply_markup: replyMarkup,
        }),
        signal: AbortSignal.timeout(5000),
      });
    } catch {
      // ادامه بدون توقف
    }
  }

  // ۳. ارسال به کانال رسمی ایتا (متن زیبا به همراه لینک مستقیم آگهی)
  const isUrgent =
    payload.tags?.some((t) => t.includes("فوری") || t.includes("پول لازم")) ||
    payload.title.includes("فوری") ||
    payload.title.includes("پول لازم");
  const isGoodDrop =
    Boolean(payload.priceDropToman && payload.priceDropToman > 0) ||
    Boolean(payload.discountPercent && payload.discountPercent >= 5);

  if (isUrgent || isGoodDrop) {
    try {
      const cleanEitaaText = buildCleanMessageText(payload, "eitaa").replace(/<[^>]+>/g, "");
      const sourceName = payload.source === "divar" ? "دیوار" : "شیپور";
      const broadcastButtonText = `🚗 مشاهده آگهی در ${sourceName}`;
      const eitaaCaption = payload.url
        ? `${cleanEitaaText}\n\n🔗 ${broadcastButtonText}:\n${payload.url}\n📢 کانال شکار خودرو: @${EITAA_BROADCAST_CHANNEL}`
        : `${cleanEitaaText}\n📢 کانال شکار خودرو: @${EITAA_BROADCAST_CHANNEL}`;

      const bodyParams = new URLSearchParams({
        chat_id: EITAA_BROADCAST_CHANNEL,
        text: eitaaCaption,
      });

      if (payload.url) {
        bodyParams.append(
          "reply_markup",
          JSON.stringify({
            inline_keyboard: [[{ text: broadcastButtonText, url: payload.url }]],
          }),
        );
      }

      await fetch(`https://eitaayar.ir/api/${EITAA_BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: bodyParams,
        signal: AbortSignal.timeout(5000),
      });
    } catch {
      // ادامه بدون توقف
    }
  }
}

export interface NewUserRegistrationPayload {
  fullName: string;
  businessName: string;
  phone: string;
  city: string;
  email?: string | null;
  planName?: string;
}

/**
 * ارسال اعلان آنی ثبت‌نام کاربر جدید به بله مدیریت
 */
export async function sendAdminNewUserAlert(user: NewUserRegistrationPayload): Promise<void> {
  const plan = user.planName || "تست رایگان ۱۴ روزه";
  const now = new Intl.DateTimeFormat("fa-IR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Asia/Tehran",
  }).format(new Date());

  const lines = [
    `🎉 <b>ثبت‌نام کاربر جدید در رادار خودرو!</b>`,
    ``,
    `👤 <b>نام کاربر:</b> ${user.fullName}`,
    `🏢 <b>نام نمایشگاه:</b> ${user.businessName}`,
    `📍 <b>شهر:</b> ${user.city}`,
    `📱 <b>شماره تماس:</b> <code>${user.phone}</code>`,
  ];

  if (user.email) {
    lines.push(`📧 <b>ایمیل:</b> ${user.email}`);
  }

  lines.push(`📦 <b>نوع پلن:</b> ${plan}`);
  lines.push(`⏰ <b>زمان ثبت:</b> ${now}`);

  const text = lines.join("\n");
  const adminBaleChat = "772511114";

  try {
    await fetch(`https://tapi.bale.ai/bot${BALE_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: adminBaleChat,
        text,
        parse_mode: "HTML",
      }),
      signal: AbortSignal.timeout(6000),
    });
  } catch (e) {
    console.error("[notify] failed to send new user alert to Bale:", e);
  }

  // ارسال به روبیکای مدیریت (فعلاً غیرفعال)
  /*
  try {
    const plainText = text.replace(/<[^>]+>/g, "");
    await fetch(`https://botapi.rubika.ir/v3/${RUBIKA_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: DEFAULT_ADMIN_RUBIKA_CHAT,
        text: plainText,
      }),
      signal: AbortSignal.timeout(6000),
    });
  } catch (e) {
    console.error("[notify] failed to send new user alert to Rubika:", e);
  }
  */
}
