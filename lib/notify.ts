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
}

const BALE_BOT_TOKEN = "1290870269:jrmvQqvF3-ocsh914COgiuUvXUsAxP1ut6U";
const TELEGRAM_BOT_TOKEN = "8961215144:AAEj2tkW0B9Sxee9uusvle6_NwCI-_aD2r0";

function formatTomanPersian(amount: number): string {
  return new Intl.NumberFormat("fa-IR").format(amount) + " تومان";
}

function buildCleanMessageText(p: NotificationPayload): string {
  const isDivar = p.source === "divar";
  const sourceTitle = isDivar ? "🔴 دیوار تربت‌حیدریه" : "🔵 شیپور تربت‌حیدریه";

  const lines: string[] = [];

  if (p.ruleName) {
    lines.push(`🔔 <b>هشدار اختصاصی:</b> «${p.ruleName}»`);
  }
  lines.push(`📍 <b>${sourceTitle}</b>\n`);
  lines.push(`🚗 <b>${p.title}</b>`);
  lines.push(`💰 قیمت: <b>${formatTomanPersian(p.priceToman)}</b>`);

  if (p.priceDropToman && p.priceDropToman > 0) {
    lines.push(`📉 <b>کاهش قیمت:</b> فروشنده <b>${formatTomanPersian(p.priceDropToman)}</b> ارزان‌تر کرد!`);
  }

  if (p.estimatedToman && p.estimatedToman > 0) {
    lines.push(`📊 کارشناسی روز: ${formatTomanPersian(p.estimatedToman)}`);
  }

  if (p.discountPercent && p.discountPercent > 0 && p.profitToman && p.profitToman > 0) {
    lines.push(`🔥 <b>${p.discountPercent}٪ زیر قیمت</b> (سود: ${formatTomanPersian(p.profitToman)})`);
  }

  if (p.tags && p.tags.length > 0) {
    lines.push(`\n✨ <b>مشخصات ویژه:</b> ${p.tags.join(" | ")}`);
  }

  return lines.join("\n");
}

function buildReplyMarkup(url?: string | null, source?: string) {
  if (!url) return undefined;
  const isDivar = source === "divar";
  const buttonText = isDivar ? "🚗 مشاهده آگهی در دیوار" : "🚗 مشاهده آگهی در شیپور";

  return {
    inline_keyboard: [
      [
        {
          text: buttonText,
          url: url,
        },
      ],
    ],
  };
}

export async function sendLiveAlert(payload: NotificationPayload): Promise<void> {
  const text = buildCleanMessageText(payload);
  const replyMarkup = buildReplyMarkup(payload.url, payload.source);
  const imageUrl = payload.imageUrl?.startsWith("http") ? payload.imageUrl : null;

  // دریافت چت‌های متصل به این کاربر
  const { baleChats, telegramChats } = await getTargetChatsForUser(payload.userId || "admin");

  // ۱. ارسال به پیام‌رسان بله
  for (const chatId of baleChats) {
    try {
      if (imageUrl) {
        // تلاش برای ارسال با تصویر
        const photoRes = await fetch(`https://tapi.bale.ai/bot${BALE_BOT_TOKEN}/sendPhoto`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            photo: imageUrl,
            caption: text,
            parse_mode: "HTML",
            reply_markup: replyMarkup,
          }),
          signal: AbortSignal.timeout(6000),
        });
        if (photoRes.ok) continue;
      }

      // ارسال متنی استاندارد در صورت عدم وجود تصویر یا خطا
      await fetch(`https://tapi.bale.ai/bot${BALE_BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: "HTML",
          reply_markup: replyMarkup,
        }),
        signal: AbortSignal.timeout(6000),
      });
    } catch {
      // ادامه بدون توقف
    }
  }

  // ۲. ارسال به تلگرام
  for (const chatId of telegramChats) {
    try {
      if (imageUrl) {
        const photoRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            photo: imageUrl,
            caption: text,
            parse_mode: "HTML",
            reply_markup: replyMarkup,
          }),
          signal: AbortSignal.timeout(5000),
        });
        if (photoRes.ok) continue;
      }

      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: "HTML",
          reply_markup: replyMarkup,
        }),
        signal: AbortSignal.timeout(4000),
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
}
