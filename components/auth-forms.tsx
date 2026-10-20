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
      <Field label="نام کاربری یا ایمیل" error={state?.errors?.email}>
        <Input name="email" type="text" placeholder="admin یا email@..." autoComplete="username" dir="ltr" required />
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
          <Input name="full_name" autoComplete="name" required />
        </Field>
        <Field label="نام نمایشگاه" error={e.business_name}>
          <Input name="business_name" autoComplete="organization" required />
        </Field>
      </div>
      <Field label="شهر" error={e.city}>
        <Input name="city" defaultValue="تربت حیدریه" required />
      </Field>
      <Field label="ایمیل" error={e.email}>
        <Input name="email" type="email" autoComplete="email" dir="ltr" required />
      </Field>
      <Field label="رمز عبور" error={e.password} hint="حداقل ۸ کاراکتر، شامل حرف و عدد">
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
