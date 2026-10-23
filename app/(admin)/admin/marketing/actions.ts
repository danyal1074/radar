"use server";

import { revalidatePath } from "next/cache";
import { requireContext } from "@/lib/auth";
import {
  getMarketingConfig,
  updateMarketingConfig,
  getTodaySentCount,
} from "@/lib/marketing/store";
import { requestDivarOtp, verifyDivarOtp } from "@/lib/marketing/divar";
import { requestSheypoorOtp, verifySheypoorOtp } from "@/lib/marketing/sheypoor";
import { executeMarketingSend } from "@/lib/marketing/engine";

export async function saveMarketingConfigAction(formData: FormData) {
  await requireContext({ admin: true });

  const adLink = String(formData.get("adLink") || "").trim();
  const sheypoorAdLink = String(formData.get("sheypoorAdLink") || "").trim();
  const template = String(formData.get("template") || "").trim();
  const dailyLimit = Number(formData.get("dailyLimit") || 25);
  const delaySeconds = Number(formData.get("delaySeconds") || 60);
  const targetCity = String(formData.get("targetCity") || "مشهد").trim();
  const autoSendEnabled =
    formData.get("autoSendEnabled") === "true" ||
    formData.get("autoSendEnabled") === "on" ||
    formData.get("autoSendEnabled") === "1";

  await updateMarketingConfig({
    adLink,
    sheypoorAdLink,
    template,
    dailyLimit,
    delaySeconds,
    targetCity,
    autoSendEnabled,
  });

  revalidatePath("/admin/marketing");
  return { ok: true, message: "تنظیمات کمپین تبلیغاتی ذخیره شد." };
}

export async function toggleAutoSendAction(enabled: boolean) {
  await requireContext({ admin: true });
  await updateMarketingConfig({ autoSendEnabled: enabled });
  revalidatePath("/admin/marketing");
  return { ok: true, autoSendEnabled: enabled };
}

export async function requestDivarOtpAction(formData: FormData) {
  await requireContext({ admin: true });
  const phone = String(formData.get("phone") || "").trim();
  if (!phone) return { ok: false, message: "شماره موبایل الزامی است." };

  const res = await requestDivarOtp(phone);
  if (res.ok) {
    await updateMarketingConfig({
      divarPhone: phone,
      divarSession:
        res.deviceId && res.preAuthSessionId
          ? { deviceId: res.deviceId, preAuthSessionId: res.preAuthSessionId }
          : undefined,
    });
  }
  return res;
}

export async function verifyDivarOtpAction(formData: FormData) {
  await requireContext({ admin: true });
  const phone = String(formData.get("phone") || "").trim();
  const code = String(formData.get("code") || "").trim();

  const config = await getMarketingConfig();
  const res = await verifyDivarOtp(phone, code, config.divarSession);
  if (res.ok && res.token) {
    await updateMarketingConfig({
      divarPhone: phone,
      divarToken: res.token,
      divarSession: undefined,
    });
    revalidatePath("/admin/marketing");
  }
  return res;
}

export async function saveManualDivarTokenAction(formData: FormData) {
  await requireContext({ admin: true });
  const token = String(formData.get("token") || "").trim();
  const phone = String(formData.get("phone") || "").trim();

  await updateMarketingConfig({ divarToken: token, divarPhone: phone });
  revalidatePath("/admin/marketing");
  return { ok: true, message: "توکن دیوار با موفقیت ثبت شد." };
}

export async function requestSheypoorOtpAction(formData: FormData) {
  await requireContext({ admin: true });
  const phone = String(formData.get("phone") || "").trim();
  if (!phone) return { ok: false, message: "شماره موبایل الزامی است." };

  const res = await requestSheypoorOtp(phone);
  if (res.ok) {
    await updateMarketingConfig({ sheypoorPhone: phone });
  }
  return res;
}

export async function verifySheypoorOtpAction(formData: FormData) {
  await requireContext({ admin: true });
  const phone = String(formData.get("phone") || "").trim();
  const code = String(formData.get("code") || "").trim();

  const res = await verifySheypoorOtp(phone, code);
  if (res.ok && res.token) {
    await updateMarketingConfig({ sheypoorPhone: phone, sheypoorToken: res.token });
    revalidatePath("/admin/marketing");
  }
  return res;
}

export async function sendSingleChatMessageAction(listingId: string) {
  const ctx = await requireContext({ admin: true });
  const listing = await ctx.store.getListing(listingId);
  if (!listing) return { ok: false, message: "آگهی مورد نظر در سیستم یافت نشد." };

  const result = await executeMarketingSend(listing);
  revalidatePath("/admin/marketing");
  return result;
}

export async function markMarketingSentAction(listingId: string, messageText: string) {
  const ctx = await requireContext({ admin: true });
  const listing = await ctx.store.getListing(listingId);
  if (!listing) return { ok: false };

  const { recordMarketingLog } = await import("@/lib/marketing/store");
  await recordMarketingLog({
    id: `mkt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    listingId: listing.id,
    source: listing.source === "sheypoor" ? "sheypoor" : "divar",
    postToken: listing.source_post_id,
    carTitle: listing.title,
    priceToman: listing.price_toman,
    city: listing.city || "مشهد",
    messageText,
    status: "sent",
    sentAt: new Date().toISOString(),
  });

  revalidatePath("/admin/marketing");
  return { ok: true };
}

export async function markMultipleMarketingSentAction(listingIds: string[]) {
  const ctx = await requireContext({ admin: true });
  const { recordMarketingLog } = await import("@/lib/marketing/store");

  for (const id of listingIds) {
    const listing = await ctx.store.getListing(id);
    if (!listing) continue;
    await recordMarketingLog({
      id: `mkt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      listingId: listing.id,
      source: listing.source === "sheypoor" ? "sheypoor" : "divar",
      postToken: listing.source_post_id,
      carTitle: listing.title,
      priceToman: listing.price_toman,
      city: listing.city || "مشهد",
      messageText: "علامت‌گذاری به عنوان ارسال‌شده توسط مدیر",
      status: "sent",
      sentAt: new Date().toISOString(),
    });
  }

  revalidatePath("/admin/marketing");
  return { ok: true, count: listingIds.length };
}

export async function getMarketingStatsAction() {
  await requireContext({ admin: true });
  const config = await getMarketingConfig();
  const [divarToday, sheypoorToday] = await Promise.all([
    getTodaySentCount("divar"),
    getTodaySentCount("sheypoor"),
  ]);

  return {
    divarToday,
    sheypoorToday,
    dailyLimit: config.dailyLimit,
    isDivarConnected: Boolean(config.divarToken),
    isSheypoorConnected: Boolean(config.sheypoorToken),
    divarPhone: config.divarPhone,
    sheypoorPhone: config.sheypoorPhone,
  };
}
