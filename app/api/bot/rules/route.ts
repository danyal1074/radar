import { NextResponse } from "next/server";
import { getServiceStore } from "@/lib/db";
import { getUserIdByChatId, registerDirectChat } from "@/lib/bot-linker";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

function getServiceClient() {
  if (!env.hasSupabase || !env.supabaseServiceRoleKey) return null;
  return createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

const DANIAL_ADMIN_UUID = "97375339-be50-403e-be7b-0aee1b7c2d99";

/** یافتن یا ساخت خودکار حساب کاربری برای کاربر پیام‌رسان بله/تلگرام با ۱۴ روز اشتراک رایگان */
async function resolveOrCreateUserId(chatId: string, messenger: "bale" | "telegram", userName?: string): Promise<string> {
  // مدیر کل سامانه (دانیال)
  if (String(chatId) === "772511114") {
    await registerDirectChat(DANIAL_ADMIN_UUID, chatId, messenger, "دانیال حقدادی (مدیر)");
    return DANIAL_ADMIN_UUID;
  }

  // ۱. بررسی اشتراک‌های قبلی
  const existingUserId = await getUserIdByChatId(chatId, messenger);
  if (existingUserId && existingUserId !== "admin") {
    return existingUserId;
  }

  const sb = getServiceClient();
  if (sb) {
    // ۲. بررسی در پروفایل‌های Supabase
    const { data: profile } = await sb
      .from("profiles")
      .select("id")
      .eq("bale_chat_id", String(chatId))
      .maybeSingle();

    if (profile?.id) {
      await registerDirectChat(profile.id, chatId, messenger, userName);
      return profile.id;
    }

    // ۳. ایجاد خودکار کاربر جدید در سیستم با دوره آزمایشی ۱۴ روزه
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const mockEmail = `bale_${chatId}_${randomSuffix}@radar.local`;
    const mockPassword = `BaleRadar_${chatId}_${Date.now()}`;

    const { data: newUser, error: createErr } = await sb.auth.admin.createUser({
      email: mockEmail,
      password: mockPassword,
      email_confirm: true,
      user_metadata: {
        display_name: userName || `کاربر بله (${chatId})`,
        messenger,
        chat_id: String(chatId),
      },
    });

    if (newUser?.user?.id) {
      const uid = newUser.user.id;
      // ایجاد پروفایل
      await sb.from("profiles").upsert({
        id: uid,
        email: mockEmail,
        display_name: userName || `کاربر بله (${chatId})`,
        bale_chat_id: String(chatId),
        role: "user",
      });

      // فعال‌سازی اشتراک ۱۴ روزه رایگان
      const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
      await sb.from("subscriptions").upsert({
        user_id: uid,
        plan_tier: "trial",
        status: "active",
        current_period_end: expiresAt,
      });

      await registerDirectChat(uid, chatId, messenger, userName);
      return uid;
    }
  }

  // Fallback برای حالت توسعه بدون سوپابیس
  const fallbackId = `user_${messenger}_${chatId}`;
  await registerDirectChat(fallbackId, chatId, messenger, userName);
  return fallbackId;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const chatId = searchParams.get("chatId");
    const messenger = (searchParams.get("messenger") || "bale") as "bale" | "telegram";

    if (!chatId) {
      return NextResponse.json({ ok: false, message: "شناسه چت الزامی است" }, { status: 400 });
    }

    const userId = await resolveOrCreateUserId(chatId, messenger);
    const store = await getServiceStore();
    const rules = await store.listRules(userId);

    return NextResponse.json({
      ok: true,
      userId,
      rules,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "خطای داخلی سرور";
    return NextResponse.json({ ok: false, message: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { chatId, messenger, userName, rule } = body;

    if (!chatId || !rule || !rule.name) {
      return NextResponse.json({ ok: false, message: "اطلاعات فیلتر ناقص است" }, { status: 400 });
    }

    const userId = await resolveOrCreateUserId(String(chatId), messenger || "bale", userName);
    const store = await getServiceStore();

    const newRule = await store.createRule(userId, {
      name: rule.name,
      make: rule.make || null,
      model: rule.model || null,
      year_min: rule.year_min || null,
      year_max: rule.year_max || null,
      price_min_toman: rule.price_min_toman || null,
      price_max_toman: rule.price_max_toman || null,
      min_discount_percent: rule.min_discount_percent !== undefined ? rule.min_discount_percent : 0,
      min_discount_toman: rule.min_discount_toman || null,
      mileage_min_km: null,
      mileage_max_km: null,
      city: "تربت‌حیدریه",
      source: null,
      is_active: true,
      urgent_only: rule.urgent_only || false,
      paint_free_only: rule.paint_free_only || false,
    });

    return NextResponse.json({
      ok: true,
      message: "فیلتر جدید با موفقیت فعال شد! ✅",
      rule: newRule,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "خطا در ثبت فیلتر";
    return NextResponse.json({ ok: false, message: msg }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    const { chatId, messenger, ruleId } = body;

    if (!chatId || !ruleId) {
      return NextResponse.json({ ok: false, message: "شناسه فیلتر الزامی است" }, { status: 400 });
    }

    const userId = await resolveOrCreateUserId(String(chatId), messenger || "bale");
    const store = await getServiceStore();
    await store.deleteRule(userId, ruleId);

    return NextResponse.json({
      ok: true,
      message: "فیلتر با موفقیت حذف شد 🗑️",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "خطا در حذف فیلتر";
    return NextResponse.json({ ok: false, message: msg }, { status: 500 });
  }
}
