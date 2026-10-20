"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X, ArrowLeft, PhoneCall, User } from "lucide-react";

export function LandingHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur-md shadow-xs">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 h-18">
        {/* سمت راست: لوگو و نام برند */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5 group">
            <span className="grid size-10 place-items-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/25 transition-transform group-hover:scale-105" aria-hidden>
              <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <circle cx="12" cy="12" r="9" opacity=".4" />
                <circle cx="12" cy="12" r="4.5" />
                <path d="M12 12 19 6" />
              </svg>
            </span>
            <div className="text-right">
              <span className="block text-lg font-black text-slate-900 tracking-tight">رادار</span>
              <span className="block text-[11px] font-bold text-blue-600 -mt-0.5">شکار فرصت‌های خرید خودرو</span>
            </div>
          </Link>
        </div>

        {/* وسط: منوی ناوبری دسکتاپ */}
        <nav className="hidden md:flex items-center gap-6 lg:gap-8 text-sm font-semibold text-slate-600">
          <a href="#" className="text-blue-600 font-bold transition-colors hover:text-blue-700">صفحه اصلی</a>
          <a href="#features" className="transition-colors hover:text-blue-600">امکانات</a>
          <a href="#audiences" className="transition-colors hover:text-blue-600">مخاطبان</a>
          <a href="#pricing" className="transition-colors hover:text-blue-600">قیمت‌ها</a>
          <a href="#how-it-works" className="transition-colors hover:text-blue-600">راهنما</a>
          <a href="#faq" className="transition-colors hover:text-blue-600">سؤالات متداول</a>
          <a href="tel:09999212209" className="transition-colors hover:text-blue-600 flex items-center gap-1 text-slate-500">
            <PhoneCall className="size-3.5 text-blue-600" />
            <span>تماس با ما</span>
          </a>
        </nav>

        {/* سمت چپ: دکمه‌های ورود و شروع رایگان */}
        <div className="hidden sm:flex items-center gap-3">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors shadow-xs"
          >
            <User className="size-3.5" />
            <span>ورود</span>
          </Link>
          <Link
            href="/register"
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 transition-all shadow-md shadow-blue-500/20 active:scale-95"
          >
            <span>شروع رایگان</span>
            <ArrowLeft className="size-3.5" />
          </Link>
        </div>

        {/* دکمه منوی موبایل */}
        <div className="flex sm:hidden items-center gap-2">
          <Link
            href="/register"
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs"
          >
            شروع رایگان
          </Link>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="rounded-lg p-2 text-slate-700 hover:bg-slate-100"
            aria-label="منو"
          >
            {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {/* منوی بازشونده موبایل */}
      {mobileMenuOpen && (
        <div className="sm:hidden border-t border-slate-200 bg-white px-4 py-5 space-y-4 shadow-xl">
          <nav className="flex flex-col space-y-3 text-sm font-bold text-slate-700">
            <a onClick={() => setMobileMenuOpen(false)} href="#" className="py-1 text-blue-600">صفحه اصلی</a>
            <a onClick={() => setMobileMenuOpen(false)} href="#features" className="py-1 hover:text-blue-600">امکانات</a>
            <a onClick={() => setMobileMenuOpen(false)} href="#audiences" className="py-1 hover:text-blue-600">مخاطبان</a>
            <a onClick={() => setMobileMenuOpen(false)} href="#pricing" className="py-1 hover:text-blue-600">قیمت‌ها</a>
            <a onClick={() => setMobileMenuOpen(false)} href="#how-it-works" className="py-1 hover:text-blue-600">راهنمای شروع</a>
            <a onClick={() => setMobileMenuOpen(false)} href="#faq" className="py-1 hover:text-blue-600">سؤالات متداول</a>
            <a onClick={() => setMobileMenuOpen(false)} href="tel:09999212209" className="py-1 text-slate-500 flex items-center gap-1.5">
              <PhoneCall className="size-4 text-blue-600" />
              <span>پشتیبانی: ۰۹۹۹۹۲۱۲۲۰۹</span>
            </a>
          </nav>
          <div className="pt-2 flex flex-col gap-2">
            <Link
              href="/login"
              className="w-full text-center rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-slate-800"
            >
              ورود به حساب کاربری
            </Link>
            <Link
              href="/register"
              className="w-full text-center rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-500/20"
            >
              شروع تست رایگان ۱۴ روزه
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
