import crypto from "node:crypto";

/**
 * کلاینت ارتباط با چت و احراز هویت دیوار (Divar Chat & Auth Client)
 */

export interface DivarAuthResult {
  ok: boolean;
  token?: string;
  message?: string;
  deviceId?: string;
  preAuthSessionId?: string;
}

export interface DivarSendResult {
  ok: boolean;
  conversationId?: string;
  error?: string;
}

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

/**
 * اعتبارسنجی فرمت رسمی توکن دسترسی دیوار (باید ساختار ۳ بخشی JWT داشته باشد)
 */
export function isJwtToken(token: string): boolean {
  if (!token) return false;
  const clean = token.replace(/^Basic\s+/i, "").trim();
  return /^[A-Za-z0-9_-]{2,}(?:\.[A-Za-z0-9_-]{2,}){2}$/.test(clean);
}

/**
 * ارسال درخواست کد تایید به شماره همراه با وب‌سرویس جدید دیوار (v8)
 */
export async function requestDivarOtp(phone: string): Promise<DivarAuthResult> {
  const cleanPhone = phone.trim();
  const formattedPhone = cleanPhone.startsWith("+98")
    ? cleanPhone
    : "+98" + cleanPhone.replace(/^0/, "");

  try {
    // روش مدرن و فعال دیوار (v8 signinup)
    const res = await fetch("https://api.divar.ir/v8/authenticate/signinup/code", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": USER_AGENT,
        Referer: "https://divar.ir/",
        Origin: "https://divar.ir",
      },
      body: JSON.stringify({ phoneNumber: formattedPhone }),
      signal: AbortSignal.timeout(10000),
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok && (data.status === "OK" || data.deviceId || data.preAuthSessionId)) {
      return {
        ok: true,
        message: "کد تایید پیامکی با موفقیت ارسال شد.",
        deviceId: data.deviceId,
        preAuthSessionId: data.preAuthSessionId,
      };
    }

    // فال‌بک به v5 در صورت نیاز
    const fallbackRes = await fetch("https://api.divar.ir/v5/auth/authenticate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": USER_AGENT,
        Referer: "https://divar.ir/",
        Origin: "https://divar.ir",
      },
      body: JSON.stringify({ phone: cleanPhone.replace(/^(\+98|0098)/, "0") }),
      signal: AbortSignal.timeout(10000),
    });

    const fbData = await fallbackRes.json().catch(() => ({}));
    if (fallbackRes.ok || fbData.authenticate_response === "AUTHENTICATION_VERIFICATION_CODE_SENT") {
      return { ok: true, message: "کد تایید پیامکی ارسال شد." };
    }

    return {
      ok: false,
      message:
        data.message ||
        fbData.message ||
        "خطا در ارسال کد تایید دیوار (احتمالاً محدودیت تعداد درخواست یا مسدودی موقت).",
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { ok: false, message: `عدم پاسخگویی سرور دیوار: ${errorMsg}` };
  }
}

/**
 * تایید کد پیامکی و دریافت توکن دسترسی معتبر
 */
export async function verifyDivarOtp(
  phone: string,
  code: string,
  session?: { deviceId?: string; preAuthSessionId?: string }
): Promise<DivarAuthResult> {
  const cleanCode = code.trim();
  const cleanPhone = phone.trim().replace(/^(\+98|0098)/, "0");

  try {
    // ۱. ابتدا تلاش با روش رسمی v5 که مستقیماً توکن JWT برمی‌گرداند
    try {
      const fbRes = await fetch("https://api.divar.ir/v5/auth/confirm", {
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

      const fbData = await fbRes.json().catch(() => ({}));
      const candidateToken =
        fbData.token || fbData.access_token || fbData.data?.token || fbData.user_token;

      if (fbRes.ok && candidateToken && isJwtToken(candidateToken)) {
        return { ok: true, token: candidateToken, message: "ورود به حساب دیوار با موفقیت انجام شد." };
      }
    } catch {
      // ادامه به متد v8 در صورت عدم پاسخ v5
    }

    // ۲. بررسی با نشست v8
    if (session?.deviceId && session?.preAuthSessionId) {
      const res = await fetch("https://api.divar.ir/v8/authenticate/signinup/code/consume", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": USER_AGENT,
          Referer: "https://divar.ir/",
          Origin: "https://divar.ir",
        },
        body: JSON.stringify({
          deviceId: session.deviceId,
          preAuthSessionId: session.preAuthSessionId,
          userInputCode: cleanCode,
        }),
        signal: AbortSignal.timeout(10000),
      });

      const setCookie = res.headers.get("set-cookie") || "";
      const cookieMatch = setCookie.match(/token=([^;]+)/);
      const data = await res.json().catch(() => ({}));

      const candidates = [
        cookieMatch ? cookieMatch[1] : null,
        data.token,
        data.access_token,
        data.data?.token,
      ].filter(Boolean) as string[];

      for (const cand of candidates) {
        if (isJwtToken(cand)) {
          return { ok: true, token: cand, message: "ورود به حساب دیوار با موفقیت انجام شد." };
        }
      }
    }

    return { ok: false, message: "کد وارد شده نامعتبر است یا توکن معتبر دریافت نشد." };
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

  if (!isJwtToken(token)) {
    return {
      ok: false,
      error:
        "توکن دیوار نامعتبر است (فرمت رسمی JWT ندارد). لطفاً در تب تنظیمات مجدداً با شماره وارد شوید یا توکن معتبر را دستی ثبت فرمایید.",
    };
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
