import type { Metadata, Viewport } from "next";
import "@fontsource-variable/vazirmatn";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "رادار خرید خودرو", template: "%s | رادار خرید خودرو" },
  description: "فرصت‌های خرید خودرو را قبل از بقیه ببینید: مقایسه قیمت آگهی با قیمت تخمینی و هشدار برای نمایشگاه‌داران.",
};

export const viewport: Viewport = { themeColor: "#1d4ed8", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fa" dir="rtl">
      <body className="min-h-dvh bg-paper text-ink antialiased">{children}</body>
    </html>
  );
}
