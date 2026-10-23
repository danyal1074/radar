import crypto from "node:crypto";

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
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

/**
 * ارسال درخواست کد تایید به شماره همراه
 */
export async function requestDivarOtp(phone: string): Promise<DivarAuthResult> {
  const cleanPhone = phone.trim().replace(/^(\+98|0098)/, "0");
  try {
    const res = await fetch("https://api.divar.ir/v5/auth/authenticate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": USER_AGENT,
        Referer: "https://divar.ir/",
        Origin: "https://divar.ir",
      },
      body: JSON.stringify({ phone: cleanPhone }),
      signal: AbortSignal.timeout(10000),
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok || data.authenticate_response === "AUTHENTICATION_VERIFICATION_CODE_SENT") {
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
    const res = await fetch("https://api.divar.ir/v5/auth/confirm", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": USER_AGENT,
        Referer: "https://divar.ir/",
        Origin: "https://divar.ir",
      },
      body: JSON.stringify({ phone: cleanPhone, code: cleanCode }),
      signal: AbortSignal.timeout(10000),
    });

    const data = await res.json().catch(() => ({}));
    const token = data.token || data.access_token || data.data?.token || data.user_token;
    if (res.ok && token) {
      return { ok: true, token, message: "ورود به حساب دیوار موفقیت‌آمیز بود." };
    }
    return { ok: false, message: data.message || "کد وارد شده صحیح نیست یا منقضی شده است." };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { ok: false, message: `خطا در تایید کد: ${errorMsg}` };
  }
}

/**
 * ارسال پیام مستقیم به فروشنده در چت دیوار با وب‌سرویس اصلی چت دیوار
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
  const rawToken = token.replace(/^Basic\s+/i, "").trim();
  const authHeader = `Basic ${rawToken}`;
  const commonHeaders = {
    "Content-Type": "application/json",
    Authorization: authHeader,
    Cookie: `token=${rawToken}`,
    "User-Agent": USER_AGENT,
    Referer: `https://divar.ir/chat/${cleanPostToken}`,
    Origin: "https://divar.ir",
    "X-Standard-Divar-Error": "true",
  };

  try {
    // مرحله ۱: راه‌اندازی و واکشی اطلاعات مکالمه با فروشنده
    const initRes = await fetch("https://api.divar.ir/chat/api/get-or-init-conversation", {
      method: "POST",
      headers: commonHeaders,
      body: JSON.stringify({ conversation_id: cleanPostToken }),
      signal: AbortSignal.timeout(12000),
    });

    const initData = await initRes.json().catch(() => ({}));
    if (!initRes.ok) {
      const errMsg =
        initData.message ||
        initData.error ||
        (initRes.status === 403
          ? "امکان چت برای این آگهی بسته است یا دسترسی مسدود شده است."
          : `خطا در باز کردن چت (کد ${initRes.status})`);
      return { ok: false, error: errMsg };
    }

    const conversationId = initData.conversation?.id || cleanPostToken;
    const clientReference = crypto.randomUUID();

    // مرحله ۲: ارسال پیام به شناسه گفتگو با ساختار رسمی دیوار
    const sendRes = await fetch("https://api.divar.ir/chat/api/send-message", {
      method: "POST",
      headers: commonHeaders,
      body: JSON.stringify({
        conversation_id: conversationId,
        client_reference: clientReference,
        text: {
          text: text,
        },
      }),
      signal: AbortSignal.timeout(12000),
    });

    const sendData = await sendRes.json().catch(() => ({}));

    if (sendRes.ok && sendData.sent_message) {
      return { ok: true, conversationId: sendData.sent_message.conversation_id || conversationId };
    }

    if (sendRes.ok) {
      return { ok: true, conversationId };
    }

    const errMsg =
      sendData.message ||
      sendData.error ||
      (sendRes.status === 403
        ? "ارسال پیام توسط دیوار رد شد (محدودیت یا نیاز به تأیید)."
        : `خطای سرور دیوار در ارسال (کد ${sendRes.status})`);

    return {
      ok: false,
      error: errMsg,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `خطای ارتباطی با وب‌سرویس چت دیوار: ${errorMsg}` };
  }
}

/**
 * لینک مستقیم چت دیوار برای باز کردن با یک کلیک در مرورگر یا اپ
 */
export function getDivarDirectChatUrl(postToken: string): string {
  return `https://divar.ir/chat/${postToken.trim()}`;
}
