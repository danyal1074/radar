import type { Metadata } from "next";
import Link from "next/link";
import { RegisterForm } from "@/components/auth-forms";
import { TRIAL_DAYS } from "@/lib/plans";
import { formatNumber } from "@/lib/money";

export const metadata: Metadata = { title: "ثبت‌نام" };

export default function RegisterPage() {
  return (
    <>
      <h1 className="mb-1 text-xl font-bold">ساخت حساب نمایشگاه</h1>
      <p className="mb-6 text-sm text-muted">{formatNumber(TRIAL_DAYS)} روز رایگان، بدون نیاز به کارت.</p>
      <RegisterForm />
      <p className="mt-6 text-center text-sm text-muted">
        قبلاً ثبت‌نام کرده‌اید؟{" "}
        <Link href="/login" className="font-medium text-brand-700 hover:underline">
          ورود
        </Link>
      </p>
    </>
  );
}
