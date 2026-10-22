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

  // ۱. برچسب عنوان و وضعیت اختصاصی
  let headerBadge = "🎯 <b>#شکار_خودرو | فرصت خرید</b> ✨";
  if (isUrgent) {
    headerBadge = "🚨 <b>#فروش_فوری | فوری پول‌لازم زیر فی</b> ⚡️";
  } else if (isPriceDrop) {
    headerBadge = "📉 <b>#سقوط_قیمت | تخفیف ویژه فروشنده</b> 🔥";
  }

  // ۲. مدل و سال خودرو (کاملاً درشت، بولد و چشم‌نواز)
  const yearStr = p.year ? ` | مدل ${toPersianDigits(p.year)}` : "";
  const modelLine = `🚘 <b>❮❮ ${p.title}${yearStr} ❯❯</b>`;

  // ۳. باکس برجسته قیمت فروشنده و قیمت کارشناسی بازار
  const priceFormatted = formatTomanPersian(p.priceToman);
  const marketFormatted = p.estimatedToman ? formatTomanPersian(p.estimatedToman) : null;

  let priceBox = "";
  if (platform === "telegram") {
    priceBox = `<blockquote>💰 <b>قیمت فروشنده:</b> <b>« ${priceFormatted} »</b>\n` +
      (marketFormatted ? `📊 <b>ارزش بازار:</b> ${marketFormatted}` : "") +
      `</blockquote>`;
  } else {
    priceBox = `╭──────────────────────────────╮\n` +
      `│ 💰 <b>قیمت فروشنده:</b> <b>« ${priceFormatted} »</b>\n` +
      (marketFormatted ? `│ 📊 <b>ارزش بازار:</b> ${marketFormatted}\n` : "") +
      `╰──────────────────────────────╯`;
  }

  // ۴. خط سود کارشناسی و تخفیف بازار (دارای افکت Spoiler در تلگرام)
  let profitLine = "";
  if (p.profitToman && p.profitToman > 0) {
    const profitStr = `${formatTomanPersian(p.profitToman)} (${toPersianDigits(p.discountPercent || 0)}٪ سود)`;
    if (platform === "telegram") {
      profitLine = `🎁 <b>سود خالص شما:</b> <tg-spoiler>🔥 ${profitStr}</tg-spoiler>`;
    } else {
      profitLine = `🎁 <b>سود خالص شما:</b> 🔥 <b>${profitStr}</b>`;
    }
  } else if (isPriceDrop && p.priceDropToman) {
    profitLine = `🔻 <b>کاهش قیمت:</b> 🔥 <b>${formatTomanPersian(p.priceDropToman)} ارزان‌تر شد</b>`;
  }

  // ۵. مشخصات کلیدی به صورت خلاصه، شیک و تک‌خطی
  const specs: string[] = [];
  if (p.mileageKm !== undefined && p.mileageKm !== null) {
    specs.push(p.mileageKm === 0 ? "صفر کیلومتر" : `${toPersianDigits(p.mileageKm)} km`);
  }
  if (p.color) specs.push(`رنگ ${p.color}`);
  if (p.bodyHealth) specs.push(p.bodyHealth);

  const specsLine = specs.length > 0 ? `⚙️ <b>مشخصات:</b> ${specs.join("  •  ")}` : "";

  // ۶. پاورقی و منبع آگهی
  const footerLine = `📍 <code>${sourceTitle}</code>  |  ⚡️ <b>شناسایی آنی با رادار</b>`;

  const lines = [
    headerBadge,
    modelLine,
    "",
    priceBox,
  ];

  if (profitLine) lines.push(profitLine);
  if (specsLine) lines.push(specsLine);
  lines.push("");
  lines.push(footerLine);

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
  const imageUrl = payload.imageUrl?.startsWith("http") ? payload.imageUrl : null;

  // دریافت چت‌های متصل به این کاربر
  const { baleChats, telegramChats, rubikaChats } = await getTargetChatsForUser(payload.userId || "admin");

  // ۱. ارسال به پیام‌رسان بله (همراه با عکس واقعی خودرو از آگهی)
  for (const chatId of baleChats) {
    try {
      if (imageUrl) {
        const photoRes = await fetch(`https://tapi.bale.ai/bot${BALE_BOT_TOKEN}/sendPhoto`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            photo: imageUrl,
            caption: baleText,
            parse_mode: "HTML",
            reply_markup: replyMarkup,
            disable_notification: false,
          }),
          signal: AbortSignal.timeout(8000),
        });
        if (photoRes.ok) continue;
      }

      // ارسال متنی استاندارد در صورت عدم وجود تصویر یا خطا
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
        signal: AbortSignal.timeout(6000),
      });
    } catch {
      // ادامه بدون توقف
    }
  }

  // ۲. ارسال به تلگرام (همراه با عکس واقعی خودرو و افکت‌های تعاملی و اسپویلر)
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
          signal: AbortSignal.timeout(8000),
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
        signal: AbortSignal.timeout(5000),
      });
    } catch {
      // ادامه بدون توقف
    }
  }

  // ۳. ارسال به کانال رسمی ایتا (همراه با عکس واقعی خودرو آگهی و دکمه شیشه‌ای)
  const isUrgent =
    payload.tags?.some((t) => t.includes("فوری") || t.includes("پول لازم")) ||
    payload.title.includes("فوری") ||
    payload.title.includes("پول لازم");
  const isGoodDrop =
    Boolean(payload.priceDropToman && payload.priceDropToman > 0) ||
    Boolean(payload.discountPercent && payload.discountPercent >= 5);

  if (isUrgent || isGoodDrop) {
    const cleanEitaaText = buildCleanMessageText(payload, "eitaa").replace(/<[^>]+>/g, "");
    const broadcastButtonText = payload.source === "divar" ? "🚗 مشاهده آگهی در دیوار" : "🚗 مشاهده آگهی در شیپور";
    const eitaaCaption = payload.url
      ? `${cleanEitaaText}\n\n🔗 لینک مشاهده آگهی: ${payload.url}\n📢 کانال رسمی شکار خودرو: @${EITAA_BROADCAST_CHANNEL}`
      : `${cleanEitaaText}\n📢 کانال رسمی شکار خودرو: @${EITAA_BROADCAST_CHANNEL}`;

    let sentWithPhoto = false;

    // ارسال مستقیم عکس واقعی خودرو از دیوار به ایتا
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
            signal: AbortSignal.timeout(15000),
          });
          if (photoRes.ok) sentWithPhoto = true;
        }
      } catch {
        sentWithPhoto = false;
      }
    }

    // ارسال متنی استاندارد در صورت عدم وجود عکس یا بروز خطا
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
          signal: AbortSignal.timeout(6000),
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
