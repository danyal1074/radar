import "server-only";
import { randomBytes } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { dataMode, getDevStore, getServiceStore, getUserStore } from "../db";
import type { Store } from "../db/store";
import { env } from "../env";
import { resolveAccess, type Access } from "../plans";
import type { Profile } from "../types";
import type { z } from "zod";
import type { loginSchema, registerSchema } from "../validation";
import { hashPassword, verifyPassword } from "./password";
import { signSession, verifySession } from "./session-token";

export const DEV_COOKIE = "cr_session";
const SESSION_DAYS = 14;

export interface SessionUser {
  id: string;
  email: string;
}

export type AuthResult = { ok: true; needsEmailConfirmation?: boolean } | { ok: false; error: string };

// ---------------- dev-mode secret ----------------
async function devSecret(): Promise<string> {
  if (env.sessionSecret.length >= 32) return env.sessionSecret;
  if (env.isProduction) throw new Error("SESSION_SECRET (حداقل ۳۲ کاراکتر) باید تنظیم شود.");
  const file = path.resolve(/*turbopackIgnore: true*/ process.cwd(), ".data/session-secret");
  try {
    return (await fs.readFile(file, "utf8")).trim();
  } catch {
    const s = randomBytes(32).toString("hex");
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, s, { mode: 0o600 });
    return s;
  }
}

// ---------------- current user ----------------
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  if (dataMode() === "supabase") {
    const { createUserClient } = await import("../supabase/server");
    const supabase = await createUserClient();
    // getUser() validates the JWT with Supabase Auth (never trust getSession() alone).
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user?.email) return null;
    return { id: data.user.id, email: data.user.email };
  }
  const jar = await cookies();
  const payload = verifySession(jar.get(DEV_COOKIE)?.value, await devSecret());
  if (!payload) return null;
  const store = await getDevStore();
  const profile = await store.getProfile(payload.uid);
  return profile ? { id: profile.id, email: profile.email } : null;
});

// ---------------- sign up / in / out ----------------
type RegisterInput = z.infer<typeof registerSchema>;
type LoginInput = z.infer<typeof loginSchema>;

async function setDevCookie(uid: string) {
  const jar = await cookies();
  const exp = Math.floor(Date.now() / 1000) + SESSION_DAYS * 86_400;
  jar.set(DEV_COOKIE, signSession({ uid, exp }, await devSecret()), {
    httpOnly: true,
    sameSite: "lax",
    secure: env.isProduction,
    path: "/",
    maxAge: SESSION_DAYS * 86_400,
  });
}

export async function signUp(input: RegisterInput): Promise<AuthResult> {
  const role = env.adminEmails.includes(input.email) ? "admin" : "dealer";
  if (dataMode() === "supabase") {
    const { createUserClient, createServiceClient } = await import("../supabase/server");
    const serviceClient = createServiceClient();

    // ساخت کاربر با تأیید خودکار ایمیل جهت تست و استفاده فوری بدون نیاز به لینک ایمیل
    const { data: adminData, error: adminError } = await serviceClient.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: true,
      user_metadata: {
        full_name: input.full_name,
        business_name: input.business_name,
        city: input.city,
      },
    });

    if (adminError) {
      return {
        ok: false,
        error: /registered|exists/i.test(adminError.message)
          ? "این ایمیل قبلاً ثبت شده است"
          : "ثبت‌نام انجام نشد: " + adminError.message,
      };
    }

    if (adminData.user && role === "admin") {
      await serviceClient.from("profiles").update({ role: "admin" }).eq("id", adminData.user.id);
    }

    // لاگین خودکار کاربر جدید تا بلافاصله وارد پنل شود
    const supabase = await createUserClient();
    await supabase.auth.signInWithPassword({
      email: input.email,
      password: input.password,
    });

    return { ok: true };
  }
  const store = await getDevStore();
  const profile = await store.createUser({
    email: input.email,
    passwordHash: await hashPassword(input.password),
    full_name: input.full_name,
    business_name: input.business_name,
    city: input.city,
    role,
  });
  if (!profile) return { ok: false, error: "این ایمیل قبلاً ثبت شده است" };
  await setDevCookie(profile.id);
  return { ok: true };
}

export async function signIn(input: LoginInput): Promise<AuthResult> {
  const generic = "ایمیل یا رمز عبور نادرست است";
  if (dataMode() === "supabase") {
    const { createUserClient } = await import("../supabase/server");
    const supabase = await createUserClient();
    const { error } = await supabase.auth.signInWithPassword(input);
    if (error) return { ok: false, error: /confirm/i.test(error.message) ? "ابتدا ایمیل خود را تأیید کنید" : generic };
    return { ok: true };
  }
  const store = await getDevStore();
  const user = await store.findUserByEmail(input.email);
  // Always run a hash comparison so response time doesn't reveal whether the email exists.
  const ok = await verifyPassword(input.password, user?.passwordHash ?? "scrypt$00$00");
  if (!user || !ok) return { ok: false, error: generic };
  await setDevCookie(user.profile.id);
  return { ok: true };
}

export async function signOut(): Promise<void> {
  if (dataMode() === "supabase") {
    const { createUserClient } = await import("../supabase/server");
    await (await createUserClient()).auth.signOut();
    return;
  }
  (await cookies()).delete(DEV_COOKIE);
}

export async function requestPasswordReset(email: string, redirectTo: string): Promise<AuthResult> {
  if (dataMode() !== "supabase") {
    return { ok: false, error: "بازیابی رمز عبور فقط با Supabase Auth فعال است (حالت توسعه از آن پشتیبانی نمی‌کند)" };
  }
  const { createUserClient } = await import("../supabase/server");
  await (await createUserClient()).auth.resetPasswordForEmail(email, { redirectTo });
  // Same answer whether or not the email exists.
  return { ok: true };
}

// ---------------- request context ----------------
export interface AppContext {
  user: SessionUser;
  profile: Profile;
  access: Access;
  store: Store;
}

const userContextCache = new Map<string, { profile: Profile; access: Access; expiresAt: number }>();

export function invalidateUserContextCache(userId?: string) {
  if (userId) userContextCache.delete(userId);
  else userContextCache.clear();
}

export const getContext = cache(async (): Promise<AppContext | null> => {
  const user = await getSessionUser();
  if (!user) return null;
  const store = await getUserStore();

  const now = Date.now();
  const cached = userContextCache.get(user.id);
  if (cached && cached.expiresAt > now) {
    return { user, profile: cached.profile, access: cached.access, store };
  }

  const profile = await store.getProfile(user.id);
  if (!profile) return null;
  const access = resolveAccess(await store.getSubscription(user.id));

  userContextCache.set(user.id, { profile, access, expiresAt: now + 15_000 });
  return { user, profile, access, store };
});

/** Page/action guard: signed in. Optionally requires an active trial/subscription or admin role. */
export async function requireContext(opts: { access?: boolean; admin?: boolean } = {}): Promise<AppContext> {
  const ctx = await getContext();
  if (!ctx) redirect("/login");
  if (opts.admin && ctx.profile.role !== "admin") redirect("/dashboard");
  if (opts.access && !ctx.access.hasAccess && ctx.profile.role !== "admin") redirect("/settings/billing?expired=1");
  return ctx;
}

/** Trusted store for admin pages (service role on Supabase). Call only after requireContext({admin:true}). */
export async function adminStore(): Promise<Store> {
  return getServiceStore();
}
