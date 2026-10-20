import type { Metadata } from "next";
import Link from "next/link";
import { ForgotForm } from "@/components/auth-forms";
import { dataMode } from "@/lib/db";
import { Alert } from "@/components/ui";

export const metadata: Metadata = { title: "بازیابی رمز عبور" };

export default function ForgotPage() {
  return (
    <>
      <h1 className="mb-1 text-xl font-bold">بازیابی رمز عبور</h1>
      <p className="mb-6 text-sm text-muted">ایمیل حساب خود را وارد کنید.</p>
      {dataMode() === "dev" && (
        <div className="mb-4">
          <Alert tone="warn">در حالت توسعه بازیابی رمز عبور کار نمی‌کند؛ این قابلیت با Supabase Auth فعال می‌شود.</Alert>
        </div>
      )}
      <ForgotForm />
      <p className="mt-6 text-center text-sm">
        <Link href="/login" className="text-brand-700 hover:underline">
          بازگشت به ورود
        </Link>
      </p>
    </>
  );
}
