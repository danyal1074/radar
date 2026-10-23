/**
 * کلاینت ارتباط با چت و احراز هویت شیپور (Sheypoor Chat & Auth Client)
 */

export interface SheypoorAuthResult {
  ok: boolean;
  token?: string;
  message?: string;
}

export interface SheypoorSendResult {
  ok: boolean;
  conversationId?: string;
  error?: string;
}

const USER_AGENT =
  "Mozilla/5.0 (Linux; Android 13; SM-G998B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36 Sheypoor/8.5.0";

/**
 * درخواست کد تایید ورود به شیپور
 */
export async function requestSheypoorOtp(phone: string): Promise<SheypoorAuthResult> {
  const cleanPhone = phone.trim().replace(/^(\+98|0098)/, "0");
  try {
    const res = await fetch("https://www.sheypoor.com/api/v10.0.0/auth/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": USER_AGENT,
      },
      body: JSON.stringify({ username: cleanPhone }),
      signal: AbortSignal.timeout(10000),
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      return { ok: true, message: "کد تایید پیامکی شیپور ارسال شد." };
    }
    return { ok: false, message: data.message || "خطا در ارسال کد تایید شیپور." };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { ok: false, message: `عدم پاسخگویی سرور شیپور: ${errorMsg}` };
  }
}

/**
 * تایید کد پیامکی شیپور
 */
export async function verifySheypoorOtp(phone: string, code: string): Promise<SheypoorAuthResult> {
  const cleanPhone = phone.trim().replace(/^(\+98|0098)/, "0");
  const cleanCode = code.trim();
  try {
    const res = await fetch("https://www.sheypoor.com/api/v10.0.0/auth/verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": USER_AGENT,
      },
      body: JSON.stringify({ username: cleanPhone, code: cleanCode }),
      signal: AbortSignal.timeout(10000),
    });

    const data = await res.json().catch(() => ({}));
    const token = data?.data?.token || data?.token;
    if (res.ok && token) {
      return { ok: true, token, message: "ورود به حساب شیپور موفقیت‌آمیز بود." };
    }
    return { ok: false, message: data.message || "کد شیپور صحیح نیست." };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { ok: false, message: `خطا در تایید کد شیپور: ${errorMsg}` };
  }
}

/**
 * ارسال پیام در چت شیپور
 */
export async function sendSheypoorChatMessage(
  token: string,
  listingId: string,
  text: string
): Promise<SheypoorSendResult> {
  if (!token) {
    return { ok: false, error: "توکن حساب شیپور تعریف نشده است." };
  }

  const cleanId = listingId.trim();
  const authHeader = token.startsWith("Bearer ") ? token : `Bearer ${token}`;

  try {
    const res = await fetch("https://chat.sheypoor.com/api/v1/conversations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
        "User-Agent": USER_AGENT,
      },
      body: JSON.stringify({
        listing_id: cleanId,
        message: text,
      }),
      signal: AbortSignal.timeout(12000),
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      return { ok: true, conversationId: data.id || cleanId };
    }

    return {
      ok: false,
      error: data.message || "امکان ارسال پیام در چت شیپور وجود ندارد.",
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `خطای ارتباط با سرور شیپور: ${errorMsg}` };
  }
}

/**
 * لینک مستقیم مشاهده آگهی شیپور برای چت دستی
 */
export function getSheypoorDirectChatUrl(listingId: string): string {
  return `https://www.sheypoor.com/${listingId.trim()}`;
}
