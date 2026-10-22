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

function formatTomanPersian(amount: number): string {
  return new Intl.NumberFormat("fa-IR").format(amount) + " تومان";
}

function buildCleanMessageText(p: NotificationPayload): string {
  const isDivar = p.source === "divar";
  const cityPersian = p.city?.includes("مشهد") ? "مشهد" : "تربت‌حیدریه";
  const sourceName = isDivar ? "دیوار" : "شیپور";
  const sourceTitle = `${sourceName} ${cityPersian}`;

  const lines: string[] = [];

  // بررسی وضعیت‌های خاص: فروش فوری، پول لازم، یا کاهش قیمت
  const isUrgent =
    p.tags?.some((t) => t.includes("فوری") || t.includes("پول لازم")) ||
    p.title.includes("فوری") ||
    p.title.includes("پول لازم");
  const isPriceDrop = Boolean(p.priceDropToman && p.priceDropToman > 0);

  if (isUrgent) {
    lines.push(`🚨🚨 <b>#فروش_فوری | #پول_لازم | فوری</b> 🚨🚨`);
    lines.push(`⚡️ <b>فرصت طلایی:</b> فروشنده پول لازم زیر فی بازار!`);
    lines.push(`━━━━━━━━━━━━━━━━━━━━━`);
  } else if (isPriceDrop) {
    lines.push(`📉💥 <b>سـقـوط قـیـمـت! ارزان‌تـر شـد</b> 💥📉`);
    lines.push(`🔻 <b>کاهش قیمت:</b> <code>🔥 ${formatTomanPersian(p.priceDropToman!)} ارزان‌تر شد!</code>`);
    lines.push(`━━━━━━━━━━━━━━━━━━━━━`);
  }

  // ۱. فیلتر فعال اختصاصی کاربر (با تأکید بالا برای تشخیص سریع بین چند قانون)
  const ruleTag = p.ruleName ? `«${p.ruleName}»` : "«هشدار اختصاصی»";
  lines.push(`🔔 <b>فیلتر فعال شما:</b> 🎯 <code>${ruleTag}</code>`);
  lines.push(`━━━━━━━━━━━━━━━━━━━━━`);

  // ۲. عنوان و مدل خودرو (بسیار خوانا، درشت و متمایز)
  lines.push(`🚘 <b>خودرو:</b> ❮❮ <b>${p.title}</b> ❯❯`);
  lines.push(``);
  lines.push(`╭──────────────────────────────╮`);
  lines.push(`│ 💰 <b>قیمت فروشنده:</b> <b>« ${formatTomanPersian(p.priceToman)} »</b>`);
  lines.push(`╰──────────────────────────────╯`);

  // ۳. ارزیابی سود و تخفیف بازار
  if (p.estimatedToman && p.estimatedToman > 0) {
    lines.push(`📊 <b>ارزش کارشناسی بازار:</b> <code>${formatTomanPersian(p.estimatedToman)}</code>`);
  }

  if (p.discountPercent && p.discountPercent > 0 && p.profitToman && p.profitToman > 0) {
    lines.push(
      `🎁 <b>سود خالص تخمینی:</b> <code>🔥 ${formatTomanPersian(p.profitToman)} (${p.discountPercent}٪ زیر قیمت)</code>`,
    );
  }

  // ۴. مشخصات دقیق استخراج شده (سال، کارکرد، رنگ، وضعیت فنی و بدنه)
  const specs: string[] = [];
  if (p.year) specs.push(`مدل <code>${p.year}</code>`);
  if (p.mileageKm !== undefined && p.mileageKm !== null) {
    const kmStr = p.mileageKm === 0 ? "صفر کیلومتر" : `${new Intl.NumberFormat("fa-IR").format(p.mileageKm)} km`;
    specs.push(`کارکرد <code>${kmStr}</code>`);
  }
  if (p.color) specs.push(`رنگ <code>${p.color}</code>`);
  if (p.insurance) specs.push(`بیمه <code>${p.insurance}</code>`);

  if (specs.length > 0) {
    lines.push(`━━━━━━━━━━━━━━━━━━━━━`);
    lines.push(`📋 <b>مشخصات:</b> ${specs.join("  |  ")}`);
  }

  // وضعیت ارزیابی سلامت خودرو
  const healthParts: string[] = [];
  if (p.bodyHealth) healthParts.push(`بدنه: <code>${p.bodyHealth}</code>`);
  if (p.chassisHealth) healthParts.push(`شاسی: <code>${p.chassisHealth}</code>`);
  if (p.engineHealth) healthParts.push(`موتور: <code>${p.engineHealth}</code>`);
  if (p.gearboxHealth) healthParts.push(`گیربکس: <code>${p.gearboxHealth}</code>`);

  if (healthParts.length > 0) {
    lines.push(`🩺 <b>وضعیت سلامت:</b> ${healthParts.join("  |  ")}`);
  }

  if (p.tags && p.tags.length > 0) {
    lines.push(`✨ <b>نکات آگهی:</b> ${p.tags.join(" • ")}`);
  }

  lines.push(`━━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`📍 <b>منبع:</b> ${sourceTitle}  |  ⚡ <b>شناسایی آنی با رادار</b>`);

  return lines.join("\n");
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
  const text = buildCleanMessageText(payload);
  const replyMarkup = buildReplyMarkup(payload.url, payload.source);
  const imageUrl = payload.imageUrl?.startsWith("http") ? payload.imageUrl : null;

  // دریافت چت‌های متصل به این کاربر
  const { baleChats, telegramChats, rubikaChats } = await getTargetChatsForUser(payload.userId || "admin");

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
            disable_notification: false,
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
          disable_notification: false,
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

  // ۳. ارسال به پیام‌رسان روبیکا (همراه با دکمه شیشه‌ای مشاهده آگهی)
  const cleanRubikaText = text.replace(/<[^>]+>/g, "");
  const rubikaButtonText = payload.source === "divar" ? "🚗 مشاهده آگهی در دیوار" : "🚗 مشاهده آگهی در شیپور";
  const rubikaMarkup = payload.url
    ? {
        inline_keyboard: [
          [{ text: rubikaButtonText, url: payload.url }],
        ],
      }
    : undefined;

  for (const chatId of rubikaChats) {
    try {
      await fetch(`https://botapi.rubika.ir/v3/${RUBIKA_BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: cleanRubikaText,
          reply_markup: rubikaMarkup,
        }),
        signal: AbortSignal.timeout(6000),
      });
    } catch {
      // ادامه بدون توقف
    }
  }

  // ۴. ارسال به کانال رسمی ایتا (فقط موارد فروش فوری، پول‌لازم و کاهش قیمت خوب با تصویر)
  const isUrgent =
    payload.tags?.some((t) => t.includes("فوری") || t.includes("پول لازم")) ||
    payload.title.includes("فوری") ||
    payload.title.includes("پول لازم");
  const isGoodDrop =
    Boolean(payload.priceDropToman && payload.priceDropToman > 0) ||
    Boolean(payload.discountPercent && payload.discountPercent >= 7);

  if (isUrgent || isGoodDrop) {
    const eitaaCaption = payload.url
      ? `${cleanRubikaText}\n\n🔗 لینک مشاهده آگهی: ${payload.url}\n📢 کانال رسمی شکار خودرو: @${EITAA_BROADCAST_CHANNEL}`
      : `${cleanRubikaText}\n📢 کانال رسمی شکار خودرو: @${EITAA_BROADCAST_CHANNEL}`;

    let sentWithPhoto = false;

    // تلاش برای ارسال با تصویر آگهی به ایتا
    if (imageUrl) {
      try {
        const imgRes = await fetch(imageUrl, { signal: AbortSignal.timeout(5000) });
        if (imgRes.ok) {
          const arrayBuffer = await imgRes.arrayBuffer();
          const blob = new Blob([arrayBuffer], { type: "image/jpeg" });
          const formData = new FormData();
          formData.append("chat_id", EITAA_BROADCAST_CHANNEL);
          formData.append("file", blob, "car.jpg");
          formData.append("caption", eitaaCaption);
          if (payload.url) {
            formData.append(
              "reply_markup",
              JSON.stringify({
                inline_keyboard: [[{ text: rubikaButtonText, url: payload.url }]],
              }),
            );
          }

          const photoRes = await fetch(`https://eitaayar.ir/api/${EITAA_BOT_TOKEN}/sendFile`, {
            method: "POST",
            body: formData,
            signal: AbortSignal.timeout(12000),
          });
          if (photoRes.ok) sentWithPhoto = true;
        }
      } catch {
        sentWithPhoto = false;
      }
    }

    // ارسال متنی استاندارد در صورت عدم وجود عکس یا خطا
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
              inline_keyboard: [[{ text: rubikaButtonText, url: payload.url }]],
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

  // ارسال به روبیکای مدیریت
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
}
