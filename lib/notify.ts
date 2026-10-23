import { getTargetChatsForUser } from "./bot-linker";
import { formatKm, formatPercent, formatTomanReadable, formatYear } from "./money";

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

function formatTomanPersian(amount: number): string {
  return formatTomanReadable(amount);
}

async function callBale(
  method: "sendMessage" | "sendPhoto",
  body: Record<string, unknown>,
  timeoutMs: number,
): Promise<boolean> {
  try {
    const res = await fetch(`https://tapi.bale.ai/bot${BALE_BOT_TOKEN}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
    let payload: { ok?: boolean } | null = null;
    try {
      payload = (await res.json()) as { ok?: boolean };
    } catch {
      payload = null;
    }
    if (!res.ok || payload?.ok === false) {
      console.error(`[notify] Bale ${method} failed with HTTP ${res.status}`);
      return false;
    }
    return true;
  } catch (e) {
    const name = e instanceof Error ? e.name : "Error";
    console.error(`[notify] Bale ${method} request failed (${name})`);
    return false;
  }
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
  const yearStr = p.year ? ` (مدل ${formatYear(p.year)})` : "";
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
    const profitStr = `${formatTomanPersian(p.profitToman)} (${formatPercent(p.discountPercent || 0)} سود)`;
    lines.push(`🎁 <b>سود شما:</b> 🔥 <b>${profitStr}</b>`);
  } else if (isPriceDrop && p.priceDropToman) {
    lines.push(`🔻 <b>تخفیف:</b> 🔥 <b>${formatTomanPersian(p.priceDropToman)} کاهش قیمت</b>`);
  }

  // ۴. مشخصات کوتاه
  const specs: string[] = [];
  if (p.mileageKm !== undefined && p.mileageKm !== null) {
    specs.push(p.mileageKm === 0 ? "صفر کیلومتر" : formatKm(p.mileageKm));
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
  const cleanUrl = url && !url.includes("banners.sheypoor.com") && !url.includes("/banner/") ? url : null;
  if (cleanUrl) {
    rows.push([{ text: buttonText, url: cleanUrl }]);
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
  const imageUrl = payload.imageUrl?.startsWith("http") ? payload.imageUrl : null;

  // دریافت چت‌های متصل به این کاربر
  const { baleChats, telegramChats } = await getTargetChatsForUser(payload.userId || "admin");

  // ۱. ارسال به پیام‌رسان بله (همراه با عکس خودرو برای کاربران پلن رایگان و ۹۹۰ تومانی)
  for (const chatId of baleChats) {
    if (imageUrl) {
      const photoOk = await callBale(
        "sendPhoto",
        {
          chat_id: chatId,
          photo: imageUrl,
          caption: baleText,
          parse_mode: "HTML",
          reply_markup: replyMarkup,
          disable_notification: false,
        },
        6000,
      );
      if (photoOk) continue;
    }

    await callBale(
      "sendMessage",
      {
        chat_id: chatId,
        text: baleText,
        parse_mode: "HTML",
        reply_markup: replyMarkup,
        disable_notification: false,
      },
      4000,
    );
  }

  // ۲. ارسال به تلگرام (همراه با عکس خودرو)
  for (const chatId of telegramChats) {
    try {
      if (imageUrl) {
        const photoRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            photo: imageUrl,
            caption: telegramText,
            parse_mode: "HTML",
            reply_markup: replyMarkup,
          }),
          signal: AbortSignal.timeout(6000),
        });
        if (photoRes.ok) continue;
      }

      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: telegramText,
          parse_mode: "HTML",
          reply_markup: replyMarkup,
        }),
        signal: AbortSignal.timeout(4000),
      });
    } catch {
      // ادامه بدون توقف
    }
  }

  // ۳. ارسال به کانال رسمی ایتا (همواره همراه با عکس آگهی)
  const isUrgent =
    payload.tags?.some((t) => t.includes("فوری") || t.includes("پول لازم")) ||
    payload.title.includes("فوری") ||
    payload.title.includes("پول لازم");
  const isGoodDrop =
    Boolean(payload.priceDropToman && payload.priceDropToman > 0) ||
    Boolean(payload.discountPercent && payload.discountPercent >= 5);

  if (isUrgent || isGoodDrop) {
    const cleanEitaaText = buildCleanMessageText(payload, "eitaa").replace(/<[^>]+>/g, "");
    const sourceName = payload.source === "divar" ? "دیوار" : "شیپور";
    const broadcastButtonText = `🚗 مشاهده آگهی در ${sourceName}`;
    const eitaaCaption = payload.url
      ? `${cleanEitaaText}\n\n🔗 ${broadcastButtonText}:\n${payload.url}\n📢 کانال شکار خودرو: @${EITAA_BROADCAST_CHANNEL}`
      : `${cleanEitaaText}\n📢 کانال شکار خودرو: @${EITAA_BROADCAST_CHANNEL}`;

    let sentWithPhoto = false;

    // ارسال مستقیم عکس خودرو به کانال ایتا
    if (imageUrl) {
      try {
        const imgRes = await fetch(imageUrl, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          },
          signal: AbortSignal.timeout(6000),
        });
        if (imgRes.ok) {
          const buf = await imgRes.arrayBuffer();
          const formData = new FormData();
          formData.append("chat_id", EITAA_BROADCAST_CHANNEL);
          formData.append("file", new Blob([new Uint8Array(buf)], { type: "image/jpeg" }), "car.jpg");
          formData.append("caption", eitaaCaption);
          if (payload.url) {
            formData.append(
              "reply_markup",
              JSON.stringify({
                inline_keyboard: [[{ text: broadcastButtonText, url: payload.url }]],
              }),
            );
          }

          const photoRes = await fetch(`https://eitaayar.ir/api/${EITAA_BOT_TOKEN}/sendFile`, {
            method: "POST",
            body: formData,
            signal: AbortSignal.timeout(10000),
          });
          if (photoRes.ok) sentWithPhoto = true;
        }
      } catch {
        sentWithPhoto = false;
      }
    }

    // در صورتی که آگهی بدون عکس بود یا ارسال عکس ناموفق شد، با پیام متنی ارسال شود
    if (!sentWithPhoto) {
      try {
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
          signal: AbortSignal.timeout(4000),
        });
      } catch {
        // ادامه بدون توقف
      }
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
export async function sendAdminNewUserAlert(user: NewUserRegistrationPayload): Promise<boolean> {
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

  // ارسال به روبیکای مدیریت (فعلاً غیرفعال)

  return callBale(
    "sendMessage",
    {
      chat_id: adminBaleChat,
      text,
      parse_mode: "HTML",
    },
    6000,
  );
}
