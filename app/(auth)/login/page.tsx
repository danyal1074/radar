import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/auth-forms";

export const metadata: Metadata = { title: "ورود" };

export default function LoginPage() {
  return (
    <>
      <h1 className="mb-1 text-xl font-bold">ورود به حساب</h1>
      <p className="mb-6 text-sm text-muted">برای دیدن فرصت‌های خرید وارد شوید.</p>
      <LoginForm />
      <p className="mt-6 text-center text-sm text-muted">
        حساب ندارید؟{" "}
        <Link href="/register" className="font-medium text-brand-700 hover:underline">
          ثبت‌نام رایگان
        </Link>
      </p>
    </>
  );
}
