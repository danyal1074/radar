import { Bell, LogOut, Radio } from "lucide-react";
import Link from "next/link";
import { logoutAction } from "@/app/actions";
import type { AppContext } from "@/lib/auth";
import { dataMode } from "@/lib/db";
import { formatNumber } from "@/lib/money";
import { PLANS } from "@/lib/plans";
import { Alert } from "./ui";
import { NavLinks, type NavItem } from "./nav-links";
import { MobileNav } from "./mobile-nav";

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 font-bold text-brand-900">
      <span className="grid size-8 place-items-center rounded-lg bg-brand-600 text-white shadow-sm" aria-hidden>
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="9" opacity=".45" />
          <circle cx="12" cy="12" r="4.5" />
          <path d="M12 12 19 6" />
        </svg>
      </span>
      <span className="text-base sm:text-lg">رادار خرید خودرو</span>
    </Link>
  );
}

export async function Shell({ ctx, unread, locked, children }: { ctx: AppContext; unread: number; locked?: boolean; children: React.ReactNode }) {
  const items: NavItem[] = locked
    ? [{ href: "/settings/billing", label: "اشتراک و پرداخت", icon: "billing" }]
    : [
        { href: "/dashboard", label: "داشبورد", icon: "dashboard" },
        { href: "/listings", label: "رادار آگهی‌ها", icon: "listings" },
        { href: "/opportunities", label: "فرصت‌های خرید", icon: "opportunities" },
        { href: "/calculator", label: "ماشین‌حساب کارشناسی و سود", icon: "calculator" },
        { href: "/saved", label: "ذخیره‌شده‌ها", icon: "saved" },
        { href: "/notifications", label: "اعلان‌ها", icon: "notifications", badge: unread },
        { href: "/settings/alerts", label: "هشدارهای من", icon: "alerts" },
        { href: "/settings/billing", label: "اشتراک و پرداخت", icon: "billing" },
      ];
  if (ctx.profile.role === "admin") {
    items.push({ href: "/admin", label: "پنل مدیریت", icon: "admin" });
    items.push({ href: "/admin/prices", label: "قیمت روز خودروها", icon: "prices" });
  }

  const { access } = ctx;
  const plan = PLANS[access.plan];

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[15.5rem_1fr]">
      {/* ── هدر موبایل (فقط در گوشی نمایش داده می‌شود) ── */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-surface/95 px-4 backdrop-blur-md lg:hidden shadow-xs">
        <Logo />
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300/60 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            تربت‌حیدریه زنده
          </span>
          <Link
            href="/notifications"
            className="relative rounded-lg p-2 text-muted hover:bg-paper hover:text-ink"
            aria-label="اعلان‌ها"
          >
            <Bell className="size-5" />
            {unread > 0 && (
              <span className="absolute top-1 end-1 size-2 rounded-full bg-red-600 ring-2 ring-surface" />
            )}
          </Link>
        </div>
      </header>

      {/* ── سایدبار دسکتاپ (در گوشی مخفی است و به جای آن Bottom Nav نمایش داده می‌شود) ── */}
      <aside className="hidden border-b border-line bg-surface lg:sticky lg:top-0 lg:block lg:h-dvh lg:border-b-0 lg:border-s">
        <div className="flex flex-col h-full p-5">
          <Logo />
          <div className="mt-6 flex-1">
            <NavLinks items={items} />
          </div>
          <div className="mt-auto border-t border-line/60 pt-4">
            <div className="rounded-lg bg-paper p-3 text-xs">
              <p className="truncate font-semibold">{ctx.profile.business_name}</p>
              <p className="mt-0.5 text-muted">
                پلن {plan.name}
                {access.hasAccess && access.daysLeft !== null ? `، ${formatNumber(access.daysLeft)} روز باقی‌مانده` : "، پایان‌یافته"}
              </p>
            </div>
            <form action={logoutAction} className="mt-2">
              <button type="submit" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted hover:bg-paper hover:text-ink">
                <LogOut className="size-4" aria-hidden /> خروج
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* ── محتوای اصلی با پدینگ تطبیق‌پذیر موبایل ── */}
      <main className="min-w-0 px-3.5 py-4 pb-24 sm:px-8 sm:py-8 lg:pb-8">
        <div className="mx-auto max-w-5xl space-y-4">
          {dataMode() === "dev" && (
            <Alert tone="warn">
              حالت توسعه: داده‌ها در یک فایل محلی ذخیره می‌شوند و آگهی‌ها و قیمت‌های تخمینی نمونه‌اند (برچسب «داده نمونه» / «قیمت نمونه»). این حالت برای فروش به مشتری مناسب نیست.
            </Alert>
          )}
          {access.status === "trialing" && access.hasAccess && (
            <Alert tone="brand">
              دوره آزمایشی شما {formatNumber(access.daysLeft ?? 0)} روز دیگر تمام می‌شود.{" "}
              <Link href="/settings/billing" className="font-semibold underline">
                انتخاب پلن
              </Link>
            </Alert>
          )}
          {children}
        </div>
      </main>

      {/* ── نوار ناوبری پایین صفحه موبایل ── */}
      <MobileNav
        unread={unread}
        businessName={ctx.profile.business_name}
        planName={plan.name}
        daysLeft={access.daysLeft}
        isAdmin={ctx.profile.role === "admin"}
        locked={locked}
      />
    </div>
  );
}
