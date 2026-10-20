import { redirect } from "next/navigation";
import { Logo } from "@/components/shell";
import { getSessionUser } from "@/lib/auth";
import { dataMode } from "@/lib/db";
import { Alert } from "@/components/ui";

export default async function AuthLayout({ children }: LayoutProps<"/">) {
  if (await getSessionUser()) redirect("/dashboard");
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-10">
      <div className="mb-8 flex justify-center">
        <Logo />
      </div>
      <div className="rounded-xl border border-line bg-surface p-6 sm:p-8">{children}</div>
      {dataMode() === "dev" && (
        <div className="mt-4">
          <Alert tone="warn">حالت توسعه: Supabase تنظیم نشده و حساب‌ها فقط روی همین سرور و در یک فایل محلی ذخیره می‌شوند.</Alert>
        </div>
      )}
    </div>
  );
}
