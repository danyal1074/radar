import { NextResponse } from "next/server";
import { getServiceStore } from "@/lib/db";
import { registerDirectChat } from "@/lib/bot-linker";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

function getServiceClient() {
  if (!env.hasSupabase || !env.supabaseServiceRoleKey) return null;
  return createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function normalizePhone(raw: string): string {
  const p2e = raw.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
  const clean = p2e.replace(/[\s\-_+]/g, "");
  if (clean.startsWith("98") && clean.length === 12) {
    return "0" + clean.slice(2);
  }
  if (!clean.startsWith("0") && clean.length === 10) {
    return "0" + clean;
  }
  return clean;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { chatId, messenger = "bale", fullName, businessName, phone, city } = body;

    if (!chatId) {
      return NextResponse.json({ ok: false, message: "شناسه چت الزامی است." }, { status: 400 });
    }

    const cleanName = String(fullName || "").trim() || "کاربر جدید";
    const cleanBusiness = String(businessName || "").trim() || cleanName;
    const cleanPhone = normalizePhone(String(phone || ""));
    const cleanCity = String(city || "مشهد").trim();

    const sb = getServiceClient();
    const store = await getServiceStore();
    let userId: string | null = null;

    if (sb) {
      const colName =
        messenger === "rubika"
          ? "rubika_chat_id"
          : messenger === "telegram"
          ? "telegram_chat_id"
          : "bale_chat_id";

      // ۱. جستجو برای کاربر موجود بر اساس چت‌آیدی یا ایمیل فرضی شماره
      const { data: existingProfile } = await sb
        .from("profiles")
        .select("id, email")
        .eq(colName, String(chatId))
        .maybeSingle();

      if (existingProfile?.id) {
        userId = existingProfile.id;
        await sb.from("profiles").update({
          full_name: cleanName,
          business_name: cleanBusiness,
          city: cleanCity,
        }).eq("id", userId);
      } else {
        // ایجاد اکانت در سیستم احراز هویت Supabase
        const email = cleanPhone ? `${cleanPhone}@radar.local` : `bale_${chatId}_${Date.now().toString(36)}@radar.local`;
        const password = `Radar_${chatId}_${Date.now()}`;

        const { data: newUser } = await sb.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            display_name: cleanName,
            business_name: cleanBusiness,
            phone: cleanPhone,
            messenger,
            chat_id: String(chatId),
          },
        });

        if (newUser?.user?.id) {
          userId = newUser.user.id;
          await sb.from("profiles").upsert({
            id: userId,
            email,
            full_name: cleanName,
            business_name: cleanBusiness,
            city: cleanCity,
            [colName]: String(chatId),
            role: "user",
          });
        }
      }

      if (userId) {
        // فعال‌سازی اشتراک آزمایشی ۱۴ روزه رایگان
        const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
        try {
          await store.setSubscription(userId, {
            plan: "trial",
            status: "trialing",
            trial_ends_at: expiresAt,
            current_period_end: expiresAt,
          });
        } catch (subErr) {
          console.error("[Bot Register] Subscription error:", subErr);
        }
      }
    }

    if (!userId) {
      userId = `user_${messenger}_${chatId}`;
    }

    // اتصال مستقیم به شناسه چت پیام‌رسان
    await registerDirectChat(userId, String(chatId), messenger as any, cleanName);

    return NextResponse.json({
      ok: true,
      userId,
      fullName: cleanName,
      businessName: cleanBusiness,
      phone: cleanPhone,
      city: cleanCity,
      trialDays: 14,
      message: "ثبت‌نام با موفقیت انجام شد و اشتراک ۱۴ روزه فعال گردید.",
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, message: `خطا در ثبت‌نام: ${errorMsg}` }, { status: 500 });
  }
}
