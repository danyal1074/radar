"use client";

import { Button } from "@/components/ui";

export default function ErrorState({ reset }: { error: Error; reset: () => void }) {
  return (
    <div role="alert" className="rounded-xl border border-bad-50 bg-bad-50 p-6 text-center">
      <h2 className="font-semibold text-bad-600">بارگذاری آگهی‌ها انجام نشد</h2>
      <p className="mt-1 text-sm text-muted">لحظه‌ای بعد دوباره تلاش کنید. اگر مشکل ادامه داشت، با پشتیبانی تماس بگیرید.</p>
      <Button onClick={reset} variant="secondary" className="mt-4">
        تلاش دوباره
      </Button>
    </div>
  );
}
