/**
/**
 * کلاینت ارتباط با چت و احراز هویت دیوار (Divar Chat & Auth Client)
 */

export interface DivarAuthResult {
  ok: boolean;
  token?: string;
  message?: string;
}

export interface DivarSendResult {
  ok: boolean;
  conversationId?: string;
  error?: string;
}

const USER_AGENT =
  "Mozilla/5.0 (Linux; Android 13; SM-G998B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36 Divar/11.5.0";

/**
 * ارسال درخواست کد تایید به شماره همراه
 */
export async function requestDivarOtp(phone: string): Promise<DivarAuthResult> {
  const cleanPhone = phone.trim().replace(/^(\+98|0098)/, "0");
  try {
    const res = await fetch("https://api.divar.ir/v1/auth/authenticate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": USER_AGENT,
      },
      body: JSON.stringify({ phone: cleanPhone }),
      signal: AbortSignal.timeout(10000),
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      return { ok: true, message: "کد تایید پیامکی با موفقیت ارسال شد." };
    }
    return { ok: false, message: data.message || "خطا در ارسال کد تایید دیوار." };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { ok: false, message: `عدم پاسخگویی سرور دیوار: ${errorMsg}` };
  }
}

/**
 * تایید کد پیامکی و دریافت توکن دسترسی
 */
export async function verifyDivarOtp(phone: string, code: string): Promise<DivarAuthResult> {
  const cleanPhone = phone.trim().replace(/^(\+98|0098)/, "0");
  const cleanCode = code.trim();
  try {
    const res = await fetch("https://api.divar.ir/v1/auth/confirm", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": USER_AGENT,
      },
      body: JSON.stringify({ phone: cleanPhone, code: cleanCode }),
      signal: AbortSignal.timeout(10000),
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok && data.token) {
      return { ok: true, token: data.token, message: "ورود به حساب دیوار موفقیت‌آمیز بود." };
    }
    return { ok: false, message: data.message || "کد وارد شده صحیح نیست یا منقضی شده است." };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { ok: false, message: `خطا در تایید کد: ${errorMsg}` };
  }
}

/**
 * ایجاد مکالمه و ارسال پیام به فروشنده در چت دیوار
 */
export async function sendDivarChatMessage(
  token: string,
  postToken: string,
  text: string
): Promise<DivarSendResult> {
  if (!token) {
    return { ok: false, error: "توکن حساب دیوار تعریف نشده است." };
  }

  const cleanPostToken = postToken.trim();
  const authHeader = token.startsWith("Basic ") ? token : `Basic ${token}`;

  try {
    // ۱. ایجاد یا دریافت شناسه مکالمه (Conversation)
    const convRes = await fetch("https://chat.divar.ir/v1/conversations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
        "User-Agent": USER_AGENT,
      },
      body: JSON.stringify({
        post_token: cleanPostToken,
        type: "POST",
      }),
      signal: AbortSignal.timeout(12000),
    });

    const convData = await convRes.json().catch(() => ({}));
    const convId = convData.conversation_id || convData.id;

    if (!convRes.ok || !convId) {
      // اگر چت آگهی بسته باشد یا به دلیل محدودیت نتوان چت باز کرد
      return {
        ok: false,
        error: convData.message || "چت این آگهی بسته است یا امکان مکالمه وجود ندارد.",
      };
    }

    // ۲. ارسال پیام متنی در مکالمه
    const msgRes = await fetch("https://chat.divar.ir/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
        "User-Agent": USER_AGENT,
      },
      body: JSON.stringify({
        conversation_id: convId,
        text: text,
        type: "TEXT",
      }),
      signal: AbortSignal.timeout(12000),
    });

    const msgData = await msgRes.json().catch(() => ({}));
    if (msgRes.ok) {
      return { ok: true, conversationId: convId };
    }

    return {
      ok: false,
      error: msgData.message || "ارسال پیام در چت با خطا مواجه شد.",
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `خطای ارتباطی با چت دیوار: ${errorMsg}` };
  }
}

/**
 * لینک مستقیم چت دیوار برای باز کردن با یک کلیک در مرورگر یا اپ
 */
export function getDivarDirectChatUrl(postToken: string): string {
  return `https://divar.ir/v/-/${postToken.trim()}?openChat=true`;
}
