import { NextResponse } from "next/server";
import { getServiceStore } from "@/lib/db";
import { getUserIdByChatId, registerDirectChat } from "@/lib/bot-linker";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import { PLANS, resolveAccess } from "@/lib/plans";

export const dynamic = "force-dynamic";

function getServiceClient() {
  if (!env.hasSupabase || !env.supabaseServiceRoleKey) return null;
  return createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

const DANIAL_ADMIN_UUID = "97375339-be50-403e-be7b-0aee1b7c2d99";
const DANIAL_RUBIKA_CHAT = "b0BRnXf0BMoZ02419247225b30f018fe";

/** یافتن حساب کاربری ثبت‌شده متصل به کاربر پیام‌رسان */
async function findExistingUserId(
  chatId: string,
  messenger: "bale" | "telegram" | "rubika" | "eitaa",
  userName?: string,
): Promise<string | null> {
  // مدیر کل سامانه (دانیال)
  if (String(chatId) === "772511114" || String(chatId) === DANIAL_RUBIKA_CHAT) {
    await registerDirectChat(DANIAL_ADMIN_UUID, chatId, messenger, "دانیال حقدادی (مدیر)");
    return DANIAL_ADMIN_UUID;
  }

  // ۱. بررسی چت‌آیدی‌های متصل
  const existingUserId = await getUserIdByChatId(chatId, messenger);
  if (existingUserId && existingUserId !== "admin") {
    return existingUserId;
  }

  const sb = getServiceClient();
  if (sb) {
    // ۲. بررسی در پروفایل‌های دیتابیس
    const colName =
      messenger === "rubika"
        ? "rubika_chat_id"
        : messenger === "telegram"
        ? "telegram_chat_id"
        : "bale_chat_id";

    const { data: profile } = await sb
      .from("profiles")
      .select("id")
      .eq(colName, String(chatId))
      .maybeSingle();

    if (profile?.id) {
      await registerDirectChat(profile.id, chatId, messenger, userName);
      return profile.id;
    }
  }

  return null;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const chatId = searchParams.get("chatId");
    const messenger = (searchParams.get("messenger") || "bale") as "bale" | "telegram" | "rubika" | "eitaa";

    if (!chatId) {
      return NextResponse.json({ ok: false, message: "شناسه چت الزامی است" }, { status: 400 });
    }

    const userId = await findExistingUserId(chatId, messenger);
    if (!userId) {
      return NextResponse.json({
        ok: true,
        registered: false,
        hasAccess: false,
        message: "حساب کاربری یافت نشد. لطفاً ابتدا در سامانه ثبت‌نام کنید.",
      });
    }

    const store = await getServiceStore();
    const profile = await store.getProfile(userId);
    const sub = await store.getSubscription(userId);
    const access = resolveAccess(sub);
    const plan = PLANS[access.plan];

    const isPlanExpired = !access.hasAccess && profile?.role !== "admin" && userId !== DANIAL_ADMIN_UUID;
    if (isPlanExpired) {
      return NextResponse.json({
        ok: true,
        registered: true,
        hasAccess: false,
        planExpired: true,
        planName: plan.name,
        message: "اشتراک شما به پایان رسیده است. برای ادامه، لطفاً پلن خود را تمدید فرمایید.",
      });
    }

    const rules = await store.listRules(userId);
    const allowedCitiesCount = (profile?.role === "admin" || userId === DANIAL_ADMIN_UUID) ? 2 : plan.allowedCitiesCount;
    const userCity = profile?.city?.includes("مشهد") ? "مشهد" : "تربت‌حیدریه";

    return NextResponse.json({
      ok: true,
      registered: true,
      hasAccess: true,
      planExpired: false,
      userId,
      userCity,
      allowedCitiesCount,
      planName: plan.name,
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

    const userId = await findExistingUserId(String(chatId), messenger || "bale", userName);
    if (!userId) {
      return NextResponse.json(
        {
          ok: false,
          needsRegistration: true,
          message: "برای استفاده از ربات و تعریف فیلتر، ابتدا باید در سامانه ثبت‌نام فرمایید.",
        },
        { status: 403 }
      );
    }

    const store = await getServiceStore();
    const profile = await store.getProfile(userId);
    const sub = await store.getSubscription(userId);
    const access = resolveAccess(sub);
    const plan = PLANS[access.plan];

    if (!access.hasAccess && profile?.role !== "admin" && userId !== DANIAL_ADMIN_UUID) {
      return NextResponse.json(
        {
          ok: false,
          planExpired: true,
          message: "اشتراک شما به پایان رسیده است. لطفاً برای تمدید اشتراک به سایت مراجعه کنید.",
        },
        { status: 403 }
      );
    }

    const allowedCitiesCount = (profile?.role === "admin" || userId === DANIAL_ADMIN_UUID) ? 2 : plan.allowedCitiesCount;
    const userCity = profile?.city?.includes("مشهد") ? "مشهد" : "تربت‌حیدریه";

    let ruleCity = rule.city || null;
    if (allowedCitiesCount === 1) {
      ruleCity = userCity;
    }

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
      city: ruleCity,
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

    const userId = await findExistingUserId(String(chatId), messenger || "bale");
    if (!userId) {
      return NextResponse.json({ ok: false, message: "کاربر یافت نشد" }, { status: 403 });
    }

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
