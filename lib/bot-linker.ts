import fs from "node:fs/promises";
import path from "node:path";

export interface BotSubscriber {
  userId: string;
  baleChatId?: string;
  telegramChatId?: string;
  rubikaChatId?: string;
  eitaaChatId?: string;
  userName?: string;
  linkedAt: string;
}

interface StorageData {
  codes: Record<string, string>; // code -> userId
  subscribers: Record<string, BotSubscriber>; // userId -> subscriber
}

const DATA_DIR = path.join(process.cwd(), ".data");
const DEFAULT_FILE_PATH = path.join(DATA_DIR, "bot_subscribers.json");
let filePathOverride: string | null = null;

/** Tests point the subscriber file at a temp path so they never touch the live JSON. */
export function setBotSubscriberStorageForTests(file: string | null): void {
  filePathOverride = file;
}

function storageFile(): string {
  return filePathOverride ?? DEFAULT_FILE_PATH;
}

/**
 * Known manager chats used only when no subscriber row owns that chat.
 * 2079437548 was a one-digit typo of a real admin chat and is intentionally absent:
 * the correct id is not hard-coded. An explicit link always wins over this list.
 */
export const DEFAULT_ADMIN_BALE_CHATS = ["772511114", "1271663233"];
const DEFAULT_ADMIN_BALE_CHAT = "772511114";
const DEFAULT_ADMIN_TELEGRAM_CHAT = "772511114";
const DEFAULT_ADMIN_RUBIKA_CHAT = "b0BRnXf0BMoZ02419247225b30f018fe";
export const DANIAL_ADMIN_UUID = "97375339-be50-403e-be7b-0aee1b7c2d99";

async function readStorage(): Promise<StorageData> {
  try {
    const file = storageFile();
    await fs.mkdir(path.dirname(file), { recursive: true });
    const content = await fs.readFile(file, "utf-8");
    return JSON.parse(content) as StorageData;
  } catch {
    return {
      codes: {},
      subscribers: {
        admin: {
          userId: "admin",
          baleChatId: DEFAULT_ADMIN_BALE_CHAT,
          rubikaChatId: DEFAULT_ADMIN_RUBIKA_CHAT,
          userName: "دانیال حقدادی (مدیر)",
          linkedAt: new Date().toISOString(),
        },
      },
    };
  }
}

async function writeStorage(data: StorageData): Promise<void> {
  try {
    const file = storageFile();
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, JSON.stringify(data, null, 2), "utf-8");
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

export type BotMessenger = "bale" | "telegram" | "rubika" | "eitaa";

function chatField(messenger: BotMessenger): "baleChatId" | "telegramChatId" | "rubikaChatId" | "eitaaChatId" {
  if (messenger === "bale") return "baleChatId";
  if (messenger === "telegram") return "telegramChatId";
  if (messenger === "rubika") return "rubikaChatId";
  return "eitaaChatId";
}

/** Drop this chat id from every subscriber except `keepUserId`. */
export function detachChatId(
  subscribers: Record<string, BotSubscriber>,
  chatId: string,
  messenger: BotMessenger,
  keepUserId?: string,
): void {
  const field = chatField(messenger);
  const cid = String(chatId);
  for (const [uid, sub] of Object.entries(subscribers)) {
    if (uid === keepUserId) continue;
    if (sub[field] === cid) delete sub[field];
  }
}

/** When several accounts still share a chat id, the newest linkedAt wins. */
export function findSubscriberByChatId(
  subscribers: Record<string, BotSubscriber>,
  chatId: string,
  messenger: BotMessenger,
): string | null {
  const field = chatField(messenger);
  const cid = String(chatId);
  let best: { uid: string; at: string } | null = null;
  for (const [uid, sub] of Object.entries(subscribers)) {
    if (sub[field] !== cid) continue;
    const at = sub.linkedAt || "";
    if (!best || at >= best.at) best = { uid, at };
  }
  return best?.uid ?? null;
}

function assignChat(
  store: StorageData,
  userId: string,
  chatId: string,
  messenger: BotMessenger,
  userName?: string,
): BotSubscriber {
  detachChatId(store.subscribers, chatId, messenger, userId);
  const existing = store.subscribers[userId] || {
    userId,
    userName: userName || "کاربر رادار",
    linkedAt: new Date().toISOString(),
  };
  existing[chatField(messenger)] = String(chatId);
  if (userName) existing.userName = userName;
  existing.linkedAt = new Date().toISOString();
  store.subscribers[userId] = existing;
  return existing;
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

/** اتصال چت‌آیدی پیام‌رسان‌ها به کاربر با استفاده از کد اتصال */
export async function linkChatWithCode(
  inputCode: string,
  chatId: string,
  messenger: "bale" | "telegram" | "rubika" | "eitaa",
  userName?: string,
): Promise<{ success: boolean; message: string; userId?: string }> {
  const store = await readStorage();
  const normalized = normalizeDigits(inputCode).trim();

  // ۱. بررسی امکان اتصال مستقیم با شماره موبایل یا ایمیل حساب کاربری در سایت
  const isPhoneOrEmail =
    normalized.includes("@") ||
    (normalized.startsWith("09") && normalized.length === 11) ||
    (normalized.startsWith("9") && normalized.length === 10);

  if (isPhoneOrEmail) {
    const { env } = await import("./env");
    if (env.hasSupabase && env.supabaseServiceRoleKey) {
      try {
        const { createClient } = await import("@supabase/supabase-js");
        const sb = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, { auth: { persistSession: false } });
        const cleanPhone = normalized.startsWith("9") && normalized.length === 10 ? "0" + normalized : normalized;

        const { data: matchedProfile } = await sb
          .from("profiles")
          .select("id, full_name, business_name, email, role")
          .or(`email.ilike.%${cleanPhone}%,email.eq.${normalized}`)
          .maybeSingle();

        if (matchedProfile?.id) {
          const colName =
            messenger === "rubika" ? "rubika_chat_id" : (messenger === "telegram" ? "telegram_chat_id" : messenger === "eitaa" ? "eitaa_chat_id" : "bale_chat_id");
          // profiles may not have *_chat_id yet. The subscriber file is the source of truth.
          const mirrored = await sb.from("profiles").update({ [colName]: String(chatId) }).eq("id", matchedProfile.id);
          if (mirrored.error && !/schema cache|could not find/i.test(mirrored.error.message)) {
            console.error("خطا در ذخیره شناسه چت روی پروفایل");
          }
          await registerDirectChat(
            matchedProfile.id,
            chatId,
            messenger,
            matchedProfile.business_name || matchedProfile.full_name,
          );
          return {
            success: true,
            message: `حساب کاربری شما در سایت با عنوان «${matchedProfile.business_name || matchedProfile.full_name || matchedProfile.email}» شناسایی و فوراً متصل شد.`,
            userId: matchedProfile.id,
          };
        }
      } catch (e) {
        console.error("خطا در جستجوی پروفایل سایت:", e);
      }
    }
  }

  // ۲. استخراج کد عددی ۴ تا ۶ رقمی یا فرمت قبلی RADAR-1234
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
      message: "کد اتصال، شماره موبایل یا ایمیل وارد شده در سامانه یافت نشد. لطفاً کد ۶ رقمی را از بخش «هشدارهای من» در سایت وارد کرده یا شماره ثبت‌نامی خود را بفرستید.",
    };
  }

  const existing = assignChat(store, userId, chatId, messenger, userName);
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
  isRubikaLinked: boolean;
  isEitaaLinked: boolean;
  baleChatId?: string;
  telegramChatId?: string;
  rubikaChatId?: string;
  eitaaChatId?: string;
}> {
  const code = await getOrCreateLinkCode(userId);
  const store = await readStorage();
  const sub = store.subscribers[userId];

  return {
    code,
    isBaleLinked: Boolean(sub?.baleChatId),
    isTelegramLinked: Boolean(sub?.telegramChatId),
    isRubikaLinked: Boolean(sub?.rubikaChatId),
    isEitaaLinked: Boolean(sub?.eitaaChatId),
    baleChatId: sub?.baleChatId,
    telegramChatId: sub?.telegramChatId,
    rubikaChatId: sub?.rubikaChatId,
    eitaaChatId: sub?.eitaaChatId,
  };
}

