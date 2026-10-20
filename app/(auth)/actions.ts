"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { requestPasswordReset, signIn, signUp } from "@/lib/auth";
import { loginSchema, registerSchema } from "@/lib/validation";
import type { ActionState } from "../actions";

function fieldErrors(issues: { path: PropertyKey[]; message: string }[]) {
  const out: Record<string, string> = {};
  for (const i of issues) {
    const k = String(i.path[0] ?? "form");
    if (!out[k]) out[k] = i.message;
  }
  return out;
}

export async function loginAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const identifier = String(fd.get("identifier") ?? fd.get("email") ?? "").trim();
  const parsed = loginSchema.safeParse({ identifier, password: fd.get("password") });
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error.issues) };
  const res = await signIn(parsed.data);
  if (!res.ok) return { ok: false, message: res.error };
  redirect("/dashboard");
}

export async function registerAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error.issues) };
  const res = await signUp(parsed.data);
  if (!res.ok) return { ok: false, message: res.error };
  if (res.needsEmailConfirmation) {
    return { ok: true, message: "ثبت‌نام انجام شد. برای فعال‌سازی حساب، پیوند ارسال‌شده به ایمیل خود را باز کنید." };
  }
  redirect("/dashboard");
}

export async function resetPasswordAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) return { ok: false, errors: { email: "ایمیل معتبر نیست" } };
  const h = await headers();
  const origin = h.get("origin") ?? `https://${h.get("host")}`;
  const res = await requestPasswordReset(email, `${origin}/login`);
  if (!res.ok) return { ok: false, message: res.error };
  return { ok: true, message: "اگر این ایمیل ثبت شده باشد، پیوند بازیابی برای آن ارسال می‌شود." };
}
