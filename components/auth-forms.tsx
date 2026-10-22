"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { ActionState } from "@/app/actions";
import { loginAction, registerAction, resetPasswordAction } from "@/app/(auth)/actions";
import { Alert, Button, Field, Input } from "./ui";

function Feedback({ state }: { state: ActionState }) {
  if (!state?.message) return null;
  return <Alert tone={state.ok ? "good" : "bad"}>{state.message}</Alert>;
}

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, null);
  return (
    <form action={action} className="space-y-4" noValidate>
      <Feedback state={state} />
      <Field label="شماره موبایل یا ایمیل" error={state?.errors?.identifier ?? state?.errors?.email}>
        <Input name="identifier" type="text" placeholder="۰۹... یا admin" autoComplete="username" dir="ltr" required />
      </Field>
      <Field label="رمز عبور" error={state?.errors?.password}>
        <Input name="password" type="password" autoComplete="current-password" dir="ltr" required />
      </Field>
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "در حال ورود…" : "ورود"}
      </Button>
      <p className="text-center text-sm text-muted">
        <Link href="/forgot-password" className="text-brand-700 hover:underline">
          رمز عبور را فراموش کرده‌ام
        </Link>
      </p>
    </form>
  );
}

export function RegisterForm() {
  const [state, action, pending] = useActionState(registerAction, null);
  const e = state?.errors ?? {};
  return (
    <form action={action} className="space-y-4" noValidate>
      <Feedback state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="نام و نام خانوادگی" error={e.full_name}>
          <Input name="full_name" placeholder="مثال: علی رضایی" autoComplete="name" required />
        </Field>
        <Field label="نام نمایشگاه" error={e.business_name}>
          <Input name="business_name" placeholder="مثال: نمایشگاه اتومبیل رضایی" autoComplete="organization" required />
        </Field>
      </div>
      <Field
        label="انتخاب شهر تحت پایش (الزامی)"
        error={e.city}
        hint="در دوره آزمایشی رایگان، حساب شما روی شهر انتخابی قفل می‌شود. (امکان رصد همزمان هر دو شهر مشهد و تربت در پلن Pro فعال است)"
      >
        <select
          name="city"
          defaultValue="تربت‌حیدریه"
          className="w-full rounded-xl border border-line bg-card px-3 py-2.5 text-sm font-medium text-foreground shadow-sm transition focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          required
        >
          <option value="تربت‌حیدریه">🏙️ تربت‌حیدریه (رصد دیوار و شیپور تربت‌حیدریه)</option>
          <option value="مشهد">🏙️ مشهد (رصد دیوار و شیپور مشهد)</option>
        </select>
      </Field>
      <Field label="شماره موبایل" error={e.phone} hint="جهت ورود به سامانه و دریافت هشدارهای شکار">
        <Input name="phone" type="tel" placeholder="۰۹۱۲۳۴۵۶۷۸۹" autoComplete="tel" dir="ltr" required />
      </Field>
      <Field label="ایمیل (اختیاری)" error={e.email}>
        <Input name="email" type="email" placeholder="دلخواه..." autoComplete="email" dir="ltr" />
      </Field>
      <Field label="رمز عبور" error={e.password} hint="حداقل ۶ کاراکتر">
        <Input name="password" type="password" autoComplete="new-password" dir="ltr" required />
      </Field>
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "در حال ساخت حساب…" : "شروع دوره آزمایشی رایگان"}
      </Button>
    </form>
  );
}

export function ForgotForm() {
  const [state, action, pending] = useActionState(resetPasswordAction, null);
  return (
    <form action={action} className="space-y-4" noValidate>
      <Feedback state={state} />
      <Field label="ایمیل" error={state?.errors?.email}>
        <Input name="email" type="email" dir="ltr" required />
      </Field>
      <Button type="submit" disabled={pending} className="w-full">
        ارسال پیوند بازیابی
      </Button>
    </form>
  );
}