/** دریافت تمام شناسه‌های چت برای ارسال هشدار اختصاصی */
export async function getTargetChatsForUser(userId: string): Promise<{
  baleChats: string[];
  telegramChats: string[];
  rubikaChats: string[];
  eitaaChats: string[];
}> {
  const store = await readStorage();
  const sub = store.subscribers[userId];
  const baleChats: string[] = [];
  const telegramChats: string[] = [];
  const rubikaChats: string[] = [];
  const eitaaChats: string[] = [];

  // فقط اگر کاربر مدیر (دانیال) باشد، چت‌های پیش‌فرض مدیر اضافه می‌شوند
  if (userId === "admin" || userId === DANIAL_ADMIN_UUID || userId.includes("danyal")) {
    for (const c of DEFAULT_ADMIN_BALE_CHATS) {
      if (!baleChats.includes(c)) {
        baleChats.push(c);
      }
    }
    if (!telegramChats.includes(DEFAULT_ADMIN_TELEGRAM_CHAT)) {
      telegramChats.push(DEFAULT_ADMIN_TELEGRAM_CHAT);
    }
    if (!rubikaChats.includes(DEFAULT_ADMIN_RUBIKA_CHAT)) {
      rubikaChats.push(DEFAULT_ADMIN_RUBIKA_CHAT);
    }
  }

  // برای هر کاربر اختصاصی، پیام فقط به چت متصل به خودش ارسال می‌شود
  if (sub?.baleChatId && !baleChats.includes(sub.baleChatId)) {
    baleChats.push(sub.baleChatId);
  }
  if (sub?.telegramChatId && !telegramChats.includes(sub.telegramChatId)) {
    telegramChats.push(sub.telegramChatId);
  }
  if (sub?.rubikaChatId && !rubikaChats.includes(sub.rubikaChatId)) {
    rubikaChats.push(sub.rubikaChatId);
  }
  if (sub?.eitaaChatId && !eitaaChats.includes(sub.eitaaChatId)) {
    eitaaChats.push(sub.eitaaChatId);
  }

  return { baleChats, telegramChats, rubikaChats, eitaaChats };
}

/** یافتن یا اتصال کاربر بر اساس Chat ID پیام‌رسان */
export async function getUserIdByChatId(
  chatId: string,
  messenger: "bale" | "telegram" | "rubika" | "eitaa",
): Promise<string | null> {
  const cid = String(chatId);
  const store = await readStorage();
  const linked = findSubscriberByChatId(store.subscribers, cid, messenger);
  if (linked) return linked === "admin" ? DANIAL_ADMIN_UUID : linked;
  if (messenger === "bale" && DEFAULT_ADMIN_BALE_CHATS.includes(cid)) {
    return DANIAL_ADMIN_UUID;
  }
  return null;
}

/** ثبت مستقیم اتصال با Chat ID */
export async function registerDirectChat(
  userId: string,
  chatId: string,
  messenger: "bale" | "telegram" | "rubika" | "eitaa",
  userName?: string,
): Promise<BotSubscriber> {
  const store = await readStorage();
  const existing = assignChat(store, userId, chatId, messenger, userName);
  await writeStorage(store);
  return existing;
}
