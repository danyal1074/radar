"use client";

import { useState } from "react";
import clsx from "clsx";
import {
  Bell,
  Bookmark,
  Calculator,
  Coins,
  CreditCard,
  Flame,
  LayoutDashboard,
  LogOut,
  Menu,
  Radar,
  Settings2,
  ShieldCheck,
  Target,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/app/actions";
import { formatNumber } from "@/lib/money";

interface MobileNavProps {
  unread: number;
  businessName: string;
  planName: string;
  daysLeft: number | null;
  isAdmin: boolean;
  locked?: boolean;
}

export function MobileNav({ unread, businessName, planName, daysLeft, isAdmin, locked }: MobileNavProps) {
  const path = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  if (locked) {
    return null;
  }

  const primaryTabs = [
    { href: "/listings", label: "رادار آگهی‌ها", icon: Radar },
    { href: "/opportunities", label: "فرصت‌های خرید", icon: Flame },
    { href: "/calculator", label: "ماشین‌حساب", icon: Calculator },
    { href: "/notifications", label: "اعلان‌ها", icon: Bell, badge: unread },
  ];

  return (
    <>
      {/* ── نوار ناوبری ثابت پایین صفحه (Bottom Navigation Bar) ── */}
      <nav
        aria-label="منوی موبایل"
        className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-center justify-around border-t border-line/80 bg-surface/95 px-2 pb-safe backdrop-blur-lg lg:hidden shadow-[0_-4px_20px_rgba(0,0,0,0.06)]"
      >
        {primaryTabs.map((tab) => {
          const Icon = tab.icon;
          const active = path === tab.href || path.startsWith(tab.href + "/");
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={clsx(
                "relative flex flex-1 flex-col items-center justify-center py-1 transition-all",
                active ? "text-brand-600 font-bold scale-105" : "text-muted hover:text-ink font-medium",
              )}
            >
              <div className="relative">
                <Icon className={clsx("size-5 transition-transform", active ? "stroke-[2.5]" : "stroke-[1.8]")} />
                {!!tab.badge && tab.badge > 0 && (
                  <span className="absolute -top-1 -end-2.5 flex size-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white shadow-sm ring-2 ring-surface">
                    {tab.badge > 9 ? "+۹" : formatNumber(tab.badge)}
                  </span>
                )}
              </div>
              <span className="mt-1 text-[11px] leading-tight">{tab.label}</span>
              {active && <span className="absolute -bottom-1 size-1 rounded-full bg-brand-600" />}
            </Link>
          );
        })}

        {/* دکمه منوی بیشتر */}
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className={clsx(
            "relative flex flex-1 flex-col items-center justify-center py-1 transition-all",
            drawerOpen ? "text-brand-600 font-bold scale-105" : "text-muted hover:text-ink font-medium",
          )}
          aria-label="منوی بیشتر"
        >
          <Menu className="size-5 stroke-[1.8]" />
          <span className="mt-1 text-[11px] leading-tight">بیشتر</span>
        </button>
      </nav>

      {/* ── کشوی منوی بیشتر (Mobile Bottom Drawer) ── */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-ink/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={() => setDrawerOpen(false)}
          />

          {/* Drawer content */}
          <div className="fixed inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-2xl border-t border-line bg-surface p-5 shadow-2xl animate-in slide-in-from-bottom duration-250">
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-line" />

            <div className="mb-4 flex items-center justify-between border-b border-line pb-3">
              <div>
                <p className="font-bold text-base text-ink">{businessName}</p>
                <p className="text-xs text-muted">
                  پلن {planName} {daysLeft !== null ? `(${formatNumber(daysLeft)} روز باقی‌مانده)` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="rounded-full p-2 text-muted hover:bg-paper hover:text-ink"
                aria-label="بستن منو"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <Link
                href="/dashboard"
                onClick={() => setDrawerOpen(false)}
                className="flex items-center gap-2.5 rounded-xl border border-line bg-paper/60 p-3 font-medium text-ink hover:bg-brand-50 hover:text-brand-700"
              >
                <LayoutDashboard className="size-5 text-brand-600" />
                داشبورد
              </Link>
              <Link
                href="/saved"
                onClick={() => setDrawerOpen(false)}
                className="flex items-center gap-2.5 rounded-xl border border-line bg-paper/60 p-3 font-medium text-ink hover:bg-brand-50 hover:text-brand-700"
              >
                <Bookmark className="size-5 text-amber-600" />
                آگهی‌های ذخیره‌شده
              </Link>
              <Link
                href="/settings/alerts"
                onClick={() => setDrawerOpen(false)}
                className="flex items-center gap-2.5 rounded-xl border border-line bg-paper/60 p-3 font-medium text-ink hover:bg-brand-50 hover:text-brand-700"
              >
                <Settings2 className="size-5 text-purple-600" />
                هشدارهای من
              </Link>
              <Link
                href="/settings/billing"
                onClick={() => setDrawerOpen(false)}
                className="flex items-center gap-2.5 rounded-xl border border-line bg-paper/60 p-3 font-medium text-ink hover:bg-brand-50 hover:text-brand-700"
              >
                <CreditCard className="size-5 text-emerald-600" />
                اشتراک و تمدید
              </Link>
              {isAdmin && (
                <>
                  <Link
                    href="/admin"
                    onClick={() => setDrawerOpen(false)}
                    className="flex items-center gap-2.5 rounded-xl border border-line bg-paper/60 p-3 font-medium text-ink hover:bg-brand-50 hover:text-brand-700"
                  >
                    <ShieldCheck className="size-5 text-indigo-600" />
                    پنل مدیریت
                  </Link>
                  <Link
                    href="/admin/prices"
                    onClick={() => setDrawerOpen(false)}
                    className="flex items-center gap-2.5 rounded-xl border border-line bg-paper/60 p-3 font-medium text-ink hover:bg-brand-50 hover:text-brand-700"
                  >
                    <Coins className="size-5 text-amber-500" />
                    قیمت روز خودروها
                  </Link>
                </>
              )}
            </div>

            <form action={logoutAction} className="mt-4 border-t border-line pt-3">
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50/70 py-3 text-sm font-semibold text-red-600 hover:bg-red-100"
              >
                <LogOut className="size-4" /> خروج از حساب کاربری
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
