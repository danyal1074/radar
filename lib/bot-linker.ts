import fs from "node:fs/promises";
import path from "node:path";

export interface BotSubscriber {
  userId: string;
  baleChatId?: string;
  telegramChatId?: string;
  userName?: string;
  linkedAt: string;
}

interface StorageData {
  codes: Record<string, string>; // code -> userId
  subscribers: Record<string, BotSubscriber>; // userId -> subscriber
}

const DATA_DIR = path.join(process.cwd(), ".data");
const FILE_PATH = path.join(DATA_DIR, "bot_subscribers.json");

// Default Danial's Bale & Telegram chat ID for admin notifications
const DEFAULT_ADMIN_BALE_CHAT = "772511114";
const DEFAULT_ADMIN_TELEGRAM_CHAT = "772511114";

async function readStorage(): Promise<StorageData> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const content = await fs.readFile(FILE_PATH, "utf-8");
    return JSON.parse(content) as StorageData;
  } catch {
    return {
      codes: {},
      subscribers: {
        admin: {
          userId: "admin",
          baleChatId: DEFAULT_ADMIN_BALE_CHAT,
          userName: "دانیال حقدادی (مدیر)",
          linkedAt: new Date().toISOString(),
        },
      },
    };
  }
}

async function writeStorage(data: StorageData): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(FILE_PATH, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("خطا در ذخیره داده‌های اتصال ربات:", err);
  }
}

function normalizeDigits(text: string): string {
  if (!text) return "";
  return text
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660));
}

/** دریافت یا تولید کد اتصال عددی برای کاربر */
export async function getOrCreateLinkCode(userId: string): Promise<string> {
  const store = await readStorage();
  for (const [code, uid] of Object.entries(store.codes)) {
    if (uid === userId && /^\d{5,6}$/.test(code)) return code;
  }

  // تولید کد عددی ۶ رقمی منحصر به فرد
  const code = String(Math.floor(100000 + Math.random() * 900000));
  store.codes[code] = userId;
  await writeStorage(store);
  return code;
}

/** اتصال چت‌آیدی بله یا تلگرام به کاربر با استفاده از کد اتصال */
export async function linkChatWithCode(
  inputCode: string,
  chatId: string,
  messenger: "bale" | "telegram",
  userName?: string,
): Promise<{ success: boolean; message: string; userId?: string }> {
  const store = await readStorage();
  const normalized = normalizeDigits(inputCode).trim();

  // استخراج کد عددی ۴ تا ۶ رقمی یا فرمت قبلی RADAR-1234
  const numMatch = normalized.match(/\b\d{4,6}\b/);
  const radarMatch = normalized.match(/\bRADAR-\d+\b/i);
  const cleanCode = numMatch ? numMatch[0] : (radarMatch ? radarMatch[0].toUpperCase() : normalized);

  let userId = store.codes[cleanCode];
  if (!userId) {
    for (const [c, uid] of Object.entries(store.codes)) {
      const cDigits = c.replace(/\D/g, "");
      const cleanDigits = cleanCode.replace(/\D/g, "");
      if (cDigits && cleanDigits && cDigits === cleanDigits) {
        userId = uid;
        break;
      }
    }
  }

  if (!userId) {
    return {
      success: false,
      message: "کد اتصال نامعتبر یا منقضی شده است. لطفاً کد عددی صحیح را از بخش «هشدارهای من» دریافت کنید.",
    };
  }

  const existing = store.subscribers[userId] || {
    userId,
    userName: userName || "کاربر رادار",
    linkedAt: new Date().toISOString(),
  };

  if (messenger === "bale") {
    existing.baleChatId = String(chatId);
  } else {
    existing.telegramChatId = String(chatId);
  }
  if (userName) existing.userName = userName;

  store.subscribers[userId] = existing;
  await writeStorage(store);

  return {
    success: true,
    message: `حساب کاربری شما (${existing.userName}) با موفقیت به ربات متصل شد! ✅`,
    userId,
  };
}

/** دریافت وضعیت اتصال برای نمایش در پنل کاربری */
export async function getUserLinkStatus(userId: string): Promise<{
  code: string;
  isBaleLinked: boolean;
  isTelegramLinked: boolean;
  baleChatId?: string;
  telegramChatId?: string;
}> {
  const code = await getOrCreateLinkCode(userId);
  const store = await readStorage();
  const sub = store.subscribers[userId];

  return {
    code,
    isBaleLinked: Boolean(sub?.baleChatId),
    isTelegramLinked: Boolean(sub?.telegramChatId),
    baleChatId: sub?.baleChatId,
    telegramChatId: sub?.telegramChatId,
  };
}

/** دریافت تمام شناسه‌های چت برای ارسال هشدار اختصاصی */
export async function getTargetChatsForUser(userId: string): Promise<{
  baleChats: string[];
  telegramChats: string[];
}> {
  const store = await readStorage();
  const sub = store.subscribers[userId];
  const baleChats: string[] = [];
  const telegramChats: string[] = [];

  // فقط اگر کاربر مدیر (دانیال) باشد، چت‌های پیش‌فرض مدیر اضافه می‌شوند
  if (userId === "admin" || userId === "97375339-be50-403e-be7b-0aee1b7c2d99" || userId.includes("danyal")) {
    if (!baleChats.includes(DEFAULT_ADMIN_BALE_CHAT)) {
      baleChats.push(DEFAULT_ADMIN_BALE_CHAT);
    }
    if (!telegramChats.includes(DEFAULT_ADMIN_TELEGRAM_CHAT)) {
      telegramChats.push(DEFAULT_ADMIN_TELEGRAM_CHAT);
    }
  }

  // برای هر کاربر اختصاصی، پیام فقط به چت متصل به خودش ارسال می‌شود
  if (sub?.baleChatId && !baleChats.includes(sub.baleChatId)) {
    baleChats.push(sub.baleChatId);
  }
  if (sub?.telegramChatId && !telegramChats.includes(sub.telegramChatId)) {
    telegramChats.push(sub.telegramChatId);
  }

  return { baleChats, telegramChats };
}

/** یافتن یا اتصال کاربر بر اساس Chat ID پیام‌رسان */
export async function getUserIdByChatId(
  chatId: string,
  messenger: "bale" | "telegram",
): Promise<string | null> {
  const store = await readStorage();
  const cid = String(chatId);
  for (const [uid, sub] of Object.entries(store.subscribers)) {
    if (messenger === "bale" && sub.baleChatId === cid) return uid;
    if (messenger === "telegram" && sub.telegramChatId === cid) return uid;
  }
  return null;
}

/** ثبت مستقیم اتصال با Chat ID */
export async function registerDirectChat(
  userId: string,
  chatId: string,
  messenger: "bale" | "telegram",
  userName?: string,
): Promise<BotSubscriber> {
  const store = await readStorage();
  const existing = store.subscribers[userId] || {
    userId,
    userName: userName || "کاربر رادار",
    linkedAt: new Date().toISOString(),
  };

  if (messenger === "bale") existing.baleChatId = String(chatId);
  else existing.telegramChatId = String(chatId);
  if (userName) existing.userName = userName;

  store.subscribers[userId] = existing;
  await writeStorage(store);
  return existing;
}
